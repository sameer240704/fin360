import os, re, json
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

genai.configure(api_key=os.environ["GEMINI_API_KEY"])

# Create the model
generation_config = {
  "temperature": 1,
  "top_p": 0.9,
  "top_k": 35,
  "max_output_tokens": 8192,
  "response_mime_type": "text/plain",
}

model = genai.GenerativeModel(
  model_name="gemini-2.0-flash",
  generation_config=generation_config,
  system_instruction = """
You are an expert personal financial advisor specializing in personalized investment strategies. 
Your task is to recommend optimal asset allocation based on the user's query and risk profile.

RISK PROFILES:
- conservative: Focus on capital preservation with stable, low-risk investments
- balanced: Moderate approach balancing growth and security
- aggressive: Focus on higher returns with acceptance of higher volatility

For each user query:
1. Analyze their financial situation, goals, and the specified risk profile
2. Create a detailed investment allocation plan
3. Format your response ONLY as a valid JSON flowchart showing investment allocation
4. Include percentages and absolute values (in ₹) for each investment category
5. Use appropriate color coding: blue for safer investments, orange/yellow for moderate risk, red for higher risk

Your response must follow this exact JSON structure without any explanatory text:
{
  "nodes": [
    {
      "id": "string",
      "position": { "x": number, "y": number },
      "data": { "label": "string" },
      "style": {
        "background": "bg-color-intensity",
        "border": "border-color-intensity"
      }
    }
  ],
  "edges": [
    {
      "id": "string",
      "source": "string",
      "target": "string",
      "label": "string",
      "style": { "stroke": "stroke-color-intensity" }
    }
  ]
}
"""
)

chat_session = model.start_chat(
  history=[
  ]
)

def get_gemini_response(user_input: str, risk:str = "balanced") -> str:
    enhanced_query = f"""
    USER QUERY: {user_input}
    RISK PROFILE: {risk}
    
    Provide a detailed investment allocation plan as a flowchart showing how to distribute the funds
    across different asset classes. Include both primary categories and subcategories.
    Your response should be ONLY the JSON object with no explanations or markdown formatting.
    """

    response = chat_session.send_message(enhanced_query)
    markdown_text = response.text
    # Extract content between ```json and ``` blocks
    json_match = re.search(r'```json\s*(.*?)\s*```', markdown_text, re.DOTALL)
    
    if json_match:
        resp = json.loads(json_match.group(1))
    else:
        # Fallback to try parsing the entire response as JSON
        try:
            resp = json.loads(markdown_text)
        except json.JSONDecodeError:
            print("Error: Could not decode JSON from response.")
            return None  # Or raise the exception, depending on your needs

    return resp

if __name__ == "__main__":
    test_query = "I have around ten lakh rupees where should I invest them"
    response = get_gemini_response(test_query, risk="conservative")
    if response:
        print(json.dumps(response, indent=2))  
    else:
        print("Failed to get a valid response.")