import os, re
from typing import Dict, List, Union
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from google.generativeai import GenerativeModel
import google.generativeai as genai
from PIL import Image
import pytesseract
import pandas as pd
import PyPDF2
from dotenv import load_dotenv
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image as ReportLabImage
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors

app = FastAPI(title="AI Business Model Generator API")

# Load environment variables from .env file
load_dotenv()

# Initialize Gemini client
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
model = GenerativeModel("gemini-2.0-flash")

# Load industry context from file
try:
    with open("data/industry.txt", "r") as file:  # Replace 'data/industry.txt' with your actual path
        industry_context = file.read()
except FileNotFoundError:
    industry_context = "No industry context file found."

# Function to extract text from different file types
def extract_text(file_path: str, file_type: str) -> str:
    """
    Extracts text from a file based on its type.

    Args:
        file_path (str): The path to the file.
        file_type (str): The MIME type of the file.

    Returns:
        str: The extracted text.

    Raises:
        ValueError: If the file type is not supported.
    """
    try:
        if file_type in ["image/png", "image/jpeg"]:
            image = Image.open(file_path)
            return pytesseract.image_to_string(image)
        elif file_type == "application/pdf":
            with open(file_path, 'rb') as file:
                reader = PyPDF2.PdfReader(file)
                text = ""
                for page in reader.pages:
                    text += page.extract_text()
                return text
        elif file_type == "text/csv":
            df = pd.read_csv(file_path)
            return df.to_string()
        else:
            raise ValueError("Unsupported file format")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error extracting text: {e}")


# Function to completely strip all HTML/XML tags for PDF safety
def strip_all_tags(text: str) -> str:
    """
    Strips all HTML/XML tags from the given text.

    Args:
        text (str): The text to strip tags from.

    Returns:
        str: The text with all HTML/XML tags removed.
    """
    if text is None:
        return "No content available."

    # If text is not a string, convert it to a string
    if not isinstance(text, str):
        try:
            text = str(text)
        except:
            return "Content could not be converted to text."

    # Remove all HTML/XML tags completely
    text = re.sub(r'<[^>]*>', '', text)

    # Escape any remaining < or > characters
    text = text.replace('<', '<').replace('>', '>')

    # Replace special characters
    text = text.replace('\t', '    ')  # Replace tabs with spaces
    text = text.replace('\u2022', '* ')  # Replace bullet points
    text = text.replace('*', '• ')  # Replace asterisks with bullet points

    # Remove any other potentially problematic characters
    text = re.sub(r'[^\x20-\x7E\n\r\t ]', ' ', text)

    return text


# Function to parse tables from the AI response
def parse_timeline_tables(text: str) -> List[Dict[str, Union[str, List[List[str]]]]]:
    """
    Parses timeline tables from the AI response.

    Args:
        text (str): The AI response text.

    Returns:
        List[Dict[str, Union[str, List[List[str]]]]]: A list of dictionaries, where each dictionary represents a table
                                                  and contains the header and rows of the table.
    """
    # Look for sections that appear to contain tables
    table_pattern = r"(?:Timeline|Implementation Timeline|Action Plan|Quarterly Plan)[\s\S]*?(?:\|\s*[-]+\s*\|\s*[-]+\s*\|[\s\S]*?(?=\n\n|\Z))"

    tables = re.findall(table_pattern, text, re.IGNORECASE)

    result = []
    for table_text in tables:
        lines = table_text.strip().split('\n')

        # Extract the table header (if any)
        header = ""
        for i, line in enumerate(lines):
            if '|' in line:
                if i > 0 and '|' not in lines[i - 1]:
                    header = lines[i - 1].strip()
                break

        # Extract the table rows
        rows = []
        for line in lines:
            if '|' in line:
                # Clean and split the row
                cells = [cell.strip() for cell in line.split('|')[1:-1]]
                if cells and any(cells):  # Skip empty rows
                    rows.append(cells)

        if rows:
            result.append({"header": header, "rows": rows})

    return result


# Function to generate PDF safely
def generate_pdf(business_models: Dict[str, Union[str, List[Dict[str, Union[str, List[List[str]]]]]]], output_path: str):
    """
    Generates a PDF report based on the business models.

    Args:
        business_models (Dict[str, Union[str, List[Dict[str, Union[str, List[List[str]]]]]]]): A dictionary containing the
                         generated business models.
        output_path (str): The path to save the generated PDF.

    """
    doc = SimpleDocTemplate(output_path, pagesize=letter)
    styles = getSampleStyleSheet()

    # Create custom styles
    title_style = ParagraphStyle(
        'Title',
        parent=styles['Heading1'],
        fontSize=16,
        spaceAfter=12,
        textColor=colors.darkblue
    )

    subtitle_style = ParagraphStyle(
        'Subtitle',
        parent=styles['Heading2'],
        fontSize=14,
        spaceAfter=10,
        textColor=colors.darkgreen
    )

    table_header_style = ParagraphStyle(
        'TableHeader',
        parent=styles['Heading3'],
        fontSize=12,
        spaceAfter=8
    )

    normal_style = styles['Normal']

    # Build the document content
    content = []

    try:
        # Title
        content.append(Paragraph("Custom Business Models Report", title_style))
        content.append(Spacer(1, 12))

        # Revenue Model
        content.append(Paragraph("1. Revenue Model", subtitle_style))
        revenue_text = strip_all_tags(business_models.get("revenue_model", "No revenue model generated."))
        content.append(Paragraph(revenue_text, normal_style))
        content.append(Spacer(1, 12))

        # Add timeline tables for revenue model
        if "revenue_timeline" in business_models and business_models["revenue_timeline"]:
            content.append(Paragraph("Revenue Model Implementation Timeline", table_header_style))
            for table_data in business_models["revenue_timeline"]:
                if table_data["header"]:
                    content.append(Paragraph(table_data["header"], normal_style))

                if table_data["rows"]:
                    table_style = TableStyle([
                        ('BACKGROUND', (0, 0), (-1, 0), colors.lightblue),
                        ('TEXTCOLOR', (0, 0), (-1, 0), colors.black),
                        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
                        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                        ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
                        ('GRID', (0, 0), (-1, -1), 1, colors.black),
                        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                    ])

                    table = Table(table_data["rows"])
                    table.setStyle(table_style)
                    content.append(table)
                    content.append(Spacer(1, 10))

        content.append(Spacer(1, 12))

        # Growth Model
        content.append(Paragraph("2. Growth Model", subtitle_style))
        growth_text = strip_all_tags(business_models.get("growth_model", "No growth model generated."))
        content.append(Paragraph(growth_text, normal_style))
        content.append(Spacer(1, 12))

        # Add timeline tables for growth model
        if "growth_timeline" in business_models and business_models["growth_timeline"]:
            content.append(Paragraph("Growth Model Implementation Timeline", table_header_style))
            for table_data in business_models["growth_timeline"]:
                if table_data["header"]:
                    content.append(Paragraph(table_data["header"], normal_style))

                if table_data["rows"]:
                    table_style = TableStyle([
                        ('BACKGROUND', (0, 0), (-1, 0), colors.lightgreen),
                        ('TEXTCOLOR', (0, 0), (-1, 0), colors.black),
                        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
                        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                        ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
                        ('GRID', (0, 0), (-1, -1), 1, colors.black),
                        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                    ])

                    table = Table(table_data["rows"])
                    table.setStyle(table_style)
                    content.append(table)
                    content.append(Spacer(1, 10))

        content.append(Spacer(1, 12))

        # Profit Maximization Model
        content.append(Paragraph("3. Profit Maximization Model", subtitle_style))
        profit_text = strip_all_tags(business_models.get("profit_model", "No profit model generated."))
        content.append(Paragraph(profit_text, normal_style))
        content.append(Spacer(1, 12))

        # Add timeline tables for profit model
        if "profit_timeline" in business_models and business_models["profit_timeline"]:
            content.append(Paragraph("Profit Maximization Implementation Timeline", table_header_style))
            for table_data in business_models["profit_timeline"]:
                if table_data["header"]:
                    content.append(Paragraph(table_data["header"], normal_style))

                if table_data["rows"]:
                    table_style = TableStyle([
                        ('BACKGROUND', (0, 0), (-1, 0), colors.lavender),
                        ('TEXTCOLOR', (0, 0), (-1, 0), colors.black),
                        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
                        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                        ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
                        ('GRID', (0, 0), (-1, -1), 1, colors.black),
                        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                    ])

                    table = Table(table_data["rows"])
                    table.setStyle(table_style)
                    content.append(table)
                    content.append(Spacer(1, 10))

        content.append(Spacer(1, 12))

        # Projections
        content.append(Paragraph("4. Financial Projections", subtitle_style))
        projections_text = strip_all_tags(business_models.get("projections", "No projections generated."))
        content.append(Paragraph(projections_text, normal_style))

        # Build the document
        doc.build(content)

    except Exception as e:
        print(f"Error generating PDF: {str(e)}")
        # Create a simple error PDF with minimal content
        doc = SimpleDocTemplate(output_path, pagesize=letter)
        error_content = [Paragraph("Error generating PDF. The content contains formatting that could not be processed.",
                                   normal_style)]
        doc.build(error_content)


# Function to generate business models using Gemini
def generate_business_models(financial_params: Dict[str, Union[int, float]], annual_report_text: str) -> Dict[str, Union[str, List[Dict[str, Union[str, List[List[str]]]]]]]:
    """
    Generates business models using the Gemini model.

    Args:
        financial_params (Dict[str, Union[int, float]]): A dictionary containing the financial parameters.
        annual_report_text (str): The text from the annual report.

    Returns:
        Dict[str, Union[str, List[Dict[str, Union[str, List[List[str]]]]]]]: A dictionary containing the generated business models.

    Raises:
        HTTPException: If there is an error generating the business models.
    """
    prompt = f"""
    Based on the following financial parameters and annual report, generate three detailed business models:

    Financial Parameters:
    - Annual Revenue: ${financial_params["annual_revenue"]:,}
    - Profit Margin: {financial_params["profit_margin"]}%
    - Market Growth Rate: {financial_params["market_growth_rate"]}%
    - Customer Acquisition Cost: ${financial_params["customer_acquisition_cost"]}
    - Customer Lifetime Value: ${financial_params["customer_lifetime_value"]}

    Annual Report Summary:
    {annual_report_text[:3000]}

    Industry Context:
    {industry_context[:1000]}

    Generate three specific business models:
    1. Revenue Model: A detailed model focused on diversifying and optimizing revenue streams
    2. Growth Model: A strategic approach to scale operations and market share
    3. Profit Maximization Model: Specific tactics to maximize profit in the next fiscal year

    Also include a fourth section for financial projections for the next fiscal year based on these models.

    VERY IMPORTANT: For each model, include a detailed implementation timeline table with the following columns:
    - Timeline/Quarter
    - Action/Measure
    - Expected Impact
    - KPI/Metrics

    Format the timeline as a markdown table with | symbols for columns.
    Example table format:

    | Timeline | Action/Measure | Expected Impact | KPI/Metrics |
    | -------- | -------------- | --------------- | ----------- |
    | Q1 2025  | Action 1       | Impact 1        | KPI 1       |
    | Q2 2025  | Action 2       | Impact 2        | KPI 2       |

    IMPORTANT: Format your response with clear section headers (1. Revenue Model, 2. Growth Model, 3. Profit Maximization Model, 4. Financial Projections).
    Do not use HTML tags in your response. Use plain text formatting with asterisks for emphasis or bullet points.
    """

    try:
        response = model.generate_content(prompt)
        response_text = response.text

        # Split the response into sections
        result = {}

        # Extract sections using regex patterns
        revenue_pattern = r'(?i)(?:^|\n)(?:1\.?\s*|#\s*|)(?:revenue model|revenue)'
        growth_pattern = r'(?i)(?:^|\n)(?:2\.?\s*|#\s*|)(?:growth model|growth)'
        profit_pattern = r'(?i)(?:^|\n)(?:3\.?\s*|#\s*|)(?:profit|profit maximization)'
        projection_pattern = r'(?i)(?:^|\n)(?:4\.?\s*|#\s*|)(?:financial projection|projection)'

        # Find all section positions
        revenue_match = re.search(revenue_pattern, response_text)
        growth_match = re.search(growth_pattern, response_text)
        profit_match = re.search(profit_pattern, response_text)
        projection_match = re.search(projection_pattern, response_text)

        # Default end of text
        text_end = len(response_text)

        # Get indices or set to end of string
        revenue_start = revenue_match.start() if revenue_match else 0
        growth_start = growth_match.start() if growth_match else text_end
        profit_start = profit_match.start() if profit_match else text_end
        projection_start = projection_match.start() if projection_match else text_end

        # Create a list of section boundaries
        sections = [
            ("revenue_model", revenue_start, growth_start if growth_start > revenue_start else text_end),
            ("growth_model", growth_start, profit_start if profit_start > growth_start else text_end),
            ("profit_model", profit_start, projection_start if projection_start > profit_start else text_end),
            ("projections", projection_start, text_end)
        ]

        # Extract each section and look for tables
        for section_name, start, end in sections:
            if start < end and start < text_end:
                section_text = response_text[start:end].strip()
                result[section_name] = section_text

                # Extract timeline tables from each section
                timeline_tables = parse_timeline_tables(section_text)
                if timeline_tables:
                    result[f"{section_name.split('_')[0]}_timeline"] = timeline_tables
            else:
                result[section_name] = f"No {section_name.replace('_', ' ')} found in response."

        return result

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating business models: {str(e)}")

@app.get("/download_pdf/{filename}")
async def download_pdf(filename: str):
    """
    Downloads the generated PDF report.
    """
    pdf_path = os.path.join("generated_pdfs", filename)
    if not os.path.exists(pdf_path):
        raise HTTPException(status_code=404, detail="PDF not found")
    return FileResponse(pdf_path, media_type="application/pdf", filename=filename)
