from fastapi import HTTPException
import requests
import base64
import uuid
from google.generativeai import GenerativeModel
import hashlib
from typing import List, Optional
from PIL import Image
import io
import faiss
import numpy as np
from sentence_transformers import SentenceTransformer
import os
from dotenv import load_dotenv

load_dotenv()

embedder = SentenceTransformer('all-MiniLM-L6-v2')
MISTRAL_API_KEY = os.getenv("MISTRAL_API_KEY")


def get_file_hash(file_content: bytes) -> str:
    """Generate a hash of the uploaded file."""
    return hashlib.sha256(file_content).hexdigest()

def extract_text_with_mistral(file_content: bytes, file_name: str, pages_to_process: List[int]) -> dict:
    """Extract text from PDF using Mistral AI OCR API"""
    api_url = "https://api.mistral.ai/v1/ocr"
    unique_id = str(uuid.uuid4())
    pdf_base64 = base64.b64encode(file_content).decode('utf-8')
    
    payload = {
        "model": "mistral-ocr-latest",
        "id": unique_id,
        "document": {
            "document_url": f"data:application/pdf;base64,{pdf_base64}",
            "document_name": file_name,
            "type": "document_url"
        },
        "pages": pages_to_process,
        "include_image_base64": True,
        "image_limit": 0,
        "image_min_size": 0
    }
    
    headers = {
        "Authorization": f"Bearer {MISTRAL_API_KEY}",
        "Content-Type": "application/json"
    }
    
    try:
        response = requests.post(api_url, headers=headers, json=payload)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=500, detail=f"Error calling Mistral OCR API: {str(e)}")

def analyze_with_gemini(text_content: str) -> str:
    """Analyze the extracted text with Google's Gemini API"""
    try:
        model = GenerativeModel('gemini-2.0-flash')
        prompt = f"""
        Analyze the following financial document and provide a detailed analysis with these sections:
        1. BUSINESS OVERVIEW
        2. KEY FINDINGS, FINANCIAL DUE DILIGENCE
        3. INCOME STATEMENT OVERVIEW
        4. BALANCE SHEET OVERVIEW
        5. ADJ EBITDA (IF DETAILED INFORMATION IS PROVIDED)
        6. ADJ WORKING CAPITAL (IF DETAILED INFORMATION IS PROVIDED)
        
        Document content:
        {text_content}
        """
        response = model.generate_content(prompt)
        return response.text
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error analyzing with Gemini: {str(e)}")

def chat_with_gemini_simple(context: str, user_query: str, image: Optional[bytes] = None) -> str:
    """Simple chat with Gemini without FAISS, with optional image."""
    try:
        model = GenerativeModel('gemini-2.0-flash')
        prompt = f"""
        Based on the following context, answer the user's query:
        
        Context:
        {context}
        
        User Query:
        {user_query}
        """
        
        if image:
            img = Image.open(io.BytesIO(image))
            content = [prompt, img]
            response = model.generate_content(content)
        else:
            response = model.generate_content(prompt)
        return response.text
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error chatting with Gemini: {str(e)}")

def chat_with_gemini_faiss(context_chunks: List[str], index: faiss.Index, full_context: str, user_query: str, image: Optional[bytes] = None, k: int = 3) -> str:
    """Chat with Gemini using FAISS to retrieve relevant context, combined with full context."""
    if not full_context or not full_context.strip():
        return "No full context available to process the query."

    if not context_chunks:
        # Fallback to full context if no chunks are available
        return chat_with_gemini_simple(full_context, user_query, image)
    
    # Adjust k to be at most the number of chunks
    k = min(k, len(context_chunks))
    if k == 0:
        # Fallback to full context if k becomes 0
        return chat_with_gemini_simple(full_context, user_query, image)
    
    query_embedding = embedder.encode([user_query], convert_to_numpy=True)
    distances, indices = index.search(query_embedding, k)  # Retrieve top-k similar chunks
    
    # Filter valid indices
    valid_indices = [i for i in indices[0] if i >= 0 and i < len(context_chunks)]
    if not valid_indices:
        # Fallback to full context if no relevant chunks are found
        return chat_with_gemini_simple(full_context, user_query, image)
    
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
        """
        
        if image:
            img = Image.open(io.BytesIO(image))
            content = [prompt, img]
            response = model.generate_content(content)
        else:
            response = model.generate_content(prompt)
        return response.text
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error chatting with Gemini: {str(e)}")

def split_into_chunks(text: str, chunk_size: int = 200) -> List[str]:
    """Split text into smaller chunks for FAISS indexing."""
    if not text or not text.strip():
        return []
    words = text.split()
    return [' '.join(words[i:i + chunk_size]) for i in range(0, len(words), chunk_size)]

def build_faiss_index(text_chunks: List[str]) -> tuple[Optional[faiss.Index], Optional[np.ndarray]]:
    """Build a FAISS index from text chunks."""
    if not text_chunks:
        return None, None
    embeddings = embedder.encode(text_chunks, convert_to_numpy=True)
    dimension = embeddings.shape[1]
    index = faiss.IndexFlatL2(dimension)  
    index.add(embeddings)
    return index, embeddings