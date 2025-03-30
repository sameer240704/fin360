import os, json
from typing import Dict, List
import PyPDF2
import numpy as np
import pandas as pd
from dotenv import load_dotenv
import google.generativeai as genai
from PIL import Image as PILImage
from fastapi import HTTPException
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import (Image, Paragraph, SimpleDocTemplate, Spacer,
                               Table, TableStyle)
from io import BytesIO
import matplotlib.pyplot as plt
import seaborn as sns
from wordcloud import WordCloud

load_dotenv()
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")

genai.configure(api_key=GOOGLE_API_KEY)

if not GOOGLE_API_KEY:
    raise ValueError("GOOGLE_API_KEY not found in environment variables.  Please set this.")


def extract_text_from_pdf(pdf_file_path: str) -> str:
    """Extracts text from a PDF file."""
    try:
        with open(pdf_file_path, 'rb') as pdf_file:
            pdf_reader = PyPDF2.PdfReader(pdf_file)
            text = ""
            for page in pdf_reader.pages:
                text += page.extract_text()
            return text
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error extracting text from PDF: {e}")


# Function to analyze sentiment using Gemini Flash 2.0
def analyze_sentiment(text: str) -> Dict:
    """Analyzes sentiment and extracts key topics from text using Gemini."""

    model = genai.GenerativeModel('gemini-2.0-flash')

    prompt = f"""
    Analyze the following management commentary for sentiment and key topics.
    
    Management Commentary:
    {text}
    
    Perform a detailed sentiment analysis of this management commentary. 
    For each key business topic identified (e.g. Revenue, Profitability, Market Conditions, Growth Strategy, etc.), evaluate:
    
    1. The sentiment (Very Negative, Negative, Neutral, Positive, Very Positive)
    2. The confidence level (Low, Medium, High)
    3. Key statements supporting this sentiment assessment
    4. Potential implications for investors
    
    Return your analysis as a valid JSON object with the following structure:
    {{
        "overall_sentiment": "sentiment_value",
        "overall_confidence": "confidence_level",
        "overall_summary": "brief_summary",
        "topics": [
            {{
                "topic": "topic_name",
                "sentiment": "sentiment_value",
                "confidence": "confidence_level",
                "key_statements": ["statement1", "statement2"],
                "implications": "implications_text"
            }},
            ...
        ]
    }}
    
    IMPORTANT: Ensure your response is ONLY the JSON object - do not include any other text.
    """

    try:
        response = model.generate_content(prompt)
        try:
            analysis_json = json.loads(response.text)
            return analysis_json
        except json.JSONDecodeError:
            try:
                # Look for the first { and last }
                json_start = response.text.find('{')
                json_end = response.text.rfind('}') + 1
                if json_start >= 0 and json_end > json_start:
                    json_str = response.text[json_start:json_end]
                    return json.loads(json_str)
            except:
                pass
            # If direct parsing fails, return an error object
            return {
                "overall_sentiment": "Error",
                "overall_confidence": "N/A",
                "overall_summary": "Failed to parse Gemini response. Please try again.",
                "topics": []
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error analyzing sentiment with Gemini: {e}")


def get_sentiment_color(sentiment: str) -> str:
    """Returns a color code based on the sentiment."""
    colors = {
        "Very Positive": "#2ecc71",  # Green
        "Positive": "#a9dfbf",  # Light Green
        "Neutral": "#f9e79f",  # Yellow
        "Negative": "#f5b7b1",  # Light Red
        "Very Negative": "#e74c3c",  # Red
        "Error": "#d5d8dc"  # Grey
    }
    return colors.get(sentiment, "#d5d8dc")


# Get confidence color
def get_confidence_color(confidence: str) -> str:
    """Returns a color code based on the confidence level."""
    colors = {
        "High": "#2ecc71",  # Green
        "Medium": "#f39c12",  # Orange
        "Low": "#e74c3c",  # Red
        "N/A": "#d5d8dc"  # Grey
    }
    return colors.get(confidence, "#d5d8dc")


# Create sentiment badge HTML (Not needed for FastAPI)
def create_sentiment_badge(sentiment: str) -> str:
    """Creates an HTML snippet for a sentiment badge."""
    color = get_sentiment_color(sentiment)
    return f'<span class="sentiment-badge" style="background-color: {color};">{sentiment}</span>'


# Create confidence badge HTML (Not needed for FastAPI)
def create_confidence_badge(confidence: str) -> str:
    """Creates an HTML snippet for a confidence badge."""
    color = get_confidence_color(confidence)
    return f'<span class="confidence-badge" style="background-color: {color};">{confidence}</span>'


# Create sentiment distribution chart
def create_sentiment_chart(topics: List[Dict]) -> BytesIO:
    """Creates a horizontal bar chart showing the distribution of sentiments."""
    if not topics:
        return None

    sentiment_counts = pd.DataFrame([str(t['sentiment']) for t in topics]).value_counts().reset_index()
    sentiment_counts.columns = ['Sentiment', 'Count']

    order = ["Very Positive", "Positive", "Neutral", "Negative", "Very Negative"]
    sentiment_counts['Sentiment'] = pd.Categorical(sentiment_counts['Sentiment'], categories=order, ordered=True)
    sentiment_counts = sentiment_counts.sort_values('Sentiment')

    colors = [get_sentiment_color(s) for s in sentiment_counts['Sentiment']]

    fig, ax = plt.subplots(figsize=(10, 6))
    bars = ax.barh(sentiment_counts['Sentiment'], sentiment_counts['Count'], color=colors)

    for bar in bars:
        width = bar.get_width()
        ax.text(width + 0.1, bar.get_y() + bar.get_height() / 2, f'{width:.0f}',
                ha='left', va='center', fontweight='bold')

    ax.set_title('Sentiment Distribution', fontsize=14, fontweight='bold')
    ax.set_xlabel('Count', fontsize=12)
    ax.spines['top'].set_visible(False)
    ax.spines['right'].set_visible(False)
    ax.spines['bottom'].set_color('#ddd')
    ax.spines['left'].set_color('#ddd')
    ax.tick_params(axis='x', colors='#666')
    ax.tick_params(axis='y', colors='#666')

    plt.tight_layout()

    # Save to BytesIO
    buf = BytesIO()
    plt.savefig(buf, format='png', bbox_inches='tight')
    plt.close(fig)  # Close the figure to release memory
    buf.seek(0)
    return buf


# Function to create a radar chart for sentiment by topic
def create_radar_chart(topics: List[Dict]) -> BytesIO:
    """Creates a radar chart showing sentiment by topic."""
    if not topics:
        return None

    # Convert sentiment to numeric values
    sentiment_map = {
        "Very Positive": 5,
        "Positive": 4,
        "Neutral": 3,
        "Negative": 2,
        "Very Negative": 1,
        "Error": 0
    }

    # Get topics and their sentiment scores
    topic_names = [t['topic'] for t in topics]
    sentiment_scores = [sentiment_map.get(t['sentiment'], 0) for t in topics]

    # Create radar chart
    fig = plt.figure(figsize=(8, 8))
    ax = fig.add_subplot(111, polar=True)

    # Number of variables
    N = len(topic_names)

    # Angle for each variable
    angles = [n / float(N) * 2 * np.pi for n in range(N)]
    angles += angles[:1]  # Close the loop

    # Add sentiment scores
    values = sentiment_scores
    values += values[:1]  # Close the loop

    # Plot data
    ax.plot(angles, values, 'o-', linewidth=2, color='#1E3A8A')
    ax.fill(angles, values, alpha=0.25, color='#1E3A8A')

    # Add topic labels
    plt.xticks(angles[:-1], topic_names, size=10)

    # Set y-axis limits
    plt.yticks([1, 2, 3, 4, 5], ['Very Negative', 'Negative', 'Neutral', 'Positive', 'Very Positive'],
               color='grey', size=8)
    plt.ylim(0, 5)

    plt.title('Sentiment by Topic', size=14, color='#1E3A8A', fontweight='bold', pad=20)

    # Save to BytesIO
    buf = BytesIO()
    plt.savefig(buf, format='png', bbox_inches='tight')
    plt.close(fig)  # Close the figure to release memory
    buf.seek(0)
    return buf


# Function to create a word cloud for key topics
def create_word_cloud(topics: List[Dict]) -> BytesIO:
    """Creates a word cloud image from the key statements of the topics."""
    if not topics:
        return None

    # Combine all key statements into a single text
    text = " ".join([" ".join(topic['key_statements']) for topic in topics])

    # Generate word cloud
    wordcloud = WordCloud(width=800, height=400, background_color='white', colormap='Blues').generate(text)

    # Plot the word cloud
    fig, ax = plt.subplots(figsize=(10, 5))
    ax.imshow(wordcloud, interpolation='bilinear')
    ax.axis('off')
    plt.tight_layout()

    # Save to BytesIO
    buf = BytesIO()
    plt.savefig(buf, format='png', bbox_inches='tight')
    plt.close(fig)  # Close the figure to release memory
    buf.seek(0)
    return buf


# Function to create a sentiment trend chart
def create_sentiment_trend_chart(topics: List[Dict]) -> BytesIO:
    """Creates a line chart showing the trend of sentiment across topics."""
    if not topics:
        return None

    # Convert sentiment to numeric values
    sentiment_map = {
        "Very Positive": 5,
        "Positive": 4,
        "Neutral": 3,
        "Negative": 2,
        "Very Negative": 1,
        "Error": 0
    }

    # Get topics and their sentiment scores
    topic_names = [t['topic'] for t in topics]
    sentiment_scores = [sentiment_map.get(t['sentiment'], 0) for t in topics]

    # Create a trend chart
    fig, ax = plt.subplots(figsize=(10, 6))
    ax.plot(topic_names, sentiment_scores, marker='o', color='#1E3A8A', linewidth=2)

    # Styling
    ax.set_title('Sentiment Trend Across Topics', fontsize=14, fontweight='bold')
    ax.set_xlabel('Topics', fontsize=12)
    ax.set_ylabel('Sentiment Score', fontsize=12)
    ax.set_ylim(0, 5)
    ax.grid(True, linestyle='--', alpha=0.7)
    plt.xticks(rotation=45, ha='right')
    plt.tight_layout()

    # Save to BytesIO
    buf = BytesIO()
    plt.savefig(buf, format='png', bbox_inches='tight')
    plt.close(fig)  # Close the figure to release memory
    buf.seek(0)
    return buf


# Function to create a heatmap for sentiment distribution
def create_sentiment_heatmap(topics: List[Dict]) -> BytesIO:
    """Creates a heatmap visualizing the distribution of sentiment across topics."""
    if not topics:
        return None

    # Convert sentiment to numeric values
    sentiment_map = {
        "Very Positive": 5,
        "Positive": 4,
        "Neutral": 3,
        "Negative": 2,
        "Very Negative": 1,
        "Error": 0
    }

    # Get topics and their sentiment scores
    topic_names = [t['topic'] for t in topics]
    sentiment_scores = [sentiment_map.get(t['sentiment'], 0) for t in topics]

    # Create a heatmap
    fig, ax = plt.subplots(figsize=(10, 6))
    sns.heatmap([sentiment_scores], annot=True, cmap='Blues', yticklabels=['Sentiment'],
                xticklabels=topic_names, ax=ax, cbar=False)

    # Styling
    ax.set_title('Sentiment Heatmap', fontsize=14, fontweight='bold')
    plt.xticks(rotation=45, ha='right')
    plt.tight_layout()

    # Save to BytesIO
    buf = BytesIO()
    plt.savefig(buf, format='png', bbox_inches='tight')
    plt.close(fig)  # Close the figure to release memory
    buf.seek(0)
    return buf


# Function to create PDF report
def create_pdf_report(analysis: Dict, company_name: str = "") -> BytesIO:
    """Creates a PDF report with sentiment analysis results and visualizations."""
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=72, leftMargin=72, topMargin=72, bottomMargin=72)

    # Define styles
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Title'],
        fontSize=24,
        textColor=colors.HexColor('#1E3A8A'),
        spaceAfter=12
    )

    heading1_style = ParagraphStyle(
        'Heading1',
        parent=styles['Heading1'],
        fontSize=18,
        textColor=colors.HexColor('#1E3A8A'),
        spaceAfter=6
    )

    heading2_style = ParagraphStyle(
        'Heading2',
        parent=styles['Heading2'],
        fontSize=14,
        textColor=colors.HexColor('#1E3A8A'),
        spaceAfter=6
    )

    normal_style = styles["Normal"]

    # Elements for the PDF
    elements = []

    # Title
    title_text = f"Management Commentary Analysis Report"
    if company_name:
        title_text += f" - {company_name}"
    elements.append(Paragraph(title_text, title_style))
    elements.append(Spacer(1, 0.25 * inch))

    # Overall Summary Section
    elements.append(Paragraph("Executive Summary", heading1_style))
    elements.append(Spacer(1, 0.1 * inch))

    # Create a table for the overall metrics
    data = [
        ["Overall Sentiment", "Confidence Level"],
        [analysis["overall_sentiment"], analysis["overall_confidence"]]
    ]

    # Style the table with sentiment colors
    sentiment_color = get_sentiment_color(analysis["overall_sentiment"])
    confidence_color = get_confidence_color(analysis["overall_confidence"])

    table = Table(data, colWidths=[2.5 * inch, 2.5 * inch])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, 0), colors.HexColor('#f1f5fd')),
        ('BACKGROUND', (1, 0), (1, 0), colors.HexColor('#f1f5fd')),
        ('BACKGROUND', (0, 1), (0, 1), colors.HexColor(sentiment_color)),
        ('BACKGROUND', (1, 1), (1, 1), colors.HexColor(confidence_color)),
        ('TEXTCOLOR', (0, 1), (0, 1), colors.white),
        ('TEXTCOLOR', (1, 1), (1, 1), colors.white),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 12),
        ('FONTNAME', (0, 1), (-1, 1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 1), (-1, 1), 14),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
        ('TOPPADDING', (0, 1), (-1, 1), 8),
        ('GRID', (0, 0), (-1, -1), 1, colors.lightgrey),
    ]))

    elements.append(table)
    elements.append(Spacer(1, 0.2 * inch))

    # Summary text
    elements.append(Paragraph("Summary:", heading2_style))
    elements.append(Paragraph(analysis["overall_summary"], normal_style))
    elements.append(Spacer(1, 0.3 * inch))

    # Topics Section
    elements.append(Paragraph("Topic Analysis", heading1_style))
    elements.append(Spacer(1, 0.1 * inch))

    # Create sentiment distribution chart if topics exist
    if "topics" in analysis and analysis["topics"]:
        # Create the sentiment chart
        sentiment_chart_data = create_sentiment_chart(analysis["topics"])
        elements.append(Image(sentiment_chart_data, width=6 * inch, height=3 * inch))
        elements.append(Spacer(1, 0.2 * inch))

        # Create radar chart
        radar_chart_data = create_radar_chart(analysis["topics"])
        elements.append(Image(radar_chart_data, width=5 * inch, height=5 * inch))
        elements.append(Spacer(1, 0.2 * inch))

        # Create word cloud
        word_cloud_data = create_word_cloud(analysis["topics"])
        elements.append(Image(word_cloud_data, width=6 * inch, height=3 * inch))
        elements.append(Spacer(1, 0.2 * inch))

        # Create sentiment trend chart
        sentiment_trend_data = create_sentiment_trend_chart(analysis["topics"])
        elements.append(Image(sentiment_trend_data, width=6 * inch, height=3 * inch))
        elements.append(Spacer(1, 0.2 * inch))

        # Create sentiment heatmap
        sentiment_heatmap_data = create_sentiment_heatmap(analysis["topics"])
        elements.append(Image(sentiment_heatmap_data, width=6 * inch, height=3 * inch))
        elements.append(Spacer(1, 0.2 * inch))

        # Create a table for all topics
        topic_data = [["Topic", "Sentiment", "Confidence"]]

        for topic in analysis["topics"]:
            topic_data.append([
                topic["topic"],
                topic["sentiment"],
                topic["confidence"]
            ])

        topic_table = Table(topic_data, colWidths=[2 * inch, 2 * inch, 1.5 * inch])

        # Style the table
        table_style = [
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1E3A8A')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 12),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
            ('GRID', (0, 0), (-1, -1), 1, colors.lightgrey),
        ]

        # Add background colors based on sentiment
        for i, topic in enumerate(analysis["topics"], 1):
            sentiment_color = get_sentiment_color(topic["sentiment"])
            # Lighten the color for better readability
            light_color = colors.HexColor(sentiment_color).clone()
            light_color.alpha = 0.3
            table_style.append(('BACKGROUND', (1, i), (1, i), light_color))

            confidence_color = get_confidence_color(topic["confidence"])
            light_conf_color = colors.HexColor(confidence_color).clone()
            light_conf_color.alpha = 0.3
            table_style.append(('BACKGROUND', (2, i), (2, i), light_conf_color))

        topic_table.setStyle(TableStyle(table_style))
        elements.append(topic_table)
        elements.append(Spacer(1, 0.3 * inch))

        # Detailed topic information
        elements.append(Paragraph("Detailed Topic Insights", heading1_style))
        elements.append(Spacer(1, 0.1 * inch))

        for topic in analysis["topics"]:
            elements.append(Paragraph(topic["topic"], heading2_style))

            # Topic metrics
            topic_info = f"Sentiment: {topic['sentiment']} (Confidence: {topic['confidence']})"
            elements.append(Paragraph(topic_info, styles["Italic"]))
            elements.append(Spacer(1, 0.1 * inch))

            # Key statements
            elements.append(Paragraph("Key Statements:", styles["Heading3"]))
            statements = topic["key_statements"]
            if isinstance(statements, list):
                for stmt in statements:
                    elements.append(Paragraph(f"• {stmt}", normal_style))
                    elements.append(Spacer(1, 0.05 * inch))
            else:
                elements.append(Paragraph(f"• {statements}", normal_style))

            elements.append(Spacer(1, 0.1 * inch))

            # Implications
            elements.append(Paragraph("Investor Implications:", styles["Heading3"]))
            elements.append(Paragraph(topic["implications"], normal_style))
            elements.append(Spacer(1, 0.2 * inch))

    else:
        elements.append(Paragraph("No topics were identified in the analysis.", normal_style))

    doc.build(elements)
    buffer.seek(0)
    return buffer