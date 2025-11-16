import os
from dotenv import load_dotenv
import openai
import json


class ExtractorGPT:

    def __init__(self):
        """Upon initialization, load the env and the intent-prompt mapping"""
        load_dotenv()
        openai.api_key = os.getenv("OPENAI_API_KEY")
        self.intentToPrompt = {
            'get_stat': """
                You are a financial assistant. Convert user questions about finance into Bloomberg-compatible JSON queries.

                Rules:
                1. ALWAYS output valid JSON and nothing else.
                2. Use ONLY the metrics below. Do NOT invent new Bloomberg fields.
                3. If the user asks for a metric not in this list, return:
                { "error": "unsupported_metric" }
                4. Fill in ticker and dates if possible. If ticker is missing, guess common tickers (AAPL, TSLA, MSFT, etc.)

                Allowed Bloomberg Metrics:
                - PX_LAST: price, last price, close
                - OPEN: open, opening price
                - PX_HIGH: high, daily high
                - PX_LOW: low, daily low
                - PX_VOLUME: volume, trading volume
                - HIST_VOL_30D: 30-day volatility
                - VOLATILITY_90D: 90-day volatility
                - DIVIDEND_YIELD: dividend yield
                - DIVIDEND_AMOUNT: dividend
                - PE_RATIO: pe ratio
                - PB_RATIO: pb ratio
                - EPS: eps
                - MARKET_CAP: market cap
                - BETA: beta
                - YTD_RETURN: ytd return
                - RETURN_1M: 1-month return
                - RETURN_3M: 3-month return
                - RETURN_1Y: 1-year return
                - FWD_PE: forward pe
                - EBITDA: ebitda

                Output schema:
                {
                "ticker": "<string>",
                "metric": "<Bloomberg field>",
                "start_date": "YYYY-MM-DD (optional)",
                "end_date": "YYYY-MM-DD (optional)"
                }

                Examples:

                Input: "What is Tesla's stock price today?"
                Output:
                {
                "ticker": "TSLA",
                "metric": "PX_LAST"
                }

                Input: "Apple trading volume yesterday"
                Output:
                {
                "ticker": "AAPL",
                "metric": "PX_VOLUME",
                "start_date": "2025-02-13",
                "end_date": "2025-02-13"
                }

                Input: "Show me Microsoft's 30-day volatility this month"
                Output:
                {
                "ticker": "MSFT",
                "metric": "HIST"
                } 

                Input: "What was Tesla's net income?"
                Output:
                {
                "error": "unsupported_metric"
                }

                Always use only the fields listed above. Do NOT hallucinate any other metrics.

                Now process the following user request:
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

            res = response.output_text.strip()
            return json.loads(res)
        
        except Exception as e:
            print(f"Error calling OpenAI API: {e}")
            return None
    

    def parseParameters(self, message, intent):
        """Wrapper for all of the functions"""
        prompt = self.getPrompt(message, intent)
        parameters = self.sendPrompt(prompt)
        return parameters
        
