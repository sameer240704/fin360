from pydantic import BaseModel

class StockItem(BaseModel):
    _id: str
    userId: str
    stockName: str
    tickerSymbol: str
    numberOfShares: int
    purchasePrice: float
    purchaseDate: str
    createdAt: str
    updatedAt: str
    __v: int

class ChatRequest(BaseModel):
    file_hash: str
    context_type: str  
    query: str
    use_faiss: bool = False 

class ProphetRequest(BaseModel):
    years: int = 10  