from flask import Flask, request, jsonify
from model.classifier import IntentClassifier
from model.llm import ExtractorGPT
import httpx

app = Flask(__name__)

# ping to test connection
@app.route("/test", methods=["GET"])
def serve():
    """serve frontend"""
    return "success", 200


# upload route for chat
@app.route("/api", methods=["POST"])
async def chat():
    """sends message to model"""

    try:
        data = request.get_json()
        message = data['chat']
        
        intent = classifier.getIntent(message)
        print(intent)
        
        params = llm.parseParameters(intent, message)
        print(params)

        async with httpx.AsyncClient() as client:

            endpoint = None
            if intent == 'get_stat':
                endpoint = '/lookup'
            elif intent == 'get_chart':
                endpoint = '/chart'
            else:
                endpoint = '/ping'

            resp = await client.post(f"https://60434d3ecd84.ngrok-free.app{endpoint}", json=params, headers={"Content-Type": "application/json"})
            bloomberg = resp.json()

        return jsonify(bloomberg), 200

    except Exception as e:
        print(e)
        return jsonify({"error": str(e)}), 500

    
if __name__ == "__main__":
    classifier = IntentClassifier()
    llm = ExtractorGPT()
    app.run(port=4000)