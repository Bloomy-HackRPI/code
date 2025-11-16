import os
from dotenv import load_dotenv
import openai


class ExtractorGPT:

    def __init__(self):
        """Upon initialization, load the env and the intent-prompt mapping"""
        load_dotenv()
        openai.api_key = os.getenv("OPENAI_API_KEY")
        self.intentToPrompt = {
            'get_stat': """
            You are an assistant that converts natural-language sentences about a company's financials into Bloomberg terminal query keywords.

            Instructions:
            1. Identify the company and return its **official ticker symbol** if obvious.
            2. Identify the financial metric and return the **Bloomberg-style field** (e.g., NET_INC for net income, REV for revenue, EPS for earnings per share, etc.).
            3. Identify the time range and return it in a **Bloomberg-compatible format** (e.g., FY2023, Q1 2024, LAST_YEAR, LAST_QUARTER).
            4. Return **JSON only**, with keys exactly: "company", "metric", "date".
            5. If any information is missing in the sentence, set its value to null.

            Example 1:
            Input: "What was Tesla's income last year?"
            Output:
            {
            "company": "TSLA",
            "metric": "NET_INC",
            "date": "FY2024"
            }

            Example 2:
            Input: "Apple's revenue in Q1 2023"
            Output:
            {
            "company": "AAPL",
            "metric": "REV",
            "date": "Q1 2023"
            }

            Now process the following sentence:
            """,
            'get_chart': """
            You are an assistant that converts natural-language chart requests into a structured JSON specification.

            Instructions:
            1. Identify the **type of chart** (bar, line, pie, scatter, etc.).
            2. Identify the **data** to plot (labels, values, or series).
            3. Identify any **chart options** mentioned (title, colors, axis labels).
            4. Return **JSON only**. Do not include explanations.

            Example 1:
            Input: "Show me a bar chart of Apple's quarterly revenue for 2023."
            Output:
            {
            "type": "bar",
            "title": "Apple Quarterly Revenue 2023",
            "x": ["Q1", "Q2", "Q3", "Q4"],
            "y": [90, 95, 100, 105],
            "series": ["Revenue"],
            "colors": ["#1f77b4"]
            }

            Example 2:
            Input: "Generate a pie chart of Tesla's market share in 2024."
            Output:
            {
            "type": "pie",
            "title": "Tesla Market Share 2024",
            "labels": ["Tesla", "Competitor A", "Competitor B"],
            "values": [25, 50, 25],
            "colors": ["#ff0000", "#00ff00", "#0000ff"]
            }

            Now process the following request:

            """,

            'small_talk': """
            You are a helpful assistant that can engage in small talk but also provide instructions on how to use the bot.

            Instructions:
            1. If the user asks a casual question (greeting, joke, how are you), respond naturally and politely.
            2. If the user asks about the bot's functionality, explain clearly how to interact with it.
            3. Keep answers friendly, concise, and informative.
            4. Do not return code or JSON; return plain text.

            Example 1:
            Input: "Hi, how are you?"
            Output: "Hello! I'm doing great, thank you. How can I help you today?"

            Example 2:
            Input: "What can you do?"
            Output: "I can help you extract financial keywords for Bloomberg queries, generate simple charts, and answer questions about your data. Just ask me in plain language!"

            Example 3:
            Input: "Tell me a joke"
            Output: "Sure! Why did the accountant break up with the calculator? They couldn't count on each other!"

            Now respond to the following user input:

"""
}


    def getPrompt(self, intent, query):
        """Construct the prompt and insert the intent and query"""
        prompt = self.intentToPrompt[intent]
        prompt += f"""

        Intent: {intent}
        Query: {query}    
        """
        
        return prompt


    def sendPrompt(self, prompt):
        """Send a request to openai API"""
        try:
            response = openai.responses.create(
                model="gpt-3.5-turbo",
                input=prompt,
                temperature=0
            )

            return response.output_text.strip()
        except Exception as e:
            print(f"Error calling OpenAI API: {e}")
            return None
    

    def parseParameters(self, message, intent):
        """Wrapper for all of the functions"""
        prompt = self.getPrompt(message, intent)
        parameters = self.sendPrompt(prompt)
        return parameters
        
