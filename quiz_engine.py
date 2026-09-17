import json
import os

from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
model = "gpt-6-astra"


def generate_quiz(content: str) -> dict:
    """Send extracted content to OpenAI and get back a structured MCQ quiz."""
    prompt = f"""
        You are a teaching assistant. Read the following content and generate 1 to N
        important multiple-choice questions that test understanding of the key concepts.
        N is proportional to the length of the content.
        
        Return ONLY valid JSON, with no markdown formatting and no commentary,
        in exactly this structure:
        
        {{
          "questions": [
            {{
              "question": "...",
              "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
              "correct_index": 0,
              "explanation": "..."
            }}
          ]
        }}
        
        Content:
        \"\"\"{content}\"\"\"
    """

    response = client.responses.create(
        model=model,
        input=prompt,
    )

    raw = response.output_text.strip()
    raw = raw.removeprefix("```json").removeprefix("```").removesuffix("```").strip()

    return json.loads(raw)