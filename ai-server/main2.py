from fastapi import FastAPI, Form, HTTPException, Body, UploadFile, File
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
from PyPDF2 import PdfReader
from fastapi.templating import Jinja2Templates
from typing import List, Dict, Optional
import uuid, json, os, io, base64, tempfile, sqlite3, hashlib, re
import stocks_data
from services.gemini_game_flow import get_gemini_response
from services.stocks_data import fetch_multiple_stocks
from python_types.types import StockItem, ProphetRequest
from services.reports import convert_markdown_to_pdf, save_to_db, extract_tables_from_text, get_existing_data, extract_text_with_mistral, analyze_with_gemini, chat_with_gemini_simple, create_summary_tables
from predictive_analysis import prophet_stock
from services.chatbot import search_companies_by_query, SearchCompaniesRequest, initialize_graph_database, clear_chat, display_chat, generate_response, add_to_chat, genai, state, init_state, get_pdf_files_from_folders, ProcessDocumentsRequest, generate_database_id, get_existing_faiss_indexes, VectorDatabase, extract_text_with_links, ChatRequest
from services.business_model import extract_text, generate_business_models, generate_pdf
from services.sentimental_analysis import extract_text_from_pdf, analyze_sentiment, create_pdf_report
from pinecone import Pinecone, ServerlessSpec  # Updated to correct package
from google.generativeai import GenerativeModel, configure
import requests
from pydantic import BaseModel, ConfigDict

# Hardcoded API keys
MISTRAL_API_KEY = "JZslDyH2l2tQHDksRbDfHYVKgO50LfkN"
GEMINI_API_KEY = "AIzaSyAwY29cyESToWBGM3Rg2mEghTJUGyMaoJw"

# Configure Gemini
configure(api_key=GEMINI_API_KEY)

# Pinecone setup
PINECONE_API_KEY = "pcsk_4XsyED_G6HLxQCbXeRFi5Skd68yUunAWgjpZ7QzxBP38Bmu2mveRNHWgn9VoTMWoDuXa3M"
PINECONE_ENVIRONMENT = "us-east-1"  # Valid AWS region
pc = Pinecone(api_key=PINECONE_API_KEY)

# Database and directory setup
DB_NAME = "financial_analyzer.db"
DATABASE_DIR = "databases"
UPLOAD_DIR = "uploads"
REPORT_DIR = "reports"
os.makedirs(DATABASE_DIR, exist_ok=True)
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(REPORT_DIR, exist_ok=True)

app = FastAPI(title="Fin360")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/generated_pdfs", StaticFiles(directory="generated_pdfs"), name="generated_pdfs")
templates = Jinja2Templates(directory="templates")

class ModelOptions(BaseModel):
    model_name: str
    temperature: float
    top_p: float
    max_tokens: int
    context_window: int
    model_config = ConfigDict(protected_namespaces=())  # Explicitly set to resolve warning

class ChatRequest(BaseModel):
    prompt: str
    model_options: ModelOptions
    chat_mode: str = "Simple (Full Context)"
    context_source: str = "Analysis Result"
    model_config = ConfigDict(protected_namespaces=())  # Explicitly set to resolve warning

def init_db():
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
            pinecone_index_name TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    conn.commit()
    conn.close()

def split_into_chunks(text: str, chunk_size: int = 500):
    words = text.split()
    chunks = []
    for i in range(0, len(words), chunk_size):
        chunk = " ".join(words[i:i + chunk_size])
        chunks.append(chunk)
    return chunks

def build_pinecone_index(chunks: List[str], file_hash: str):
    short_hash = file_hash[:20]  # Take first 20 characters of hash
    index_name = f"financial-{short_hash}"
    if index_name not in pc.list_indexes().names():
        pc.create_index(
            name=index_name,
            dimension=1536,
            metric="euclidean",
            spec=ServerlessSpec(cloud="aws", region=PINECONE_ENVIRONMENT)
        )
    index = pc.Index(index_name)
    
    model = GenerativeModel('gemini-2.0-flash')
    vectors = []
    for i, chunk in enumerate(chunks):
        embedding_response = model.generate_content(chunk).embedding
        vectors.append((f"chunk-{i}", embedding_response, {"text": chunk}))
    
    index.upsert(vectors=vectors)
    return index_name

def load_pinecone_index(index_name: str):
    if index_name in pc.list_indexes().names():
        return pc.Index(index_name)
    return None

def chat_with_pinecone(index_name: str, context: str, query: str, image_bytes: Optional[bytes] = None):
    index = load_pinecone_index(index_name)
    if not index:
        raise HTTPException(status_code=400, detail="Pinecone index not found")
    
    model = GenerativeModel('gemini-2.0-flash')
    query_embedding = model.generate_content(query).embedding
    results = index.query(vector=query_embedding, top_k=3, include_metadata=True)
    
    relevant_context = "\n".join([match["metadata"]["text"] for match in results["matches"]])
    prompt = f"Context:\n{relevant_context}\n\nQuery:\n{query}"
    if image_bytes:
        prompt += "\n\n[Image data included]"
    response = model.generate_content(prompt)
    return response.text

def get_file_hash(file_content: bytes):
    return hashlib.sha256(file_content).hexdigest()

analysis_cache: Dict[str, dict] = {}
chat_histories: Dict[str, List[dict]] = {}

@app.post("/ai-financial-path")
async def ai_financial_path(input: str = Form(...), risk: Optional[str] = Form("conservative")):
    try:
        response = get_gemini_response(input, risk)
        return JSONResponse(content=response, status_code=200)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Something went wrong: {str(e)}")

@app.post("/stocks")
async def process_stocks(stocks_data: List[StockItem] = Body(...)):
    try:
        if not stocks_data:
            raise HTTPException(status_code=400, detail="No stock data provided")
        
        ticker_symbols = [stock.tickerSymbol for stock in stocks_data]
        all_stock_data = fetch_multiple_stocks(ticker_symbols, delay_between_requests=1)
        
        enriched_stocks = []
        total_portfolio_value = 0
        failed_tickers = []
        
        for stock in stocks_data:
            stock_info = all_stock_data.get(stock.tickerSymbol, {"currentPrice": None, "dividendYield": None})
            if stock_info["currentPrice"] is None:
                failed_tickers.append(stock.tickerSymbol)
                continue
            
            unrealized_gains_losses = round((stock_info["currentPrice"] - stock.purchasePrice) * stock.numberOfShares, 2)
            stock_value = stock_info["currentPrice"] * stock.numberOfShares
            total_portfolio_value += stock_value
            
            enriched_stock = stock.dict()
            enriched_stock.update({
                "currentPrice": stock_info["currentPrice"],
                "unrealizedGainsLosses": unrealized_gains_losses,
                "dividendYield": stock_info["dividendYield"],
                "stockValue": round(stock_value, 2)
            })
            enriched_stocks.append(enriched_stock)
        
        if len(failed_tickers) == len(ticker_symbols):
            raise HTTPException(
                status_code=503,
                detail="Service temporarily unavailable. Could not fetch any stock data due to rate limiting."
            )
        
        for stock in enriched_stocks:
            stock["weightageInPortfolio"] = round((stock["stockValue"] / total_portfolio_value) * 100, 2) if total_portfolio_value > 0 else 0
        
        response_data = {
            "message": "Stock data processed successfully!",
            "totalPortfolioValue": round(total_portfolio_value, 2),
            "stocks": enriched_stocks
        }
        if failed_tickers:
            response_data["warnings"] = f"Could not fetch data for these tickers: {', '.join(failed_tickers)}"
        
        return JSONResponse(content=response_data, status_code=200)
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing stocks: {str(e)}")

@app.post("/analyze")
async def analyze_file(file: UploadFile = File(...), pages: Optional[str] = Form(None)):
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")
    
    file_content = await file.read()
    file_hash = get_file_hash(file_content)

    if file_hash in analysis_cache:
        return {
            "file_hash": file_hash,
            "file_name": analysis_cache[file_hash]["file_name"],
            "extracted_text": analysis_cache[file_hash]["extracted_text"],
            "analysis_result": analysis_cache[file_hash]["analysis_result"]
        }
    
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as temp_file:
            temp_file.write(file_content)
            temp_file_path = temp_file.name

        pdf_reader = PdfReader(io.BytesIO(file_content))
        num_pages = len(pdf_reader.pages)
        
        pages_to_process = [int(p) for p in pages.split(',')] if pages else list(range(num_pages))
        if any(p >= num_pages or p < 0 for p in pages_to_process):
            raise HTTPException(status_code=400, detail="Invalid page numbers")
    
        ocr_result = extract_text_with_mistral(file_content, file.filename, pages_to_process)
        if not ocr_result:
            raise HTTPException(status_code=500, detail="Failed to extract text from PDF")
        
        all_text = ""
        for page in ocr_result.get("pages", []):
            all_text += page.get("markdown", "") + "\n\n"
        
        analysis = analyze_with_gemini(all_text)
        
        context_chunks = split_into_chunks(all_text)
        pinecone_index_name = build_pinecone_index(context_chunks, file_hash)
        
        analysis_cache[file_hash] = {
            "file_name": file.filename,
            "extracted_text": all_text,
            "analysis_result": analysis,
            "pinecone_index_name": pinecone_index_name,
            "file_path": temp_file_path
        }
        
        chat_histories[file_hash] = []
        
        return {
            "file_hash": file_hash,
            "file_name": file.filename,
            "extracted_text": all_text,
            "analysis_result": analysis
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing PDF: {str(e)}")

@app.get("/download/{file_hash}")
async def download_pdf(file_hash: str):
    if file_hash not in analysis_cache:
        raise HTTPException(status_code=404, detail="File not found")
    
    file_path = analysis_cache[file_hash]["file_path"]
    return FileResponse(
        path=file_path,
        media_type="application/pdf",
        filename="financial_report.pdf",
        content_disposition_type="attachment"
    )

@app.get("/download/{file_hash}/pdf")
async def download_pdf_file(file_hash: str):
    file_path = os.path.join("generated_pdfs", f"financial_analysis.pdf")
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")
    
    return FileResponse(
        path=file_path,
        media_type="application/pdf",
        filename=f"financial_analysis.pdf",
        content_disposition_type="attachment"
    )

@app.post("/chat")
async def chat(
    file_hash: str = Form(...),
    context_type: str = Form(...),
    query: str = Form(...),
    use_pinecone: str = Form("false"),
    image: Optional[UploadFile] = File(None)
):
    if file_hash not in analysis_cache:
        raise HTTPException(status_code=404, detail="Document not found")
    
    context_data = analysis_cache[file_hash]
    context = (
        context_data["extracted_text"] if context_type == "extracted_text"
        else context_data["analysis_result"]
    )

    image_bytes = await image.read() if image else None
    
    use_pinecone_bool = use_pinecone.lower() == "true"
    
    if use_pinecone_bool:
        pinecone_index_name = context_data.get("pinecone_index_name")
        if not pinecone_index_name:
            raise HTTPException(status_code=400, detail="Pinecone index not available for this document")
        response = chat_with_pinecone(pinecone_index_name, context, query, image_bytes)
    else:
        response = chat_with_gemini_simple(context, query, image_bytes)

    chat_entry = {"role": "user", "content": query}
    if image:
        chat_entry["image"] = base64.b64encode(image_bytes).decode('utf-8')
    chat_histories[file_hash].append(chat_entry)
    chat_histories[file_hash].append({"role": "assistant", "content": response})
    
    return {
        "response": response,
        "chat_history": chat_histories[file_hash]
    }

@app.get("/chat_history/{file_hash}")
async def get_chat_history(file_hash: str):
    if file_hash not in chat_histories:
        raise HTTPException(status_code=404, detail="Chat history not found")
    return {"chat_history": chat_histories[file_hash]}

@app.get("/available_documents")
async def get_available_documents():
    return {
        "documents": [
            {"file_hash": file_hash, "file_name": data["file_name"]}
            for file_hash, data in analysis_cache.items()
        ]
    }

@app.post("/prophet_stock")
async def prophet_stock_route(request: ProphetRequest):
    try:
        prophet_images = prophet_stock.main(request.years)
        return JSONResponse(content={"prophet_images": prophet_images})
    except Exception as e:
        return JSONResponse(content={"error": str(e)}, status_code=500)

@app.get("/portfolio_data")
async def get_stocks_data():
    try:
        stocks_df = stocks_data.load_stocks_data()
        bonds_data = stocks_data.load_bonds_data()
        return JSONResponse(content={'stocks': stocks_df, 'bonds': bonds_data})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.on_event("startup")
async def startup_event():
    init_db()
    init_state()

@app.get("/default_pdfs", response_model=Dict[str, List[Dict[str, str]]])
async def get_default_pdfs():
    default_pdfs = get_pdf_files_from_folders()
    if not default_pdfs:
        return {"departments": {}}
    departments = {}
    for pdf in default_pdfs:
        if pdf["department"] not in departments:
            departments[pdf["department"]] = []
        departments[pdf["department"]].append(pdf["name"])
    return {"departments": departments}

@app.post("/process_documents")
async def process_documents(
    request: ProcessDocumentsRequest,
    uploaded_files: Optional[List[UploadFile]] = File(None)
):
    default_pdfs = get_pdf_files_from_folders()
    combined_pdfs = default_pdfs + ([{"name": file.filename, "content": file} for file in uploaded_files] if uploaded_files else [])

    if not combined_pdfs:
        raise HTTPException(status_code=400, detail="No PDFs to process")

    db_id = generate_database_id(combined_pdfs)

    if request.action == "Use Existing FAISS Index":
        existing_indexes = get_existing_faiss_indexes()
        if not existing_indexes:
            raise HTTPException(status_code=404, detail="No existing indexes found")
        if db_id not in existing_indexes:
            raise HTTPException(status_code=404, detail=f"Index {db_id} not found")
        vector_db = VectorDatabase.load(db_id, "embedding-001")
        if vector_db:
            state['vector_db'] = vector_db
            state['db_id'] = db_id
            processed_files = set(meta.get("source", "").split(" (")[0] for meta in vector_db.document_metadata if "source" in meta)
            state['processed_files'] = list(processed_files)
            return {"message": f"Loaded index: {db_id}"}
        else:
            raise HTTPException(status_code=500, detail=f"Failed to load index: {db_id}")

    elif request.action == "Process New Documents":
        if request.force_reindex or db_id != state['db_id']:
            vector_db = VectorDatabase("embedding-001")
            total_files = len(combined_pdfs)
            processed, skipped = 0, 0

            for pdf in default_pdfs:
                print(f"Processing {processed+1}/{total_files}: {pdf['name']}")
                pdf_text = extract_text_with_links(pdf["path"])
                if pdf_text.strip():
                    metadata = {"source": f"{pdf['name']} (Department: {pdf['department']})", "type": "pdf"}
                    chunks_added = vector_db.add_document(pdf_text, chunk_size=request.chunk_size, overlap=request.chunk_overlap, metadata=metadata)
                    print(f"Added {chunks_added} chunks from {pdf['name']}")
                else:
                    if request.skip_empty_pdfs:
                        print(f"Skipping {pdf['name']} - no text")
                        skipped += 1
                    else:
                        metadata = {"source": f"{pdf['name']} (Department: {pdf['department']})", "type": "pdf"}
                        vector_db.add_document("No text.", chunk_size=request.chunk_size, overlap=0, metadata=metadata)
                processed += 1

            if uploaded_files:
                for file in uploaded_files:
                    print(f"Processing {processed+1}/{total_files}: {file.filename}")
                    pdf_text = extract_text_with_links(file.file)
                    if pdf_text.strip():
                        metadata = {"source": f"{file.filename} (Uploaded)", "type": "pdf"}
                        chunks_added = vector_db.add_document(pdf_text, chunk_size=request.chunk_size, overlap=request.chunk_overlap, metadata=metadata)
                        print(f"Added {chunks_added} chunks from {file.filename}")
                    else:
                        if request.skip_empty_pdfs:
                            print(f"Skipping {file.filename} - no text")
                            skipped += 1
                        else:
                            metadata = {"source": f"{file.filename} (Uploaded)", "type": "pdf"}
                            vector_db.add_document("No text.", chunk_size=request.chunk_size, overlap=0, metadata=metadata)
                    processed += 1

            vector_db.save(db_id)
            state['vector_db'] = vector_db
            state['db_id'] = db_id
            state['processed_files'] = [pdf["name"] for pdf in default_pdfs] + ([file.filename for file in uploaded_files] if uploaded_files else [])
            return {"message": f"Processed {total_files - skipped} documents (skipped {skipped}) with ID: {db_id}"}
        else:
            vector_db = VectorDatabase.load(db_id, "embedding-001")
            if vector_db:
                state['vector_db'] = vector_db
                state['db_id'] = db_id
                return {"message": f"Loaded existing database with ID: {db_id}"}
            else:
                raise HTTPException(status_code=500, detail=f"Failed to load index: {db_id}")

@app.post("/chatbot")
async def chat(request: ChatRequest):
    model_options = request.model_options
    model_instance = genai.GenerativeModel(
        model_name=model_options.model_name if model_options.model_name.startswith("gemini") else "gemini-1.5-flash",
        generation_config={
            "temperature": model_options.temperature,
            "top_p": model_options.top_p,
            "max_output_tokens": model_options.max_tokens
        }
    ) if not model_options.model_name.startswith("llama") else None

    add_to_chat("user", request.prompt)
    response = generate_response(
        request.prompt,
        state['vector_db'],
        model_instance,
        model_options.model_name,
        model_options.temperature,
        model_options.top_p,
        model_options.max_tokens,
        model_options.context_window
    )
    add_to_chat("assistant", response)
    return {"response": response, "chat_history": display_chat()}

@app.get("/chat_history")
async def get_chat_history():
    return {"chat_history": display_chat()}

@app.post("/clear_chat")
async def clear_chat_endpoint():
    clear_chat()
    return {"message": "Chat history cleared!"}

@app.post("/initialize_graph")
async def initialize_graph():
    result = initialize_graph_database()
    return result

@app.post("/search_companies")
async def search_companies(request: SearchCompaniesRequest):
    search_results = search_companies_by_query(request.search_text, request.limit)
    if not search_results:
        return {"message": "No companies found."}
    return {"results": search_results}

@app.get("/settings")
async def get_settings():
    settings = {}
    if state['vector_db']:
        settings["vector_db"] = {
            "db_id": state['db_id'],
            "chunk_count": len(state['vector_db'].document_chunks),
            "processed_files": state['processed_files']
        }
    if state['graph_initialized']:
        settings["graph_db"] = {"status": "Initialized"}
    return {"settings": settings}

@app.post("/analyze/business_model")
async def generate_business_model(
    file: UploadFile = File(...),
    annual_revenue: int = 1000000,
    profit_margin: float = 15.0,
    market_growth_rate: float = 5.0,
    customer_acquisition_cost: int = 500,
    customer_lifetime_value: int = 2000,
):
    if file.content_type not in ["application/pdf", "image/png", "image/jpeg", "text/csv"]:
        raise HTTPException(status_code=400, detail="Invalid file type. Supported types: pdf, png, jpg, jpeg, csv")

    file_path = f"temp_files/{uuid.uuid4()}_{file.filename}"
    try:
        os.makedirs("temp_files", exist_ok=True)
        with open(file_path, "wb") as f:
            f.write(await file.read())

        file_text = extract_text(file_path, file.content_type)

        financial_params = {
            "annual_revenue": annual_revenue,
            "profit_margin": profit_margin,
            "market_growth_rate": market_growth_rate,
            "customer_acquisition_cost": customer_acquisition_cost,
            "customer_lifetime_value": customer_lifetime_value,
        }

        business_models = generate_business_models(financial_params, file_text)

        pdf_filename = f"business_models_{uuid.uuid4()}.pdf"
        pdf_path = os.path.join("generated_pdfs", pdf_filename)
        os.makedirs("generated_pdfs", exist_ok=True)

        generate_pdf(business_models, pdf_path)

        return {"download_url": f"/api/download/{pdf_filename}"}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if os.path.exists(file_path):
            os.remove(file_path)

@app.post("/analyze/sentiment_analysis")
async def analyze_pdf(file: UploadFile = File(...), company_name: Optional[str] = "JPMC") -> Dict:
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Invalid file type. Only PDF files are allowed.")

    try:
        with tempfile.TemporaryDirectory() as tmpdir:
            file_path = os.path.join(tmpdir, file.filename)
            with open(file_path, "wb") as f:
                f.write(await file.read())

            extracted_text = extract_text_from_pdf(file_path)

            analysis = analyze_sentiment(extracted_text)

            pdf_buffer = create_pdf_report(analysis, company_name)

            pdf_filename = f"management_analysis_report_{uuid.uuid4()}.pdf"
            pdf_path = os.path.join("generated_pdfs", pdf_filename)
            os.makedirs("generated_pdfs", exist_ok=True)

            with open(pdf_path, "wb") as f:
                f.write(pdf_buffer.getvalue())

            return {"download_url": f"/api/download/{pdf_filename}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/download/{filename}")
async def download_file(filename: str):
    file_path = os.path.join("generated_pdfs", filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")
    
    return FileResponse(
        path=file_path,
        filename=filename,
        media_type="application/pdf"
    )

@app.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    pages_to_process: str = Form("[]"),
):
    try:
        file_content = await file.read()
        file_hash = get_file_hash(file_content)

        existing_data = get_existing_data(file_hash)
        if existing_data:
            file_name, extracted_text, analysis_result, extracted_tables, pinecone_index_name = existing_data
            return JSONResponse(content={
                "status": "success",
                "message": f"Found existing analysis for '{file_name}' in the database!",
                "data": {
                    "file_name": file_name,
                    "extracted_text": extracted_text,
                    "analysis_result": analysis_result,
                    "extracted_tables": json.loads(extracted_tables) if extracted_tables else [],
                    "pinecone_index_name": pinecone_index_name
                }
            })

        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp_file:
            tmp_file.write(file_content)
            tmp_path = tmp_file.name

        try:
            with open(tmp_path, "rb") as pdf_file:
                pdf_reader = PdfReader(pdf_file)
                num_pages = len(pdf_reader.pages)
                
                pages = json.loads(pages_to_process)
                if not pages:
                    pages = list(range(num_pages))
                else:
                    invalid_pages = [p for p in pages if p >= num_pages or p < 0]
                    if invalid_pages:
                        raise HTTPException(
                            status_code=400,
                            detail=f"Invalid page numbers: {invalid_pages}. Document has {num_pages} pages."
                        )

                pdf_file.seek(0)
                ocr_result = extract_text_with_mistral(pdf_file, pages)
                
                if not ocr_result or "pages" not in ocr_result:
                    raise HTTPException(
                        status_code=500,
                        detail="Failed to extract text from PDF or invalid response format"
                    )

                all_text = ""
                for page in ocr_result.get("pages", []):
                    page_num = page.get("page_num", 0)
                    page_content = page.get("markdown", "")
                    if page_content:
                        all_text += f"\n**Page {page_num}**\n{page_content}\n\n"

                if not all_text.strip():
                    raise HTTPException(
                        status_code=500,
                        detail="No text content could be extracted from the PDF"
                    )

                tables = extract_tables_from_text(all_text)
                analysis = analyze_with_gemini(all_text, pages)
                summary_tables = create_summary_tables(analysis)
                combined_analysis = f"{analysis}\n\n## SUMMARY TABLES\n\n{summary_tables}"
                
                context_chunks = split_into_chunks(all_text)
                short_hash = file_hash[:20]  # Take first 20 characters of hash
                pinecone_index_name = f"financial-{short_hash}"
                build_pinecone_index(context_chunks, file_hash)  # Build index with original hash for consistency
                
                save_to_db(
                    file_hash,
                    file.filename,
                    all_text,
                    combined_analysis,
                    json.dumps(tables),
                    pinecone_index_name
                )

                return JSONResponse(content={
                    "status": "success",
                    "message": "Analysis completed successfully",
                    "data": {
                        "file_name": file.filename,
                        "extracted_text": all_text,
                        "analysis_result": combined_analysis,
                        "extracted_tables": tables,
                        "pinecone_index_name": pinecone_index_name,
                        "file_hash": file_hash
                    }
                })
        
        finally:
            try:
                os.unlink(tmp_path)
            except Exception as e:
                print(f"Warning: Failed to delete temp file {tmp_path}: {str(e)}")

    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid pages_to_process format")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")

@app.get("/documents/")
async def list_documents():
    try:
        conn = sqlite3.connect(DB_NAME)
        c = conn.cursor()
        c.execute('SELECT file_hash, file_name, timestamp FROM financial_data ORDER BY timestamp DESC')
        results = c.fetchall()
        conn.close()
        
        documents = []
        for row in results:
            documents.append({
                "file_hash": row[0],
                "file_name": row[1],
                "timestamp": row[2],
                "pinecone_index_name": f"financial-{row[0][:20]}"  # Truncate here too for consistency
            })
            
        return JSONResponse(content={
            "status": "success",
            "documents": documents
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/document/{file_hash}")
async def get_document(file_hash: str):
    try:
        existing_data = get_existing_data(file_hash)
        if not existing_data:
            raise HTTPException(status_code=404, detail="Document not found")
            
        file_name, extracted_text, analysis_result, extracted_tables, pinecone_index_name = existing_data
        
        return JSONResponse(content={
            "status": "success",
            "document": {
                "file_name": file_name,
                "extracted_text": extracted_text,
                "analysis_result": analysis_result,
                "extracted_tables": json.loads(extracted_tables) if extracted_tables else [],
                "pinecone_index_name": pinecone_index_name
            }
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/chat/{file_hash}")
async def chat_with_document(
    file_hash: str,
    chat_request: ChatRequest
):
    try:
        existing_data = get_existing_data(file_hash)
        if not existing_data:
            raise HTTPException(status_code=404, detail="Document not found")
            
        file_name, extracted_text, analysis_result, extracted_tables, pinecone_index_name = existing_data
        
        context_text = analysis_result if chat_request.context_source == "Analysis Result" else extracted_text
        
        if chat_request.chat_mode == "Simple (Full Context)":
            response = chat_with_gemini_simple(context_text, chat_request.query)
        else:
            index = load_pinecone_index(pinecone_index_name)
            if index is None:
                context_chunks = split_into_chunks(context_text)
                short_hash = file_hash[:20]
                pinecone_index_name = f"financial-{short_hash}"
                build_pinecone_index(context_chunks, file_hash)
                save_to_db(file_hash, file_name, extracted_text, analysis_result, extracted_tables, pinecone_index_name)
                
            response = chat_with_pinecone(pinecone_index_name, context_text, chat_request.query)
            
        return JSONResponse(content={
            "status": "success",
            "response": response
        })
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/download/markdown/{file_hash}")
async def download_markdown(file_hash: str):
    try:
        existing_data = get_existing_data(file_hash)
        if not existing_data:
            raise HTTPException(status_code=404, detail="Document not found")
            
        _, _, analysis_result, _, _ = existing_data
        
        with tempfile.NamedTemporaryFile(delete=False, suffix=".md") as tmp:
            tmp.write(analysis_result.encode('utf-8'))
            tmp_path = tmp.name
        
        return FileResponse(
            tmp_path,
            media_type="text/markdown",
            filename="financial_analysis.md",
            background=lambda: os.unlink(tmp_path)
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/download/pdf/{file_hash}")
async def download_pdf(file_hash: str):
    try:
        existing_data = get_existing_data(file_hash)
        if not existing_data:
            raise HTTPException(status_code=404, detail="Document not found")
            
        file_name, _, analysis_result, _, _ = existing_data
        
        pdf_dir = os.path.join(os.getcwd(), "generated_pdfs")
        os.makedirs(pdf_dir, exist_ok=True)
        
        base_filename = f"{file_hash}_{file_name.replace(' ', '_')}"
        base_filename = re.sub(r'\.\w+$', '', base_filename) + ".pdf"
        safe_filename = re.sub(r'[^\w\-\.]', '_', base_filename)
        
        pdf_path = os.path.join(pdf_dir, safe_filename)
        
        if not os.path.exists(pdf_path):
            success, error = convert_markdown_to_pdf(analysis_result, pdf_path)
            if not success:
                raise HTTPException(status_code=500, detail=f"Error generating PDF: {error}")
    
        return FileResponse(
            pdf_path,
            media_type="application/pdf",
            filename=safe_filename
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
