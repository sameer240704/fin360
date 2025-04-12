import os, uuid, json, re, base64, sqlite3, tempfile, requests, pdfkit, markdown
from fastapi import HTTPException
from pydantic import BaseModel
from typing import List, Optional
from google.generativeai import GenerativeModel, configure
from dotenv import load_dotenv

load_dotenv()

# Validate environment variables
MISTRAL_API_KEY = os.getenv("MISTRAL_API_KEY")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
DB_NAME = os.getenv("DB_NAME")
DATABASE_DIR = os.getenv("DATABASE_DIR")

if not all([MISTRAL_API_KEY, GEMINI_API_KEY, DB_NAME, DATABASE_DIR]):
    raise ValueError("Missing one or more required environment variables: MISTRAL_API_KEY, GEMINI_API_KEY, DB_NAME, DATABASE_DIR")

configure(api_key=GEMINI_API_KEY)

if not os.path.exists(DATABASE_DIR):
    try:
        os.makedirs(DATABASE_DIR)
    except OSError as e:
        raise HTTPException(status_code=500, detail=f"Failed to create directory {DATABASE_DIR}: {str(e)}")

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
    try:
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
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        conn.commit()
    except sqlite3.Error as e:
        raise HTTPException(status_code=500, detail=f"Database initialization failed: {str(e)}")
    finally:
        conn.close()

init_db()

def save_to_db(file_hash: str, file_name: str, extracted_text: str, analysis_result: str, extracted_tables: str):
    """Save extracted text, tables, and analysis result to the database."""
    try:
        conn = sqlite3.connect(DB_NAME)
        c = conn.cursor()
        c.execute('''
            INSERT OR REPLACE INTO financial_data 
            (file_hash, file_name, extracted_text, analysis_result, extracted_tables)
            VALUES (?, ?, ?, ?, ?)
        ''', (file_hash, file_name, extracted_text, analysis_result, extracted_tables))
        conn.commit()
    except sqlite3.Error as e:
        raise HTTPException(status_code=500, detail=f"Failed to save to database: {str(e)}")
    finally:
        conn.close()

def get_existing_data(file_hash: str) -> Optional[tuple]:
    """Retrieve existing data from the database based on file hash."""
    try:
        conn = sqlite3.connect(DB_NAME)
        c = conn.cursor()
        c.execute('SELECT file_name, extracted_text, analysis_result, extracted_tables FROM financial_data WHERE file_hash = ?', (file_hash,))
        result = c.fetchone()
        return result
    except sqlite3.Error as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve data: {str(e)}")
    finally:
        conn.close()

def extract_text_with_mistral(file_obj, pages_to_process: List[int]):
    """Extract text from PDF file object using Mistral AI OCR API."""
    if not hasattr(file_obj, 'seek') or not hasattr(file_obj, 'read'):
        raise HTTPException(status_code=400, detail="Invalid file object provided")
    
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
        raise HTTPException(status_code=502, detail=f"Mistral API request failed: {str(e)}")
    except ValueError as e:
        raise HTTPException(status_code=502, detail=f"Invalid response from Mistral API: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing with Mistral: {str(e)}")

def extract_tables_from_text(text_content: str) -> List[str]:
    """Extract tables from the markdown text content."""
    try:
        table_pattern = r'(\|[^\n]+\|\n\|[-:| ]+\|\n(?:\|[^\n]+\|\n)+)'
        tables = re.findall(table_pattern, text_content)
        return tables
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error extracting tables: {str(e)}")

def create_summary_tables(analysis_text: str) -> str:
    """Ask Gemini to create summary tables based on the analysis."""
    try:
        if not analysis_text or not isinstance(analysis_text, str):
            raise HTTPException(status_code=400, detail="Analysis text is invalid or empty")

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
        
        # Truncate if too long (example limit)
        if len(prompt) > 30000:
            analysis_text = analysis_text[:10000] + "... [Truncated for processing]"
            prompt = prompt.replace(analysis_text, analysis_text[:10000] + "... [Truncated]")

        response = model.generate_content(prompt)
        
        if not hasattr(response, 'text') or not response.text:
            raise ValueError("Gemini API returned an invalid or empty response")
        
        return response.text
    except ValueError as e:
        raise HTTPException(status_code=500, detail=f"Error creating summary tables: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating summary tables with Gemini: {str(e)}")

def analyze_with_gemini(text_content: str, pages_to_process: List[int]) -> str:
    """Analyze the extracted text with Google's Gemini API and include detailed citations."""
    try:
        page_text_dict = {}
        page_markers = re.findall(r'\n\*\*Page (\d+)\*\*\n', text_content)
        if page_markers:
            segments = re.split(r'\n\*\*Page \d+\*\*\n', text_content)
            for i, page_num in enumerate(page_markers):
                if i + 1 < len(segments):
                    page_text_dict[page_num] = segments[i + 1]
        else:
            words = text_content.split()
            words_per_page = 500
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
        analysis_text = response.text
        
        page_overview = f"""
## DOCUMENT INFORMATION
- **Pages Analyzed:** {', '.join(map(str, pages_to_process))}
- **Total Pages Processed:** {len(pages_to_process)}

"""
        return page_overview + analysis_text
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error analyzing with Gemini: {str(e)}")

def chat_with_gemini_simple(context: str, user_query: str) -> str:
    """Simple chat with Gemini."""
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

def extract_page_numbers(text_content: str) -> dict:
    """Extract page numbers from text content to improve citation accuracy."""
    try:
        page_numbers = {}
        lines = text_content.split('\n')
        current_page = 1
        
        for i, line in enumerate(lines):
            page_match = re.search(r'(?i)page\s+(\d+)(?:\s+of\s+\d+)?', line)
            if page_match:
                current_page = int(page_match.group(1))
                page_numbers[current_page] = {'start_line': i, 'content': line}
        
        sorted_pages = sorted(page_numbers.keys())
        for i, page in enumerate(sorted_pages):
            if i < len(sorted_pages) - 1:
                page_numbers[page]['end_line'] = page_numbers[sorted_pages[i+1]]['start_line'] - 1
            else:
                page_numbers[page]['end_line'] = len(lines) - 1
        
        return page_numbers
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error extracting page numbers: {str(e)}")

def convert_markdown_to_pdf(markdown_content: str, output_path: str) -> tuple[bool, Optional[str]]:
    """Convert markdown content to PDF using alternative methods with fallbacks."""
    try:
        html_content = markdown.markdown(markdown_content, extensions=['tables', 'fenced_code'])
        
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
        
        with tempfile.NamedTemporaryFile(suffix='.html', delete=False, mode='w', encoding='utf-8') as temp_html:
            temp_html_path = temp_html.name
            temp_html.write(styled_html)
        
        try:
            wkhtmltopdf_paths = [
                '/usr/local/bin/wkhtmltopdf',
                '/usr/bin/wkhtmltopdf',
                'C:\\Program Files\\wkhtmltopdf\\bin\\wkhtmltopdf.exe',
                'C:\\Program Files (x86)\\wkhtmltopdf\\bin\\wkhtmltopdf.exe',
            ]
            
            config = None
            for path in wkhtmltopdf_paths:
                if os.path.exists(path):
                    config = pdfkit.configuration(wkhtmltopdf=path)
                    break
            
            pdf_options = {
                'quiet': '',
                'enable-local-file-access': '',
                'encoding': 'UTF-8'
            }
            
            if config:
                pdfkit.from_file(temp_html_path, output_path, configuration=config, options=pdf_options)
            else:
                pdfkit.from_file(temp_html_path, output_path, options=pdf_options)
            
            os.remove(temp_html_path)
            return True, None
            
        except Exception as e:
            error_msg = f"pdfkit/wkhtmltopdf error: {str(e)}"
            
            try:
                import weasyprint
                weasyprint.HTML(string=styled_html).write_pdf(output_path)
                os.remove(temp_html_path)
                return True, None
            except ImportError:
                return False, "WeasyPrint not installed, skipping this fallback"
            except Exception as e2:
                error_msg += f" | WeasyPrint error: {str(e2)}"
            
            html_output_path = output_path.replace('.pdf', '.html')
            try:
                import shutil
                shutil.copy(temp_html_path, html_output_path)
                os.remove(temp_html_path)
                return False, f"PDF generation failed. Saved HTML version instead: {html_output_path}. Original errors: {error_msg}"
            except Exception as e3:
                os.remove(temp_html_path)
                return False, f"All PDF conversion methods failed: {error_msg} | HTML fallback error: {str(e3)}"
                
    except Exception as e:
        return False, f"Initial markdown conversion failed: {str(e)}"