import google.generativeai as genai
import os
import fitz
import time
import re
import glob
import hashlib
from datetime import datetime, timedelta
from neo4j import GraphDatabase
from dotenv import load_dotenv
from groq import Groq
import yfinance as yf
import pandas as pd
import json
from functools import lru_cache
import atexit
from pydantic import BaseModel

load_dotenv()

path2 = '/home/sameer42/Desktop/Hackathons/fin360/ai-server' 
annual_reports = 'Annual Reports'

genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))

neo4j_uri = os.getenv("NEO4J_URI")
neo4j_username = os.getenv("NEO4J_USER")
neo4j_password = os.getenv("NEO4J_PASSWORD")

driver = GraphDatabase.driver(
    neo4j_uri,
    auth=(neo4j_username, neo4j_password),
    max_connection_lifetime=3600,
    max_connection_pool_size=50,
    connection_acquisition_timeout=60
)

groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))

SECTORS = {
    "Technology": ["AAPL", "MSFT", "GOOGL", "META"],
    "Healthcare": ["JNJ", "PFE", "UNH", "ABBV"],
    "Manufacturing": ["GE", "CAT", "BA", "MMM"],
    "Finance": ["JPM", "BAC", "GS", "MS"]
}

FINANCIAL_METRICS = [
    "Revenue", "NetIncome", "GrossMargin", "OperatingMargin",
    "ROE", "DebtToEquity", "CurrentRatio", "CashFlow",
    "PriceToEarnings", "DividendYield"
]

state = {
    "chat_history": [],
    "db_id": None,
    "processed_files": [],
    "messages": [
        {"role": "assistant", "content": "Welcome to FinGraph RAG! Ask about documents or financial analysis.", "feedback": None}
    ],
    "conversation_context": [],
    "financial_cache": {},
    "graph_initialized": False
}

# Neo4j Graph Database Management
def create_graph_schema():
    with driver.session() as session:
        session.run("CREATE CONSTRAINT sector_name IF NOT EXISTS FOR (s:Sector) REQUIRE s.name IS UNIQUE")
        session.run("CREATE CONSTRAINT company_ticker IF NOT EXISTS FOR (c:Company) REQUIRE c.ticker IS UNIQUE")
        session.run("CREATE CONSTRAINT metric_id IF NOT EXISTS FOR (m:Metric) REQUIRE m.id IS UNIQUE")
        session.run("CREATE INDEX company_search IF NOT EXISTS FOR (c:Company) ON (c.name, c.description, c.ticker, c.industry)")
        session.run("CREATE INDEX sector_search IF NOT EXISTS FOR (s:Sector) ON (s.name, s.description)")

def initialize_graph_database():
    create_graph_schema()
    sector_descriptions = {
        "Technology": "Companies involved in tech R&D or distribution.",
        "Healthcare": "Companies in medical services or equipment.",
        "Manufacturing": "Companies converting raw materials to products.",
        "Finance": "Companies providing financial services."
    }
    with driver.session() as session:
        for sector_name, description in sector_descriptions.items():
            session.run("MERGE (s:Sector {name: $name}) SET s.description = $description",
                        {"name": sector_name, "description": description})

    for sector, tickers in SECTORS.items():
        for ticker in tickers:
            try:
                company_info = yf.Ticker(ticker).info
                company_data = {
                    "ticker": ticker,
                    "name": company_info.get("shortName", ticker),
                    "sector": sector,
                    "industry": company_info.get("industry", "Unknown"),
                    "description": company_info.get("longBusinessSummary", "No description"),
                    "marketCap": company_info.get("marketCap", 0),
                    "employees": company_info.get("fullTimeEmployees", 0)
                }
                with driver.session() as session:
                    session.run("""
                        MERGE (c:Company {ticker: $ticker})
                        SET c.name = $name, c.industry = $industry, c.description = $description,
                            c.marketCap = $marketCap, c.employees = $employees
                        WITH c MATCH (s:Sector {name: $sector}) MERGE (c)-[:BELONGS_TO]->(s)
                    """, {**company_data, "sector": sector})

                financials = fetch_company_financials(ticker)
                with driver.session() as session:
                    for metric_name, metric_value in financials.items():
                        if metric_value is not None:
                            metric_id = f"{ticker}_{metric_name}"
                            session.run("""
                                MATCH (c:Company {ticker: $ticker})
                                MERGE (m:Metric {id: $metric_id})
                                SET m.name = $metric_name, m.value = $metric_value, m.timestamp = timestamp()
                                MERGE (c)-[:HAS_METRIC]->(m)
                            """, {"ticker": ticker, "metric_id": metric_id, "metric_name": metric_name, "metric_value": metric_value})

                historical_data = fetch_historical_data(ticker)
                with driver.session() as session:
                    for date_str, price in historical_data.items():
                        price_id = f"{ticker}_price_{date_str}"
                        session.run("""
                            MATCH (c:Company {ticker: $ticker})
                            MERGE (p:Price {id: $price_id})
                            SET p.date = $date, p.value = $price
                            MERGE (c)-[:HAS_PRICE]->(p)
                        """, {"ticker": ticker, "price_id": price_id, "date": date_str, "price": price})

                with driver.session() as session:
                    session.run("""
                        MATCH (c1:Company {ticker: $ticker})
                        MATCH (c2:Company)
                        WHERE c2.ticker <> $ticker AND (c1)-[:BELONGS_TO]->(:Sector)<-[:BELONGS_TO]-(c2)
                        MERGE (c1)-[:COMPETES_WITH]->(c2)
                    """, {"ticker": ticker})

                time.sleep(0.5)
            except Exception as e:
                print(f"Error processing {ticker}: {str(e)}")
                continue

    state['graph_initialized'] = True
    return {"message": "Graph database initialized!"}

@lru_cache(maxsize=100)
def fetch_company_financials(ticker):
    try:
        company = yf.Ticker(ticker)
        income_stmt = company.income_stmt
        balance_sheet = company.balance_sheet
        cash_flow = company.cashflow
        info = company.info
        financials = {}
        if not income_stmt.empty and "Total Revenue" in income_stmt.index:
            financials["Revenue"] = float(income_stmt.loc["Total Revenue"].iloc[0])
        if not income_stmt.empty and "Net Income" in income_stmt.index:
            financials["NetIncome"] = float(income_stmt.loc["Net Income"].iloc[0])
        if not income_stmt.empty and "Total Revenue" in income_stmt.index and "Gross Profit" in income_stmt.index:
            revenue = income_stmt.loc["Total Revenue"].iloc[0]
            gross_profit = income_stmt.loc["Gross Profit"].iloc[0]
            if revenue > 0:
                financials["GrossMargin"] = float(gross_profit / revenue * 100)
        if not income_stmt.empty and "Total Revenue" in income_stmt.index and "Operating Income" in income_stmt.index:
            revenue = income_stmt.loc["Total Revenue"].iloc[0]
            operating_income = income_stmt.loc["Operating Income"].iloc[0]
            if revenue > 0:
                financials["OperatingMargin"] = float(operating_income / revenue * 100)
        if not income_stmt.empty and not balance_sheet.empty and "Net Income" in income_stmt.index and "Stockholders Equity" in balance_sheet.index:
            net_income = income_stmt.loc["Net Income"].iloc[0]
            equity = balance_sheet.loc["Stockholders Equity"].iloc[0]
            if equity > 0:
                financials["ROE"] = float(net_income / equity * 100)
        if not balance_sheet.empty and "Total Debt" in balance_sheet.index and "Stockholders Equity" in balance_sheet.index:
            total_debt = balance_sheet.loc["Total Debt"].iloc[0] if "Total Debt" in balance_sheet.index else balance_sheet.loc["Long Term Debt"].iloc[0]
            equity = balance_sheet.loc["Stockholders Equity"].iloc[0]
            if equity > 0:
                financials["DebtToEquity"] = float(total_debt / equity)
        if not balance_sheet.empty and "Current Assets" in balance_sheet.index and "Current Liabilities" in balance_sheet.index:
            current_assets = balance_sheet.loc["Current Assets"].iloc[0]
            current_liabilities = balance_sheet.loc["Current Liabilities"].iloc[0]
            if current_liabilities > 0:
                financials["CurrentRatio"] = float(current_assets / current_liabilities)
        if not cash_flow.empty and "Operating Cash Flow" in cash_flow.index:
            financials["CashFlow"] = float(cash_flow.loc["Operating Cash Flow"].iloc[0])
        if "trailingPE" in info:
            financials["PriceToEarnings"] = float(info["trailingPE"])
        if "dividendYield" in info and info["dividendYield"] is not None:
            financials["DividendYield"] = float(info["dividendYield"] * 100)
        return financials
    except Exception as e:
        print(f"Error fetching financials for {ticker}: {str(e)}")
        return {}

@lru_cache(maxsize=50)
def fetch_historical_data(ticker, period="1y", interval="1mo"):
    try:
        data = yf.download(ticker, period=period, interval=interval, progress=False)
        if data.empty:
            return {}
        historical_prices = {}
        for date, row in data.iterrows():
            date_str = date.strftime("%Y-%m-%d")
            historical_prices[date_str] = float(row["Close"].iloc[0])
        return historical_prices
    except Exception as e:
        print(f"Error fetching historical data for {ticker}: {str(e)}")
        return {}

# Neo4j Query Functions
def query_neo4j(query, parameters=None):
    if parameters is None:
        parameters = {}
    with driver.session() as session:
        result = session.run(query, parameters)
        return [record.data() for record in result]

def get_company_details(ticker):
    if ticker in state['financial_cache']:
        return state['financial_cache'][ticker]
    query = """
    MATCH (c:Company {ticker: $ticker})
    OPTIONAL MATCH (c)-[:BELONGS_TO]->(s:Sector)
    OPTIONAL MATCH (c)-[:HAS_METRIC]->(m:Metric)
    OPTIONAL MATCH (c)-[:HAS_PRICE]->(p:Price)
    OPTIONAL MATCH (c)-[:COMPETES_WITH]->(comp:Company)
    WITH c, s,
         COLLECT(DISTINCT {name: m.name, value: m.value}) AS metrics,
         COLLECT(DISTINCT {date: p.date, value: p.value}) AS prices,
         COLLECT(DISTINCT comp.ticker) AS competitors
    RETURN c.ticker AS ticker, c.name AS name, c.industry AS industry, c.description AS description,
           c.marketCap AS marketCap, c.employees AS employees, s.name AS sector, metrics, prices, competitors
    """
    results = query_neo4j(query, {"ticker": ticker})
    if results:
        state['financial_cache'][ticker] = results[0]
        return results[0]
    return None

def get_sector_details(sector_name):
    query = """
    MATCH (s:Sector {name: $sector_name})
    OPTIONAL MATCH (s)<-[:BELONGS_TO]-(c:Company)
    OPTIONAL MATCH (c)-[:HAS_METRIC]->(m:Metric)
    WITH s, c, COLLECT(DISTINCT {name: m.name, value: m.value}) AS company_metrics
    WITH s, COLLECT(DISTINCT {ticker: c.ticker, name: c.name, industry: c.industry, marketCap: c.marketCap, metrics: company_metrics}) AS companies
    RETURN s.name AS name, s.description AS description, companies
    """
    results = query_neo4j(query, {"sector_name": sector_name})
    if results:
        return results[0]
    return None

def search_companies_by_query(search_text, limit=5):
    query = """
    CALL db.index.fulltext.queryNodes("companySearch", $search_text)
    YIELD node, score
    RETURN node.ticker AS ticker, node.name AS name, node.industry AS industry, node.description AS description, score
    ORDER BY score DESC LIMIT $limit
    """
    results = query_neo4j(query, {"search_text": search_text, "limit": limit})
    if results:
        return results
    fallback_query = """
    MATCH (c:Company)
    WHERE toLower(c.name) CONTAINS toLower($search_text) OR toLower(c.industry) CONTAINS toLower($search_text) OR toLower(c.ticker) CONTAINS toLower($search_text)
    RETURN c.ticker AS ticker, c.name AS name, c.industry AS industry, c.description AS description LIMIT $limit
    """
    return query_neo4j(fallback_query, {"search_text": search_text, "limit": limit})

# Utility Functions
def extract_ticker_symbols(message):
    ticker_pattern = r'\$([A-Z]{1,5})\b|\b([A-Z]{1,5})\b'
    matches = re.findall(ticker_pattern, message)
    tickers = [match[0] if match[0] else match[1] for match in matches]
    common_words = ["I", "A", "AN", "THE", "AS", "IS", "IN", "ON", "AT", "TO", "FOR"]
    return list(set(ticker for ticker in tickers if ticker not in common_words))

def extract_text_with_links(pdf_file):
    if isinstance(pdf_file, str):
        doc = fitz.open(pdf_file)
        file_content = None
    else:
        doc = fitz.open(stream=pdf_file.read(), filetype="pdf")
        file_content = pdf_file
    text_with_links = ""
    all_links = {}
    link_texts = {}
    for page_num in range(len(doc)):
        page = doc.load_page(page_num)
        text_with_links += f"\n--- Page {page_num + 1} ---\n"
        links = page.get_links()
        page_links = {}
        for link in links:
            if 'uri' in link and 'from' in link:
                rect = link["from"]
                page_links[rect] = link['uri']
        all_links[page_num] = page_links
        link_texts[page_num] = {}
        blocks = page.get_text("dict")["blocks"]
        for block in blocks:
            if "lines" in block:
                for line in block["lines"]:
                    if "spans" in line:
                        line_text = ""
                        for span in line["spans"]:
                            text = span["text"]
                            if text.strip():
                                rect = fitz.Rect(span["bbox"])
                                found_link = False
                                for link_rect, uri in page_links.items():
                                    link_rect = fitz.Rect(link_rect)
                                    if rect.intersects(link_rect):
                                        line_text += text + " "
                                        if uri not in link_texts[page_num]:
                                            link_texts[page_num][uri] = []
                                        link_texts[page_num][uri].append(text)
                                        found_link = True
                                        break
                                if not found_link:
                                    line_text += text + " "
                        text_with_links += line_text + "\n"
    if any(links for links in all_links.values()):
        text_with_links += "\n\n=== DOCUMENT REFERENCES ===\n"
        for page_num, page_links in all_links.items():
            for link_rect, uri in page_links.items():
                if uri in link_texts[page_num]:
                    linked_text = " ".join(link_texts[page_num][uri])
                    if len(linked_text) > 100:
                        linked_text = linked_text[:97] + "..."
                    text_with_links += f"• Reference on page {page_num + 1}: \"{linked_text}\" - Link: {uri}\n"
    if file_content is not None:
        file_content.seek(0)
    return text_with_links

def get_pdf_files_from_folders():
    pdf_files = []
    for folder_name in [annual_reports]:
        folder_path = os.path.abspath(folder_name)
        if os.path.exists(folder_path) and os.path.isdir(folder_path):
            folder_pdfs = glob.glob(os.path.join(folder_path, "*.pdf"))
            for pdf_path in folder_pdfs:
                pdf_files.append({"path": pdf_path, "name": os.path.basename(pdf_path), "department": folder_name})
        else:
            print(f"Folder not found: {folder_name}")
    return pdf_files

def generate_database_id(pdf_files):
    hasher = hashlib.md5()
    for pdf in pdf_files:
        name = pdf['name'] if isinstance(pdf, dict) else pdf.name
        hasher.update(name.encode())
        if isinstance(pdf, dict) and 'path' in pdf:
            mtime = os.path.getmtime(pdf['path'])
            hasher.update(str(mtime).encode())
    today = datetime.now().strftime("%Y%m%d")
    hasher.update(today.encode())
    return hasher.hexdigest()

# Session state initialization
def init_state():
    if not state['chat_history']:
        state['chat_history'] = []
    if not state['db_id']:
        state['db_id'] = None
    if not state['processed_files']:
        state['processed_files'] = []
    if not state['messages']:
        state['messages'] = [
            {"role": "assistant", "content": "Welcome to FinGraph RAG! Ask about documents or financial analysis.", "feedback": None}
        ]
    if not state['conversation_context']:
        state['conversation_context'] = []
    if not state['financial_cache']:
        state['financial_cache'] = {}
    if not state['graph_initialized']:
        state['graph_initialized'] = False

def add_to_chat(role, content, timestamp=None):
    if timestamp is None:
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    state['chat_history'].append({"role": role, "content": content, "timestamp": timestamp})
    state['messages'].append({"role": role, "content": content, "feedback": None})

def display_chat():
    return state['messages']

def clear_chat():
    state['chat_history'] = []
    state['messages'] = [
        {"role": "assistant", "content": "Welcome to FinGraph RAG! Ask about documents or financial analysis.", "feedback": None}
    ]
    state['conversation_context'] = []

# RAG and GraphRAG Response Generation
def prepare_system_context(user_message):
    ticker_symbols = extract_ticker_symbols(user_message)
    sectors_mentioned = [sector for sector in SECTORS.keys() if sector.lower() in user_message.lower()]
    risk_profile = None
    if "conservative" in user_message.lower() or "low risk" in user_message.lower():
        risk_profile = "conservative"
    elif "aggressive" in user_message.lower() or "high risk" in user_message.lower():
        risk_profile = "aggressive"
    elif "balanced" in user_message.lower() or "moderate" in user_message.lower():
        risk_profile = "balanced"

    financial_data = []
    if ticker_symbols:
        for ticker in ticker_symbols:
            company_details = get_company_details(ticker)
            if company_details:
                financial_data.append({"type": "company", "details": company_details})
    if sectors_mentioned:
        for sector in sectors_mentioned:
            sector_details = get_sector_details(sector)
            if sector_details:
                financial_data.append({"type": "sector", "details": sector_details})

    financial_context = json.dumps(financial_data, indent=2) if financial_data else "No specific financial data found."

    prompt_type = "general"
    if any(term in user_message.lower() for term in ["trend", "performance", "market", "stock price"]):
        prompt_type = "market_trend"
    elif any(term in user_message.lower() for term in ["forecast", "projection", "predict", "future"]):
        prompt_type = "financial_projection"
    elif any(term in user_message.lower() for term in ["invest", "recommendation", "portfolio", "strategy", "risk"]):
        prompt_type = "investment_strategy"

    if prompt_type == "market_trend":
        base_context = f"""
        You are FinGraph's market trend analysis expert. Provide detailed insights on market trends, sector performance, and company comparisons.
        Structured analysis should include:
        1. OVERVIEW: Summarize overall market or sector performance
        2. KEY TRENDS: Highlight significant patterns
        3. COMPARATIVE ANALYSIS: Compare companies or sectors
        4. CONTEXT FACTORS: Discuss external factors
        5. OUTLOOK: Provide a short-term outlook
        Financial Data from Neo4j: {financial_context}
        """
    elif prompt_type == "financial_projection":
        base_context = f"""
        You are FinGraph's financial projection specialist. Create forecasts.
        Your projection should include:
        1. BASELINE ASSESSMENT: Current financial position
        2. GROWTH PROJECTIONS: Revenue, profit margin, EPS
        3. RISK FACTORS: Potential challenges
        4. SENSITIVITY ANALYSIS: Scenario impacts
        5. KEY PERFORMANCE INDICATORS: Metrics to monitor
        Financial Data from Neo4j: {financial_context}
        """
    elif prompt_type == "investment_strategy":
        base_context = f"""
        You are FinGraph's investment strategy advisor. Provide recommendations.
        Your recommendations should include:
        1. INVESTMENT THESIS: Core rationale
        2. ASSET ALLOCATION: Portfolio distribution
        3. SPECIFIC OPPORTUNITIES: Securities or sectors
        4. RISK MANAGEMENT: Mitigate downside
        5. TIMELINE: Investment horizon
        Financial Data from Neo4j: {financial_context}
        """
    else:
        base_context = f"""
        You are FinGraph, a financial analysis assistant. Provide insights on companies, sectors, trends, and strategies.
        Financial Data from Neo4j: {financial_context}
        """

    conversation_history = ""
    if state['conversation_context']:
        conversation_history = "\nPrevious conversation:\n" + "\n".join(
            [f"{msg['role']}: {msg['content']}" for msg in state['conversation_context'][-5:]]
        )

    return base_context + conversation_history

def generate_response(user_message, vector_db, model_instance, model_name, temp, top_p, max_tokens, context_window):
    is_financial_query = any(
        term in user_message.lower() for term in
        ["market", "trend", "stock", "financial", "investment", "sector", "company", "ticker"] + list(SECTORS.keys())
    ) or bool(extract_ticker_symbols(user_message))

    is_document_query = any(
        term in user_message.lower() for term in
        ["document", "pdf", "report", "annual", "file", "page"]
    )

    response_text = ""

    if is_financial_query and model_name.startswith("llama"):
        system_context = prepare_system_context(user_message)
        state['conversation_context'].append({"role": "user", "content": user_message})
        try:
            response = groq_client.chat.completions.create(
                model=model_name,
                messages=[{"role": "system", "content": system_context}, {"role": "user", "content": user_message}],
                temperature=temp,
                max_tokens=max_tokens
            )
            response_text = response.choices[0].message.content
            state['conversation_context'].append({"role": "assistant", "content": response_text})
        except Exception as e:
            response_text += f"Error processing financial query: {str(e)}"

    if is_document_query:
        # Without FAISS, we'll use a simple context from processed files if available
        if state['processed_files']:
            doc_context = "Processed document context is available but not searchable in detail without specific content."
            try:
                response = model_instance.generate_content(f"{doc_context}\nQuestion: {user_message}")
                doc_response = response.text
                url_pattern = r'(https?://[^\s\)]+)'
                doc_response = re.sub(url_pattern, r'[\1](\1)', doc_response)
                response_text += f"\nDocument-based response:\n{doc_response}"
            except Exception as e:
                response_text += f"\nError processing document query: {str(e)}"
        else:
            response_text += "\nNo documents have been processed to provide context for this query."

    if not response_text:
        combined_context = prepare_system_context(user_message)
        try:
            if model_name.startswith("llama"):
                response = groq_client.chat.completions.create(
                    model=model_name,
                    messages=[{"role": "system", "content": combined_context or "General assistant"}, {"role": "user", "content": user_message}],
                    temperature=temp,
                    max_tokens=max_tokens
                )
                response_text = response.choices[0].message.content
            else:
                response = model_instance.generate_content(f"{combined_context}\nQuestion: {user_message}")
                response_text = response.text
        except Exception as e:
            response_text = f"Error processing query: {str(e)}"

    return response_text.strip()

# Pydantic Models for Request/Response
class ModelOptions(BaseModel):
    model_name: str = "gemini-1.5-flash"
    temperature: float = 0.5
    top_p: float = 0.95
    max_tokens: int = 2048
    context_window: int = 3

class ProcessDocumentsRequest(BaseModel):
    action: str = "Process New Documents"
    chunk_size: int = 1000
    chunk_overlap: int = 200
    force_reindex: bool = False
    skip_empty_pdfs: bool = True

class ChatRequest(BaseModel):
    prompt: str
    model_options: ModelOptions

class SearchCompaniesRequest(BaseModel):
    search_text: str
    limit: int = 5

def app_cleanup():
    driver.close()

atexit.register(app_cleanup)