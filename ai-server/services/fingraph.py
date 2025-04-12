from neo4j import GraphDatabase
import streamlit as st
import os
from dotenv import load_dotenv
from groq import Groq
import yfinance as yf
import pandas as pd
import numpy as np
import json
from datetime import datetime, timedelta
import time
from functools import lru_cache
import matplotlib.pyplot as plt
from io import BytesIO

# Load environment variables
load_dotenv()

# Initialize Neo4j driver
neo4j_uri='neo4j+s://3cc9d5ce.databases.neo4j.io'
neo4j_username='neo4j'
neo4j_password='xDJ5VrnOeShnlpwplUZoFMMxNFbQXmmUmn8vAKSCRCk'

# Use connection pooling with optimal settings
driver = GraphDatabase.driver(
    neo4j_uri, 
    auth=(neo4j_username, neo4j_password),
    max_connection_lifetime=3600,  # 1 hour connection lifetime
    max_connection_pool_size=50,   # Increase connection pool size
    connection_acquisition_timeout=60
)

# Initialize Groq client
groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))

# Define sectors and companies
# Define sectors and companies
SECTORS = {
    "Technology": ["AAPL", "MSFT", "GOOGL", "META", "NVDA", "ADBE", "INTC", "CSCO", "ORCL", "IBM"],
    "Healthcare": ["JNJ", "PFE", "UNH", "ABBV", "MRK", "AMGN", "GILD", "BMY", "TMO", "DHR"],
    "Manufacturing": ["GE", "CAT", "BA", "MMM", "HON", "DE", "LMT", "RTX", "GD", "ITW"],
    "Finance": ["JPM", "BAC", "GS", "MS", "C", "WFC", "BLK", "SCHW", "AXP", "PYPL"],
    "Consumer Goods": ["PG", "KO", "PEP", "NKE", "UL", "MDLZ", "CL", "EL", "KMB", "STZ"],
    "Retail": ["WMT", "AMZN", "TGT", "HD", "LOW", "COST", "MCD", "SBUX", "TJX", "NKE"],
    "Energy": ["XOM", "CVX", "COP", "SLB", "EOG", "PSX", "VLO", "MPC", "OXY", "DVN"],
    "Telecommunications": ["T", "VZ", "TMUS", "CMCSA", "DIS", "CHTR", "VOD", "ORAN", "TEF", "AMX"],
    "Utilities": ["NEE", "DUK", "SO", "D", "AEP", "EXC", "SRE", "PEG", "ED", "EIX"],
    "Real Estate": ["AMT", "PLD", "EQIX", "CCI", "PSA", "SPG", "AVB", "WELL", "DLR", "O"],
    "Biotechnology": ["AMGN", "GILD", "VRTX", "REGN", "BIIB", "MRNA", "BNTX", "ALXN", "INCY", "ILMN"],
    "Automotive": ["TSLA", "F", "GM", "TM", "HMC", "STLA", "VWAGY", "RACE", "NIO", "LI"],
    "Aerospace & Defense": ["BA", "LMT", "RTX", "GD", "NOC", "LHX", "TXT", "HII", "BWXT", "KTOS"],
    "Semiconductors": ["NVDA", "INTC", "TSM", "AMD", "QCOM", "AVGO", "TXN", "ASML", "MU", "LRCX"],
    "Entertainment": ["DIS", "NFLX", "WBD", "PARA", "SONY", "RBLX", "EA", "TTWO", "ATVI", "LYV"]
}

# Financial metrics to track
FINANCIAL_METRICS = [
    "Revenue", "NetIncome", "GrossMargin", "OperatingMargin", 
    "ROE", "DebtToEquity", "CurrentRatio", "CashFlow",
    "PriceToEarnings", "DividendYield"
]

# Streamlit page configuration
st.set_page_config(page_title="FinGraph - Financial Analysis RAG", layout="wide")
st.title("FinGraph - Financial Analysis RAG")
st.sidebar.markdown("## FinGraph Analysis Tool")

# Session state initialization
if "messages" not in st.session_state:
    st.session_state.messages = [
        {"role": "assistant", "content": "Welcome to FinGraph! I'm your financial analysis assistant. Ask me about market trends, company financials, or investment strategies.", "feedback": None}
    ]

if "conversation_context" not in st.session_state:
    st.session_state.conversation_context = []

if "financial_cache" not in st.session_state:
    st.session_state.financial_cache = {}

if "graph_initialized" not in st.session_state:
    st.session_state.graph_initialized = False

# Neo4j Graph Database Management
def create_graph_schema():
    """Create the Neo4j graph schema for financial data"""
    with driver.session() as session:
        # Sector nodes
        session.run("""
        CREATE CONSTRAINT sector_name IF NOT EXISTS
        FOR (s:Sector) REQUIRE s.name IS UNIQUE
        """)
        
        # Company nodes
        session.run("""
        CREATE CONSTRAINT company_ticker IF NOT EXISTS
        FOR (c:Company) REQUIRE c.ticker IS UNIQUE
        """)
        
        # Financial metrics
        session.run("""
        CREATE CONSTRAINT metric_id IF NOT EXISTS
        FOR (m:Metric) REQUIRE m.id IS UNIQUE
        """)
        
        # Create indexes for text search
        session.run("""
        CREATE INDEX company_search IF NOT EXISTS
        FOR (c:Company) ON (c.name, c.description, c.ticker, c.industry)
        """)
        
        session.run("""
        CREATE INDEX sector_search IF NOT EXISTS
        FOR (s:Sector) ON (s.name, s.description)
        """)

def search_companies_by_query(search_text, limit=5):
    """Search companies by keyword using standard index"""
    query = """
    MATCH (c:Company)
    WHERE toLower(c.name) CONTAINS toLower($search_text)
       OR toLower(c.industry) CONTAINS toLower($search_text)
       OR toLower(c.ticker) CONTAINS toLower($search_text)
       OR toLower(c.description) CONTAINS toLower($search_text)
    RETURN c.ticker AS ticker,
           c.name AS name,
           c.industry AS industry,
           c.description AS description
    LIMIT $limit
    """
    
    return query_neo4j(query, {"search_text": search_text, "limit": limit})
    
def clear_graph_database():
    """Clear all data from the graph database"""
    with driver.session() as session:
        session.run("MATCH (n) DETACH DELETE n")
    st.session_state.graph_initialized = False

def initialize_graph_database():
    """Initialize the graph database with sectors and companies"""
    # Create schema
    create_graph_schema()
    
    # Load sector metadata (descriptions)
    sector_descriptions = {
        "Technology": "Companies involved in the research, development, or distribution of technologically based goods and services.",
        "Healthcare": "Companies that provide medical services, manufacture medical equipment or drugs, provide medical insurance, or facilitate healthcare delivery.",
        "Manufacturing": "Companies that convert raw materials into finished products through various processes.",
        "Finance": "Companies that provide financial services to commercial and retail customers."
    }
    
    # Create sector nodes
    with driver.session() as session:
        for sector_name, description in sector_descriptions.items():
            session.run("""
            MERGE (s:Sector {name: $name})
            SET s.description = $description
            """, {"name": sector_name, "description": description})
    
    # Fetch company data and create company nodes
    with st.spinner("Initializing graph database with financial data..."):
        for sector, tickers in SECTORS.items():
            for ticker in tickers:
                try:
                    # Fetch company info
                    company_info = yf.Ticker(ticker).info
                    
                    # Extract relevant company data
                    company_data = {
                        "ticker": ticker,
                        "name": company_info.get("shortName", ticker),
                        "sector": sector,
                        "industry": company_info.get("industry", "Unknown"),
                        "description": company_info.get("longBusinessSummary", "No description available"),
                        "marketCap": company_info.get("marketCap", 0),
                        "employees": company_info.get("fullTimeEmployees", 0)
                    }
                    
                    # Create company node
                    with driver.session() as session:
                        session.run("""
                        MERGE (c:Company {ticker: $ticker})
                        SET c.name = $name,
                            c.industry = $industry,
                            c.description = $description,
                            c.marketCap = $marketCap,
                            c.employees = $employees
                        WITH c
                        MATCH (s:Sector {name: $sector})
                        MERGE (c)-[:BELONGS_TO]->(s)
                        """, {**company_data, "sector": sector})
                    
                    # Fetch financial data
                    financials = fetch_company_financials(ticker)
                    
                    # Store financial metrics in the graph
                    with driver.session() as session:
                        for metric_name, metric_value in financials.items():
                            if metric_value is not None:
                                metric_id = f"{ticker}_{metric_name}"
                                session.run("""
                                MATCH (c:Company {ticker: $ticker})
                                MERGE (m:Metric {id: $metric_id})
                                SET m.name = $metric_name,
                                    m.value = $metric_value,
                                    m.timestamp = timestamp()
                                MERGE (c)-[:HAS_METRIC]->(m)
                                """, {
                                    "ticker": ticker, 
                                    "metric_id": metric_id,
                                    "metric_name": metric_name,
                                    "metric_value": metric_value
                                })
                    
                    # Fetch historical price data
                    historical_data = fetch_historical_data(ticker)
                    
                    # Store historical price points
                    with driver.session() as session:
                        for date_str, price in historical_data.items():
                            price_id = f"{ticker}_price_{date_str}"
                            session.run("""
                            MATCH (c:Company {ticker: $ticker})
                            MERGE (p:Price {id: $price_id})
                            SET p.date = $date,
                                p.value = $price
                            MERGE (c)-[:HAS_PRICE]->(p)
                            """, {
                                "ticker": ticker,
                                "price_id": price_id,
                                "date": date_str,
                                "price": price
                            })
                    
                    # Add competitors relationships based on sector
                    with driver.session() as session:
                        session.run("""
                        MATCH (c1:Company {ticker: $ticker})
                        MATCH (c2:Company)
                        WHERE c2.ticker <> $ticker
                        AND (c1)-[:BELONGS_TO]->(:Sector)<-[:BELONGS_TO]-(c2)
                        MERGE (c1)-[:COMPETES_WITH]->(c2)
                        """, {"ticker": ticker})
                    
                    time.sleep(0.5)  # Avoid rate limiting
                
                except Exception as e:
                    st.warning(f"Error processing {ticker}: {str(e)}")
                    continue
    
    st.session_state.graph_initialized = True
    st.success("Graph database initialized with financial data!")

@lru_cache(maxsize=100)
def fetch_company_financials(ticker):
    """Fetch key financial metrics for a company"""
    try:
        company = yf.Ticker(ticker)
        
        # Get income statement
        income_stmt = company.income_stmt
        
        # Get balance sheet
        balance_sheet = company.balance_sheet
        
        # Get cash flow
        cash_flow = company.cashflow
        
        # Get recent stats
        info = company.info
        
        # Compute financial metrics
        financials = {}
        
        # Revenue (Total Revenue)
        if not income_stmt.empty and "Total Revenue" in income_stmt.index:
            financials["Revenue"] = float(income_stmt.loc["Total Revenue"].iloc[0])
        
        # Net Income
        if not income_stmt.empty and "Net Income" in income_stmt.index:
            financials["NetIncome"] = float(income_stmt.loc["Net Income"].iloc[0])
        
        # Gross Margin
        if not income_stmt.empty and "Total Revenue" in income_stmt.index and "Gross Profit" in income_stmt.index:
            revenue = income_stmt.loc["Total Revenue"].iloc[0]
            gross_profit = income_stmt.loc["Gross Profit"].iloc[0]
            if revenue > 0:
                financials["GrossMargin"] = float(gross_profit / revenue * 100)
        
        # Operating Margin
        if not income_stmt.empty and "Total Revenue" in income_stmt.index and "Operating Income" in income_stmt.index:
            revenue = income_stmt.loc["Total Revenue"].iloc[0]
            operating_income = income_stmt.loc["Operating Income"].iloc[0]
            if revenue > 0:
                financials["OperatingMargin"] = float(operating_income / revenue * 100)
        
        # Return on Equity (ROE)
        if not income_stmt.empty and not balance_sheet.empty and "Net Income" in income_stmt.index and "Stockholders Equity" in balance_sheet.index:
            net_income = income_stmt.loc["Net Income"].iloc[0]
            equity = balance_sheet.loc["Stockholders Equity"].iloc[0]
            if equity > 0:
                financials["ROE"] = float(net_income / equity * 100)
        
        # Debt to Equity
        if not balance_sheet.empty and "Total Debt" in balance_sheet.index and "Stockholders Equity" in balance_sheet.index:
            total_debt = balance_sheet.loc["Total Debt"].iloc[0] if "Total Debt" in balance_sheet.index else balance_sheet.loc["Long Term Debt"].iloc[0]
            equity = balance_sheet.loc["Stockholders Equity"].iloc[0]
            if equity > 0:
                financials["DebtToEquity"] = float(total_debt / equity)
        
        # Current Ratio
        if not balance_sheet.empty and "Current Assets" in balance_sheet.index and "Current Liabilities" in balance_sheet.index:
            current_assets = balance_sheet.loc["Current Assets"].iloc[0]
            current_liabilities = balance_sheet.loc["Current Liabilities"].iloc[0]
            if current_liabilities > 0:
                financials["CurrentRatio"] = float(current_assets / current_liabilities)
        
        # Cash Flow from Operations
        if not cash_flow.empty and "Operating Cash Flow" in cash_flow.index:
            financials["CashFlow"] = float(cash_flow.loc["Operating Cash Flow"].iloc[0])
        
        # P/E Ratio
        if "trailingPE" in info:
            financials["PriceToEarnings"] = float(info["trailingPE"])
        
        # Dividend Yield
        if "dividendYield" in info and info["dividendYield"] is not None:
            financials["DividendYield"] = float(info["dividendYield"] * 100)
        
        return financials
    
    except Exception as e:
        st.warning(f"Error fetching financials for {ticker}: {str(e)}")
        return {}

@lru_cache(maxsize=50)
def fetch_historical_data(ticker, period="1y", interval="1mo"):
    """Fetch historical price data for a company"""
    try:
        data = yf.download(ticker, period=period, interval=interval, progress=False)
        
        if data.empty:
            return {}
        
        # Format data as date -> price dictionary
        historical_prices = {}
        for date, row in data.iterrows():
            date_str = date.strftime("%Y-%m-%d")
            historical_prices[date_str] = float(row["Close"])
        
        return historical_prices
    
    except Exception as e:
        st.warning(f"Error fetching historical data for {ticker}: {str(e)}")
        return {}

# Neo4j Graph Query Functions
def query_neo4j(query, parameters=None):
    """Execute Neo4j query"""
    if parameters is None:
        parameters = {}
    
    with driver.session() as session:
        result = session.run(query, parameters)
        return [record.data() for record in result]

def get_company_details(ticker):
    """Get complete company details"""
    if ticker in st.session_state.financial_cache:
        return st.session_state.financial_cache[ticker]
    
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
    
    RETURN c.ticker AS ticker,
           c.name AS name,
           c.industry AS industry,
           c.description AS description,
           c.marketCap AS marketCap,
           c.employees AS employees,
           s.name AS sector,
           metrics,
           prices,
           competitors
    """
    
    results = query_neo4j(query, {"ticker": ticker})
    
    if results:
        # Cache the result
        st.session_state.financial_cache[ticker] = results[0]
        return results[0]
    return None

def get_sector_details(sector_name):
    """Get complete sector details with companies"""
    query = """
    MATCH (s:Sector {name: $sector_name})
    OPTIONAL MATCH (s)<-[:BELONGS_TO]-(c:Company)
    OPTIONAL MATCH (c)-[:HAS_METRIC]->(m:Metric)
    
    WITH s, c, COLLECT(DISTINCT {name: m.name, value: m.value}) AS company_metrics
    WITH s, COLLECT(DISTINCT {
        ticker: c.ticker, 
        name: c.name, 
        industry: c.industry,
        marketCap: c.marketCap,
        metrics: company_metrics
    }) AS companies
    
    RETURN s.name AS name,
           s.description AS description,
           companies
    """
    
    results = query_neo4j(query, {"sector_name": sector_name})
    
    if results:
        return results[0]
    return None

def search_companies_by_query(search_text, limit=5):
    """Search companies by keyword using full-text search"""
    query = """
    CALL db.index.fulltext.queryNodes("companySearch", $search_text) 
    YIELD node, score
    RETURN node.ticker AS ticker,
           node.name AS name,
           node.industry AS industry,
           node.description AS description,
           score
    ORDER BY score DESC
    LIMIT $limit
    """
    
    results = query_neo4j(query, {"search_text": search_text, "limit": limit})
    
    if results:
        return results
    
    # Fallback to fuzzy string matching if full-text search returns nothing
    fallback_query = """
    MATCH (c:Company)
    WHERE toLower(c.name) CONTAINS toLower($search_text) 
       OR toLower(c.industry) CONTAINS toLower($search_text)
       OR toLower(c.ticker) CONTAINS toLower($search_text)
    RETURN c.ticker AS ticker,
           c.name AS name,
           c.industry AS industry,
           c.description AS description
    LIMIT $limit
    """
    
    return query_neo4j(fallback_query, {"search_text": search_text, "limit": limit})

def get_companies_in_sector(sector_name, limit=10):
    """Get companies in a specific sector"""
    query = """
    MATCH (c:Company)-[:BELONGS_TO]->(s:Sector {name: $sector_name})
    OPTIONAL MATCH (c)-[:HAS_METRIC]->(m:Metric WHERE m.name = 'MarketCap')
    RETURN c.ticker AS ticker,
           c.name AS name,
           c.industry AS industry,
           c.marketCap AS marketCap
    ORDER BY c.marketCap DESC
    LIMIT $limit
    """
    
    return query_neo4j(query, {"sector_name": sector_name, "limit": limit})

def get_market_trends(sector_name=None, period="1y"):
    """Get market trends for a sector or overall market"""
    if sector_name:
        query = """
        MATCH (s:Sector {name: $sector_name})<-[:BELONGS_TO]-(c:Company)-[:HAS_PRICE]->(p:Price)
        WITH c.ticker AS ticker, c.name AS name, p.date AS date, p.value AS price
        ORDER BY date
        RETURN ticker, name, COLLECT({date: date, price: price}) AS prices
        """
        results = query_neo4j(query, {"sector_name": sector_name})
    else:
        query = """
        MATCH (c:Company)-[:HAS_PRICE]->(p:Price)
        WITH c.ticker AS ticker, c.name AS name, p.date AS date, p.value AS price
        ORDER BY date
        RETURN ticker, name, COLLECT({date: date, price: price}) AS prices
        """
        results = query_neo4j(query)
    
    return results

def get_financial_metrics_comparison(ticker_list):
    """Compare financial metrics across companies"""
    # Convert list to string for Cypher query
    tickers_param = ticker_list
    
    query = """
    MATCH (c:Company)
    WHERE c.ticker IN $tickers
    OPTIONAL MATCH (c)-[:HAS_METRIC]->(m:Metric)
    
    WITH c.ticker AS ticker, c.name AS name, 
         COLLECT({name: m.name, value: m.value}) AS metrics
    
    RETURN ticker, name, metrics
    """
    
    return query_neo4j(query, {"tickers": tickers_param})

def get_investment_recommendations(risk_profile="balanced", sector_focus=None):
    """Get investment recommendations based on risk profile and sector focus"""
    # Different query strategies based on risk profile
    if risk_profile.lower() == "conservative":
        # For conservative - focus on dividend yield and low debt
        if sector_focus:
            query = """
            MATCH (c:Company)-[:BELONGS_TO]->(s:Sector {name: $sector_focus})
            MATCH (c)-[:HAS_METRIC]->(m1:Metric {name: 'DividendYield'})
            MATCH (c)-[:HAS_METRIC]->(m2:Metric {name: 'DebtToEquity'})
            WHERE m1.value > 2.0 AND m2.value < 0.5
            RETURN c.ticker AS ticker, 
                   c.name AS name,
                   m1.value AS dividend_yield,
                   m2.value AS debt_to_equity,
                   c.marketCap AS market_cap
            ORDER BY m1.value DESC
            LIMIT 5
            """
            params = {"sector_focus": sector_focus}
        else:
            query = """
            MATCH (c:Company)
            MATCH (c)-[:HAS_METRIC]->(m1:Metric {name: 'DividendYield'})
            MATCH (c)-[:HAS_METRIC]->(m2:Metric {name: 'DebtToEquity'})
            WHERE m1.value > 2.0 AND m2.value < 0.5
            RETURN c.ticker AS ticker, 
                   c.name AS name,
                   m1.value AS dividend_yield,
                   m2.value AS debt_to_equity,
                   c.marketCap AS market_cap
            ORDER BY m1.value DESC
            LIMIT 5
            """
            params = {}
    
    elif risk_profile.lower() == "aggressive":
        # For aggressive - focus on growth metrics
        if sector_focus:
            query = """
            MATCH (c:Company)-[:BELONGS_TO]->(s:Sector {name: $sector_focus})
            MATCH (c)-[:HAS_METRIC]->(m:Metric {name: 'GrossMargin'})
            WHERE m.value > 30.0
            RETURN c.ticker AS ticker, 
                   c.name AS name,
                   m.value AS gross_margin,
                   c.marketCap AS market_cap
            ORDER BY m.value DESC
            LIMIT 5
            """
            params = {"sector_focus": sector_focus}
        else:
            query = """
            MATCH (c:Company)
            MATCH (c)-[:HAS_METRIC]->(m:Metric {name: 'GrossMargin'})
            WHERE m.value > 30.0
            RETURN c.ticker AS ticker, 
                   c.name AS name,
                   m.value AS gross_margin,
                   c.marketCap AS market_cap
            ORDER BY m.value DESC
            LIMIT 5
            """
            params = {}
    
    else:  # Balanced
        # For balanced - mix of metrics
        if sector_focus:
            query = """
            MATCH (c:Company)-[:BELONGS_TO]->(s:Sector {name: $sector_focus})
            MATCH (c)-[:HAS_METRIC]->(m1:Metric {name: 'ROE'})
            MATCH (c)-[:HAS_METRIC]->(m2:Metric {name: 'PriceToEarnings'})
            WHERE m1.value > 15.0 AND m2.value < 25.0
            RETURN c.ticker AS ticker, 
                   c.name AS name,
                   m1.value AS roe,
                   m2.value AS pe_ratio,
                   c.marketCap AS market_cap
            ORDER BY m1.value DESC
            LIMIT 5
            """
            params = {"sector_focus": sector_focus}
        else:
            query = """
            MATCH (c:Company)
            MATCH (c)-[:HAS_METRIC]->(m1:Metric {name: 'ROE'})
            MATCH (c)-[:HAS_METRIC]->(m2:Metric {name: 'PriceToEarnings'})
            WHERE m1.value > 15.0 AND m2.value < 25.0
            RETURN c.ticker AS ticker, 
                   c.name AS name,
                   m1.value AS roe,
                   m2.value AS pe_ratio,
                   c.marketCap AS market_cap
            ORDER BY m1.value DESC
            LIMIT 5
            """
            params = {}
    
    return query_neo4j(query, params)

# Extract ticker symbols from message
def extract_ticker_symbols(message):
    """Extract potential ticker symbols from user message"""
    import re
    
    # Pattern: $TICKER or uppercase 1-5 letter words
    ticker_pattern = r'\$([A-Z]{1,5})\b|\b([A-Z]{1,5})\b'
    matches = re.findall(ticker_pattern, message)
    
    # Flatten and filter results
    tickers = [match[0] if match[0] else match[1] for match in matches]
    
    # Filter out common English words
    common_words = ["I", "A", "AN", "THE", "AS", "IS", "IN", "ON", "AT", "TO", "FOR"]
    tickers = [ticker for ticker in tickers if ticker not in common_words]
    
    return list(set(tickers))  # Remove duplicates

# Enhanced GraphRAG system context preparation
def prepare_system_context(user_message):
    # Extract ticker symbols from message
    ticker_symbols = extract_ticker_symbols(user_message)
    
    # Look for sector mentions
    sectors_mentioned = []
    for sector in SECTORS.keys():
        if sector.lower() in user_message.lower():
            sectors_mentioned.append(sector)
    
    # Identify risk profile mentions
    risk_profile = None
    if "conservative" in user_message.lower() or "low risk" in user_message.lower():
        risk_profile = "conservative"
    elif "aggressive" in user_message.lower() or "high risk" in user_message.lower():
        risk_profile = "aggressive"
    elif "balanced" in user_message.lower() or "moderate" in user_message.lower():
        risk_profile = "balanced"
    
    # Gather financial data based on extracted entities
    financial_data = []
    
    # Process ticker symbols
    if ticker_symbols:
        for ticker in ticker_symbols:
            company_details = get_company_details(ticker)
            if company_details:
                financial_data.append({
                    "type": "company",
                    "details": company_details
                })
    
    # Process sectors
    if sectors_mentioned:
        for sector in sectors_mentioned:
            sector_details = get_sector_details(sector)
            if sector_details:
                financial_data.append({
                    "type": "sector",
                    "details": sector_details
                })
    
    # If risk profile is mentioned, add investment recommendations
    if risk_profile:
        sector_focus = sectors_mentioned[0] if sectors_mentioned else None
        recommendations = get_investment_recommendations(risk_profile, sector_focus)
        if recommendations:
            financial_data.append({
                "type": "recommendations",
                "risk_profile": risk_profile,
                "sector_focus": sector_focus,
                "recommendations": recommendations
            })
    
    # Format financial data for RAG context
    financial_context = json.dumps(financial_data, indent=2) if financial_data else "No specific financial data found."
    
    # Determine prompt type based on user query
    prompt_type = "general"
    if any(term in user_message.lower() for term in ["trend", "performance", "market", "stock price"]):
        prompt_type = "market_trend"
    elif any(term in user_message.lower() for term in ["forecast", "projection", "predict", "future"]):
        prompt_type = "financial_projection"
    elif any(term in user_message.lower() for term in ["invest", "recommendation", "portfolio", "strategy", "risk"]):
        prompt_type = "investment_strategy"
    
    # Create specialized prompt based on detected type
    if prompt_type == "market_trend":
        base_context = f"""
        You are FinGraph's market trend analysis expert. Provide detailed insights on market trends, sector performance, and company comparisons.
        
        Structured analysis should include:
        1. OVERVIEW: Summarize overall market or sector performance
        2. KEY TRENDS: Highlight significant patterns, including growth rates, volatility, and relative performance
        3. COMPARATIVE ANALYSIS: Compare different companies or sectors
        4. CONTEXT FACTORS: Discuss external factors influencing trends (economic indicators, interest rates, inflation)
        5. OUTLOOK: Provide a short-term outlook based on the trends analyzed
        
        Financial Data from Neo4j Graph Database:
        {financial_context}
        
        Format your response as a professional market analysis report with clear sections. Be specific with numbers and percentages.
        Use bullet points for key metrics.
        """
    
    elif prompt_type == "financial_projection":
        base_context = f"""
        You are FinGraph's financial projection specialist. Create company-specific or sector-based financial forecasts.
        
        Your projection should include:
        1. BASELINE ASSESSMENT: Current financial position summary
        2. GROWTH PROJECTIONS: Revenue, profit margin, and EPS forecasts
        3. RISK FACTORS: Potential challenges to financial targets
        4. SENSITIVITY ANALYSIS: How different scenarios might impact projections
        5. KEY PERFORMANCE INDICATORS: Metrics to monitor over the forecast period
        
        Financial Data from Neo4j Graph Database:
        {financial_context}
        
        Present projections in a structured format with clear time horizons (quarterly/annually). Include numeric projections where possible,
        but acknowledge uncertainty. Explain the methodology behind your projections.
        """
    
    elif prompt_type == "investment_strategy":
        base_context = f"""
        You are FinGraph's investment strategy advisor. Provide actionable investment recommendations based on financial data and user risk preferences.
        
        Your recommendations should include:
        1. INVESTMENT THESIS: Core rationale behind recommendations
        2. ASSET ALLOCATION: Suggested portfolio distribution
        3. SPECIFIC OPPORTUNITIES: Individual securities or sectors with potential
        4. RISK MANAGEMENT: How to mitigate potential downside
        5. TIMELINE: Expected investment horizon and milestones
        
        Financial Data from Neo4j Graph Database:
        {financial_context}
        
        Tailor advice to the user's risk profile if mentioned. Present a clear, prioritized strategy rather than overwhelming options.
        Acknowledge market uncertainties while providing decisive recommendations.
        """
    
    else:  # General financial analysis
        base_context = f"""
        You are FinGraph, a sophisticated financial analysis assistant. Provide helpful insights on companies, sectors, market trends, and investment strategies.
        
        When responding:
        1. Use precise financial terminology correctly
        2. Include relevant metrics and numbers from the data provided
        3. Structure responses logically with clear sections
        4. Provide context for technical concepts
        5. Be balanced in analysis, acknowledging both opportunities and risks
        
        Financial Data from Neo4j Graph Database:
        {financial_context}
        
        Base your analysis on the provided data while drawing on general financial knowledge. If specific data points are missing, acknowledge this and provide analysis based on available information. Avoid making specific buy/sell recommendations without sufficient data.
        """
    
    # Add previous conversation context for continuity
    conversation_history = ""
    if st.session_state.conversation_context:
        conversation_history = "\nPrevious conversation:\n" + "\n".join(
            [f"{msg['role']}: {msg['content']}" for msg in st.session_state.conversation_context[-5:]]
        )
    
    return base_context + conversation_history

# Generate response using Groq LLM
def generate_response(user_message):
    """Generate response using Groq AI models with RAG context"""
    try:
        # Prepare system context with financial data
        system_context = prepare_system_context(user_message)
        
        # Update conversation context
        st.session_state.conversation_context.append({"role": "user", "content": user_message})
        
        # Generate response with Groq
        response = groq_client.chat.completions.create(
            model="llama3-8b-8192",  # or llama2-70b-4096
            messages=[
                {"role": "system", "content": system_context},
                {"role": "user", "content": user_message}
            ],
            temperature=0.5,
            max_tokens=2048
        )
        
        # Extract and return the response
        assistant_response = response.choices[0].message.content
        
        # Update conversation context
        st.session_state.conversation_context.append({"role": "assistant", "content": assistant_response})
        
        return assistant_response
    
    except Exception as e:
        return f"I encountered an error processing your request: {str(e)}. Please try again."

# Generate dynamic charts based on user query
def generate_chart(query_type, data):
    """Generate charts based on data and query type"""
    fig, ax = plt.subplots(figsize=(10, 6))
    
    if query_type == "stock_comparison":
        # Compare multiple stocks
        for ticker, prices in data.items():
            dates = [datetime.strptime(p['date'], '%Y-%m-%d') for p in prices]
            values = [p['value'] for p in prices]
            ax.plot(dates, values, label=ticker)
        
        ax.set_title('Stock Price Comparison')
        ax.set_xlabel('Date')
        ax.set_ylabel('Price ($)')
        ax.legend()
        ax.grid(True)
        
    elif query_type == "sector_performance":
        # Compare sector performance
        sectors = list(data.keys())
        performance = [data[s] for s in sectors]
        
        ax.bar(sectors, performance)
        ax.set_title('Sector Performance')
        ax.set_xlabel('Sector')
        ax.set_ylabel('Performance (%)')
        ax.grid(True, axis='y')
        
    elif query_type == "financial_metrics":
        # Compare financial metrics
        companies = list(data.keys())
        metrics = list(data[companies[0]].keys())
        
        bar_width = 0.2
        positions = np.arange(len(companies))
        
        for i, metric in enumerate(metrics):
            values = [data[company][metric] for company in companies]
            offset = i * bar_width
            ax.bar(positions + offset, values, bar_width, label=metric)
        
        ax.set_title('Financial Metrics Comparison')
        ax.set_xlabel('Company')
        ax.set_xticks(positions + bar_width * (len(metrics) - 1) / 2)
        ax.set_xticklabels(companies)
        ax.set_ylabel('Value')
        ax.legend()
        ax.grid(True, axis='y')
    
    # Convert plot to image and return
    buf = BytesIO()
    fig.tight_layout()
    plt.savefig(buf, format='png')
    buf.seek(0)
    plt.close(fig)
    
    return buf

# Execute chart generation from Neo4j data
def create_chart_from_query(query_type, tickers=None, sector=None):
    """Create chart from Neo4j data based on query type"""
    if query_type == "stock_comparison" and tickers:
        # Get price data for comparison
        data = {}
        for ticker in tickers:
            company_details = get_company_details(ticker)
            if company_details and 'prices' in company_details:
                data[ticker] = company_details['prices']
        
        return generate_chart("stock_comparison", data)
    
    elif query_type == "sector_performance":
        # Compare sector performance
        sectors = list(SECTORS.keys()) if not sector else [sector]
        data = {}
        
        for s in sectors:
            # Calculate average sector performance over the last year
            sector_companies = get_companies_in_sector(s)
            tickers = [company['ticker'] for company in sector_companies]
            
            if tickers:
                performance_sum = 0
                count = 0
                
                for ticker in tickers:
                    historical_data = fetch_historical_data(ticker)
                    if historical_data:
                        dates = sorted(historical_data.keys())
                        if len(dates) >= 2:
                            first_price = historical_data[dates[0]]
                            last_price = historical_data[dates[-1]]
                            if first_price > 0:
                                performance = (last_price - first_price) / first_price * 100
                                performance_sum += performance
                                count += 1
                
                if count > 0:
                    data[s] = performance_sum / count
        
        return generate_chart("sector_performance", data)
    
    elif query_type == "financial_metrics" and tickers:
        # Compare financial metrics
        metrics_to_compare = ["GrossMargin", "ROE", "DebtToEquity"]
        data = {}
        
        for ticker in tickers:
            company_details = get_company_details(ticker)
            if company_details and 'metrics' in company_details:
                data[ticker] = {}
                
                for metric in company_details['metrics']:
                    if metric['name'] in metrics_to_compare:
                        data[ticker][metric['name']] = metric['value']
        
        return generate_chart("financial_metrics", data)
    
    return None

# Sidebar for database controls and filters
with st.sidebar:
    st.header("Database Controls")
    
    if st.button("Initialize Graph Database"):
        initialize_graph_database()
    
    if st.button("Clear Graph Database"):
        clear_graph_database()
    
    st.header("Analysis Filters")
    
    # Sector filter
    selected_sector = st.selectbox(
        "Select Sector",
        ["All Sectors"] + list(SECTORS.keys())
    )
    
    # Risk profile selection
    risk_profile = st.radio(
        "Risk Profile",
        ["Conservative", "Balanced", "Aggressive"]
    )
    
    # Date range selection
    date_range = st.selectbox(
        "Time Period",
        ["1 Month", "3 Months", "6 Months", "1 Year", "2 Years", "5 Years"]
    )
    
    # Search for specific companies
    search_query = st.text_input("Search Companies", "")
    if search_query:
        search_results = search_companies_by_query(search_query)
        if search_results:
            st.subheader("Search Results")
            for result in search_results:
                st.write(f"{result['ticker']} - {result['name']}")
        else:
            st.write("No companies found matching your search.")

# Main page layout
tab1, tab2, tab3, tab4 = st.tabs(["Chat Analysis", "Market Trends", "Company Comparison", "Investment Recommendations"])

# Tab 1: Chat Analysis
with tab1:
    st.header("Financial Analysis Assistant")
    
    # Display chat messages
    for message in st.session_state.messages:
        with st.chat_message(message["role"]):
            st.markdown(message["content"])
    
    # User input
    if prompt := st.chat_input("Ask about financial analysis, market trends, or investment strategies..."):
        # Add user message to state and display
        st.session_state.messages.append({"role": "user", "content": prompt, "feedback": None})
        with st.chat_message("user"):
            st.markdown(prompt)
        
        # Generate and display response
        with st.chat_message("assistant"):
            with st.spinner("Analyzing financial data..."):
                response = generate_response(prompt)
                st.markdown(response)
        
        st.session_state.messages.append({"role": "assistant", "content": response, "feedback": None})

# Tab 2: Market Trends
with tab2:
    st.header("Market Trends Dashboard")
    
    # Controls for trend analysis
    trend_sector = st.selectbox(
        "Select Sector for Trend Analysis",
        ["All Markets"] + list(SECTORS.keys()),
        key="trend_sector"
    )
    
    trend_period = st.selectbox(
        "Select Time Period",
        ["1 Month", "3 Months", "6 Months", "1 Year"],
        index=3,
        key="trend_period"
    )
    
    if st.button("Generate Trend Analysis"):
        with st.spinner("Analyzing market trends..."):
            # Get sector for analysis
            sector_for_analysis = None if trend_sector == "All Markets" else trend_sector
            
            # Convert period to yfinance format
            period_map = {
                "1 Month": "1mo",
                "3 Months": "3mo",
                "6 Months": "6mo",
                "1 Year": "1y"
            }
            period = period_map.get(trend_period, "1y")
            
            # Create chart
            chart_image = create_chart_from_query("sector_performance", sector=sector_for_analysis)
            if chart_image:
                st.image(chart_image)
            
            # Generate text analysis of trends
            if sector_for_analysis:
                prompt = f"Analyze the performance trends in the {sector_for_analysis} sector over the past {trend_period.lower()}. What are the key drivers and outlook?"
            else:
                prompt = f"Analyze the overall market performance trends across sectors over the past {trend_period.lower()}. What are the key drivers and outlook?"
            
            with st.spinner("Generating market analysis..."):
                analysis = generate_response(prompt)
                st.markdown(analysis)

# Tab 3: Company Comparison
with tab3:
    st.header("Company Comparison Analysis")
    
    # Company ticker input
    comparison_tickers = st.text_input(
        "Enter tickers to compare (comma separated)",
        "AAPL, MSFT, GOOGL"
    )
    
    comparison_metrics = st.multiselect(
        "Select metrics to compare",
        FINANCIAL_METRICS,
        default=["Revenue", "GrossMargin", "ROE"]
    )
    
    if st.button("Compare Companies"):
        with st.spinner("Gathering company data..."):
            # Parse tickers
            tickers = [ticker.strip() for ticker in comparison_tickers.split(",")]
            
            # Generate comparison chart
            chart_image = create_chart_from_query("financial_metrics", tickers=tickers)
            if chart_image:
                st.image(chart_image)
            
            # Stock price comparison
            price_chart = create_chart_from_query("stock_comparison", tickers=tickers)
            if price_chart:
                st.subheader("Stock Price Comparison")
                st.image(price_chart)
            
            # Generate text analysis
            prompt = f"Compare the financial performance of {', '.join(tickers)} focusing on {', '.join(comparison_metrics)}. Which company shows the strongest fundamentals and why?"
            
            with st.spinner("Generating comparison analysis..."):
                analysis = generate_response(prompt)
                st.markdown(analysis)

# Tab 4: Investment Recommendations
with tab4:
    st.header("Investment Recommendations")
    
    # Investment criteria
    inv_risk_profile = st.radio(
        "Investment Risk Profile",
        ["Conservative", "Balanced", "Aggressive"],
        key="inv_risk_profile"
    )
    
    inv_sector_focus = st.selectbox(
        "Sector Focus",
        ["No Specific Focus"] + list(SECTORS.keys()),
        key="inv_sector_focus"
    )
    
    inv_time_horizon = st.selectbox(
        "Investment Time Horizon",
        ["Short Term (< 1 year)", "Medium Term (1-3 years)", "Long Term (> 3 years)"],
        key="inv_time_horizon"
    )
    
    if st.button("Generate Investment Recommendations"):
        with st.spinner("Analyzing investment opportunities..."):
            # Get sector for recommendations
            sector_for_recs = None if inv_sector_focus == "No Specific Focus" else inv_sector_focus
            
            # Get recommendations from graph
            recommendations = get_investment_recommendations(inv_risk_profile.lower(), sector_for_recs)
            
            if recommendations:
                st.subheader("Recommended Investments")
                rec_df = pd.DataFrame(recommendations)
                st.dataframe(rec_df)
            
            # Generate detailed analysis
            time_horizon_text = inv_time_horizon.split("(")[0].strip()
            if sector_for_recs:
                prompt = f"Provide detailed investment recommendations for a {inv_risk_profile.lower()} investor with a {time_horizon_text} time horizon, focusing on the {sector_for_recs} sector. Explain the rationale and key risks."
            else:
                prompt = f"Provide detailed investment recommendations for a {inv_risk_profile.lower()} investor with a {time_horizon_text} time horizon across multiple sectors. Explain the rationale and key risks."
            
            with st.spinner("Generating investment strategy..."):
                analysis = generate_response(prompt)
                st.markdown(analysis)

# Footer
st.markdown("---")
st.markdown("**FinGraph** - Financial Analysis using Neo4j Graph Database and LLM RAG")

# App cleanup on shutdown
def app_cleanup():
    """Clean up resources on app shutdown"""
    driver.close()

# Register cleanup function
import atexit
atexit.register(app_cleanup)