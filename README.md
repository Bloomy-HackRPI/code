# Bloomy: a Financial Chatbot for HackRPI 2025
### Sam, Jacob

## What is Bloomy?
The Bloomberg terminal is a powerful financial system. However, it's efficient UI is unfriendly for new users. Bloomy will bridge this gap, providing easy access to this tool without compromising its power. 

## How does Bloomy work?
Messages are propagated through several input systems: iMessages, discord, and an HTTP API. These queries are processed by a flask service running on the terminal and fed into the model. The model parses intent, parameters, and tickers to produce a command to execute on the terminal.

## How does Bloomy understand me?
Bloomy uses a combination of rasa NLU and LLM awareness to get the job done. Given a query, rasa picks one of 3 intents: stat lookup, chart generation, or sentiment analysis. Given this query, an API call is sent to our LLM to extract parameters associated with the intent. Using this information, your query is generated. 