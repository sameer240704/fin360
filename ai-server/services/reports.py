import os, uuid, json, re, base64, sqlite3, tempfile
from fastapi import HTTPException
from pydantic import BaseModel
from typing import List
import requests
import pdfkit
import markdown
from google.generativeai import GenerativeModel, configure
import faiss
from sentence_transformers import SentenceTransformer
from dotenv import load_dotenv

load_dotenv()

MISTRAL_API_KEY = os.getenv("MISTRAL_API_KEY")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
DB_NAME = os.getenv("DB_NAME")
DATABASE_DIR = os.getenv("DATABASE_DIR")

configure(api_key=GEMINI_API_KEY)

if not os.path.exists(DATABASE_DIR):
    os.makedirs(DATABASE_DIR)

# Initialize SentenceTransformer for embeddings
embedder = SentenceTransformer('all-MiniLM-L6-v2')

# Models
class DocumentAnalysisRequest(BaseModel):
    pages_to_process: List[int] = []
    citation_level: str = "Detailed"

class ChatRequest(BaseModel):
    query: str
    chat_mode: str = "Simple (Full Context)"
    context_source: str = "Analysis Result"

# Initialize database
def init_db():
    """Initialize the SQLite database and create the table if it doesn't exist."""
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    c.execute('''
        CREATE TABLE IF NOT EXISTS financial_data (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            file_hash TEXT UNIQUE,
            file_name TEXT,
            extracted_text TEXT,
            analysis_result TEXT,
            extracted_tables TEXT,
            faiss_index_path TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    conn.commit()
    conn.close()

init_db()

def save_to_db(file_hash, file_name, extracted_text, analysis_result, extracted_tables, faiss_index_path):
    """Save extracted text, tables, analysis result, and FAISS index path to the database."""
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    c.execute('''
        INSERT OR REPLACE INTO financial_data 
        (file_hash, file_name, extracted_text, analysis_result, extracted_tables, faiss_index_path)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (file_hash, file_name, extracted_text, analysis_result, extracted_tables, faiss_index_path))
    conn.commit()
    conn.close()

def get_existing_data(file_hash):
    """Retrieve existing data from the database based on file hash."""
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    c.execute('SELECT file_name, extracted_text, analysis_result, extracted_tables, faiss_index_path FROM financial_data WHERE file_hash = ?', (file_hash,))
    result = c.fetchone()
    conn.close()
    return result

def get_all_faiss_indexes():
    """Retrieve all FAISS index paths and file names from the database."""
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    c.execute('SELECT file_name, faiss_index_path FROM financial_data')
    results = c.fetchall()
    conn.close()
    return results

def build_faiss_index(text_chunks, file_hash):
    """Build and save a FAISS index from text chunks with a dynamic name."""
    if not text_chunks:
        return None, None, None
    embeddings = embedder.encode(text_chunks, convert_to_numpy=True)
    dimension = embeddings.shape[1]
    index = faiss.IndexFlatL2(dimension)  # L2 distance index
    index.add(embeddings)
    faiss_index_path = os.path.join(DATABASE_DIR, f"faiss_{file_hash}.index")
    faiss.write_index(index, faiss_index_path)
    return index, embeddings, faiss_index_path

def load_faiss_index(faiss_index_path):
    """Load the FAISS index from file if it exists."""
    if os.path.exists(faiss_index_path):
        return faiss.read_index(faiss_index_path)
    return None

def extract_text_with_mistral(file_obj, pages_to_process):
    """Extract text from PDF file object using Mistral AI OCR API"""
    try:
        file_obj.seek(0)
        pdf_content = file_obj.read()
        pdf_base64 = base64.b64encode(pdf_content).decode('utf-8')
        
        api_url = "https://api.mistral.ai/v1/ocr"
        headers = {
            "Authorization": f"Bearer {MISTRAL_API_KEY}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": "mistral-ocr-latest",
            "id": str(uuid.uuid4()),
            "document": {
                "document_url": f"data:application/pdf;base64,{pdf_base64}",
                "document_name": "uploaded_file.pdf",
                "type": "document_url"
            },
            "pages": pages_to_process,
            "include_image_base64": True,
            "image_limit": 0,
            "image_min_size": 0
        }
        
        response = requests.post(api_url, headers=headers, json=payload)
        response.raise_for_status()
        
        result = response.json()
        if not isinstance(result, dict) or "pages" not in result:
            raise ValueError("Invalid response format from Mistral API")
            
        return result
        
    except requests.exceptions.RequestException as e:
        raise HTTPException(
            status_code=502,
            detail=f"Mistral API request failed: {str(e)}"
        )
    except ValueError as e:
        raise HTTPException(
            status_code=502,
            detail=f"Invalid response from Mistral API: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error processing with Mistral: {str(e)}"
        )

def extract_tables_from_text(text_content):
    """Extract tables from the markdown text content"""
    table_pattern = r'(\|[^\n]+\|\n\|[-:| ]+\|\n(?:\|[^\n]+\|\n)+)'
    tables = re.findall(table_pattern, text_content)
    return tables

def create_summary_tables(analysis_text):
    """Ask Gemini to create summary tables based on the analysis"""
    try:
        model = GenerativeModel('gemini-2.0-flash')
        prompt = f"""
        Based on the following financial analysis, create 3-5 summary tables in Markdown format. 
        These tables should highlight key financial metrics, trends, and insights from the analysis.
        
        For example, you might create tables for:
        1. Key Financial Metrics Summary
        2. Income Statement Highlights
        3. Balance Sheet Overview
        4. EBITDA Adjustments
        5. Working Capital Summary
        
        Each table should have a clear title and organized columns with meaningful data.
        IMPORTANT: Format all tables in proper Markdown format using pipe (|) syntax.
        
        For each table created, provide specific citations that justify the data, including:
        1. Exact information source from the analysis (quote the specific text)
        2. Page numbers where this information appears in the original document
        3. A brief explanation of how you interpreted this data for the table
        
        After each table, include a "**Table Justification:**" section that explains where each 
        data point came from and how it relates to the original document.
        
        Analysis:
        {analysis_text}
        """
        response = model.generate_content(prompt)
        return response.text
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating summary tables with Gemini: {str(e)}")

def analyze_with_gemini(text_content, pages_to_process):
    """Analyze the extracted text with Google's Gemini API and include detailed citations."""
    try:
        # First, let's create page-specific segments to be able to track data sources
        page_text_dict = {}
        current_text = ""
        page_markers = re.findall(r'\n\*\*Page (\d+)\*\*\n', text_content)
        if page_markers:
            # If we have explicit page markers
            segments = re.split(r'\n\*\*Page \d+\*\*\n', text_content)
            for i, page_num in enumerate(page_markers):
                if i + 1 < len(segments):
                    page_text_dict[page_num] = segments[i + 1]
        else:
            # If no explicit markers, divide text by estimated page size
            words = text_content.split()
            words_per_page = 500  # Estimated words per page
            for i, page in enumerate(pages_to_process):
                start_idx = i * words_per_page
                end_idx = (i + 1) * words_per_page
                if start_idx < len(words):
                    page_text = " ".join(words[start_idx:min(end_idx, len(words))])
                    page_text_dict[str(page)] = page_text
        
        model = GenerativeModel('gemini-2.0-flash')
        prompt = f"""
        Analyze the following financial document and provide a detailed analysis with these sections:
        1. BUSINESS OVERVIEW
        2. KEY FINDINGS, FINANCIAL DUE DILIGENCE
        3. INCOME STATEMENT OVERVIEW
        4. BALANCE SHEET OVERVIEW
        5. ADJ EBITDA (IF DETAILED INFORMATION IS PROVIDED)
        6. ADJ WORKING CAPITAL (IF DETAILED INFORMATION IS PROVIDED)
        
        IMPORTANT REQUIREMENTS FOR CITATIONS AND JUSTIFICATIONS:
        
        For each section:
        1. After every paragraph, provide a detailed citation in this format:
           [**Source: Page X, Paragraph Y**] where X is the page number and Y is an approximate paragraph number.
        
        2. After each section, include a detailed "**Justification:**" subsection that:
           - Quotes specific text from the original document that supports your analysis (use direct quotes in "quotation marks")
           - Explains how you interpreted this information
           - Lists ALL pages where supporting evidence was found
           - Explains any assumptions or inferences made when information was implicit
        
        3. For any tables or financial data, provide the exact source, including:
           - The exact numbers as they appear in the original document
           - The page numbers where each data point was found
           - Any calculations or transformations you performed
        
        4. If information seems inconsistent or contradictory, note this explicitly with a "**Data Inconsistency Note:**" 
           explaining the discrepancy and which source you relied on more heavily.
        
        5. If certain information was inferred rather than explicitly stated, mark it clearly with 
           "**Inference:**" and explain your reasoning.
        
        IMPORTANT: Include relevant data in table format where appropriate. Use proper Markdown format
        for all tables using | syntax. For each key financial metric or comparison, present the data
        in a clear, structured table.
        
        Document content:
        {text_content}
        
        Page-specific content:
        {json.dumps(page_text_dict)}
        """
        response = model.generate_content(prompt)
        
        # Post-process to ensure citations are properly formatted
        analysis_text = response.text
        
        # Add an overview of pages processed at the beginning
        page_overview = f"""
## DOCUMENT INFORMATION
- **Pages Analyzed:** {', '.join(map(str, pages_to_process))}
- **Total Pages Processed:** {len(pages_to_process)}

"""
        analysis_text = page_overview + analysis_text
        
        return analysis_text
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error analyzing with Gemini: {str(e)}")

def chat_with_gemini_simple(context, user_query):
    """Simple chat with Gemini without FAISS."""
    try:
        model = GenerativeModel('gemini-2.0-flash')
        prompt = f"""
        Based on the following context, answer the user's query:
        
        Context:
        {context}
        
        User Query:
        {user_query}
        
        IMPORTANT FOR CITATIONS:
        1. Cite specific parts of the document that support your answer using [Page X] format
        2. If you make any inference not directly stated in the document, mark it as [Inference]
        3. When providing facts or figures, always include where they came from in the document
        4. If the document contains contradictory information, acknowledge this and explain which source you relied on
        
        If your response should include data, present it in a well-formatted table using Markdown syntax.
        """
        response = model.generate_content(prompt)
        return response.text
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error chatting with Gemini: {str(e)}")

def chat_with_gemini_faiss(context_chunks, index, full_context, user_query, k=3):
    """Chat with Gemini using FAISS to retrieve relevant context, combined with full context from DB."""
    if not full_context or not full_context.strip():
        return "No full context available to process the query."

    if not context_chunks:
        # Fallback to full context if no chunks are available
        return chat_with_gemini_simple(full_context, user_query)
    
    # Adjust k to be at most the number of chunks
    k = min(k, len(context_chunks))
    if k == 0:
        # Fallback to full context if k becomes 0
        return chat_with_gemini_simple(full_context, user_query)
    
    query_embedding = embedder.encode([user_query], convert_to_numpy=True)
    distances, indices = index.search(query_embedding, k)  # Retrieve top-k similar chunks
    
    # Filter valid indices
    valid_indices = [i for i in indices[0] if i >= 0 and i < len(context_chunks)]
    if not valid_indices:
        # Fallback to full context if no relevant chunks are found
        return chat_with_gemini_simple(full_context, user_query)
    
    relevant_chunks = [context_chunks[i] for i in valid_indices]
    relevant_context = "\n\n".join(relevant_chunks)
    
    try:
        model = GenerativeModel('gemini-2.0-flash')
        prompt = f"""
        Based on the following full context and the most relevant sections, answer the user's query:
        
        Full Context:
        {full_context}
        
        Most Relevant Sections:
        {relevant_context}
        
        User Query:
        {user_query}
        
        IMPORTANT FOR CITATIONS:
        1. Always support your answer with specific citations from the document in [Page X] format
        2. Quote relevant text that supports your answer
        3. List the evidence that led to your conclusion for each major point
        4. If you make any inference not directly stated in the document, mark it as [Inference]
        5. If the information seems incomplete or uncertain, acknowledge this and explain what additional information would help
        
        If your response should include data, present it in a well-formatted table using Markdown syntax.
        """
        response = model.generate_content(prompt)
        return response.text
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error chatting with Gemini: {str(e)}")

def extract_page_numbers(text_content):
    """Extract page numbers from text content to improve citation accuracy."""
    page_numbers = {}
    lines = text_content.split('\n')
    current_page = 1
    
    for i, line in enumerate(lines):
        # Look for page markers like "Page X" or "Page X of Y"
        page_match = re.search(r'(?i)page\s+(\d+)(?:\s+of\s+\d+)?', line)
        if page_match:
            current_page = int(page_match.group(1))
            start_line = i
            page_numbers[current_page] = {
                'start_line': start_line,
                'content': line
            }
    
    # Add end lines for each page
    sorted_pages = sorted(page_numbers.keys())
    for i, page in enumerate(sorted_pages):
        if i < len(sorted_pages) - 1:
            page_numbers[page]['end_line'] = page_numbers[sorted_pages[i+1]]['start_line'] - 1
        else:
            page_numbers[page]['end_line'] = len(lines) - 1
    
    return page_numbers

def split_into_chunks(text, chunk_size=200):
    """Split text into smaller chunks for FAISS indexing."""
    if not text or not text.strip():
        return []
    words = text.split()
    
    # Add page number information to chunks when possible
    chunks = []
    page_info = extract_page_numbers(text)
    
    for i in range(0, len(words), chunk_size):
        chunk = ' '.join(words[i:i + chunk_size])
        # Try to find page number for this chunk
        for page_num, page_data in page_info.items():
            chunk_position = text.find(chunk)
            if chunk_position >= 0:
                chunk_line = text[:chunk_position].count('\n')
                if page_data['start_line'] <= chunk_line <= page_data['end_line']:
                    chunk = f"[Page {page_num}] {chunk}"
                    break
        chunks.append(chunk)
    
    return chunks

def convert_markdown_to_pdf(markdown_content, output_path):
    """Convert markdown content to PDF using alternative methods with fallbacks."""
    try:
        # Convert markdown to HTML
        html_content = markdown.markdown(markdown_content, extensions=['tables', 'fenced_code'])
        
        # Add basic styling for better appearance
        styled_html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body {{ font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }}
                h1, h2, h3 {{ color: #333366; }}
                table {{ border-collapse: collapse; width: 100%; margin: 20px 0; }}
                th, td {{ border: 1px solid #ddd; padding: 8px; text-align: left; }}
                th {{ background-color: #f2f2f2; }}
                tr:nth-child(even) {{ background-color: #f9f9f9; }}
                pre {{ background-color: #f5f5f5; padding: 10px; border-radius: 5px; overflow-x: auto; }}
                code {{ font-family: Consolas, monospace; }}
                .citation {{ background-color: #f0f7ff; padding: 5px; border-left: 3px solid #3498db; margin: 10px 0; }}
                .justification {{ background-color: #f0fff0; padding: 10px; border-left: 3px solid #2ecc71; margin: 15px 0; }}
                .inference {{ background-color: #fff9e6; padding: 5px; border-left: 3px solid #f39c12; margin: 10px 0; }}
            </style>
        </head>
        <body>
            {html_content}
        </body>
        </html>
        """
        
        # Create temporary HTML file
        with tempfile.NamedTemporaryFile(suffix='.html', delete=False, mode='w', encoding='utf-8') as temp_html:
            temp_html_path = temp_html.name
            temp_html.write(styled_html)
        
        try:
            print(f"Attempting PDF conversion with pdfkit for file: {output_path}")
            
            wkhtmltopdf_paths = [
                '/usr/local/bin/wkhtmltopdf',
                '/usr/bin/wkhtmltopdf',
                'C:\\Program Files\\wkhtmltopdf\\bin\\wkhtmltopdf.exe',
                'C:\\Program Files (x86)\\wkhtmltopdf\\bin\\wkhtmltopdf.exe',
            ]
            
            config = None
            for path in wkhtmltopdf_paths:
                if os.path.exists(path):
                    print(f"Found wkhtmltopdf at: {path}")
                    config = pdfkit.configuration(wkhtmltopdf=path)
                    break
            
            # Use the config if found
            pdf_options = {
                'quiet': '',
                'enable-local-file-access': '',
                'encoding': 'UTF-8'
            }
            
            if config:
                pdfkit.from_file(temp_html_path, output_path, configuration=config, options=pdf_options)
            else:
                # Try with default installation
                pdfkit.from_file(temp_html_path, output_path, options=pdf_options)
            
            # If we reach here, PDF was created successfully
            os.remove(temp_html_path)  # Clean up temp file
            return True, None
            
        except Exception as e:
            error_msg = f"pdfkit/wkhtmltopdf error: {str(e)}"
            print(error_msg)
            
            # Method 2: Alternative - Try using weasyprint if installed
            try:
                import weasyprint
                print("Attempting PDF generation with WeasyPrint")
                weasyprint.HTML(string=styled_html).write_pdf(output_path)
                os.remove(temp_html_path)  # Clean up temp file
                return True, None
            except ImportError:
                pass
            except Exception as e2:
                error_msg += f" | WeasyPrint error: {str(e2)}"
            
            # Method 3: Save HTML as fallback
            html_output_path = output_path.replace('.pdf', '.html')
            print(f"Saving HTML as fallback to: {html_output_path}")
            try:
                import shutil
                shutil.copy(temp_html_path, html_output_path)
                os.remove(temp_html_path)  # Clean up temp file
                return False, f"PDF generation failed. Saved HTML version instead: {html_output_path}. Original errors: {error_msg}"
            except Exception as e3:
                os.remove(temp_html_path)  # Clean up temp file
                return False, f"All PDF conversion methods failed: {error_msg} | HTML fallback error: {str(e3)}"
                
    except Exception as e:
        return False, f"Initial markdown conversion failed: {str(e)}"