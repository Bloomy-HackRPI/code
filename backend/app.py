from flask import Flask, request, jsonify
from model.classifier import IntentClassifier
from model.llm import ExtractorGPT
app = Flask(__name__)

# ping to test connection
@app.route("/test", methods=["GET"])
def serve():
    """serve frontend"""
    return "success", 200


# upload route for chat
@app.route("/api", methods=["POST"])
def chat():
    """sends message to model"""

    try:
        data = request.get_json()
        message = data['chat']
        intent = classifier.getIntent(message)
        params = llm.parseParameters(intent, message)
        # res = BB.query(intent, params)
        resWithNlp = llm.wrapResult(params, intent)
        return resWithNlp, 200

    except Exception as e:
        print(e)
        return jsonify({"error": str(e)}), 500

    
if __name__ == "__main__":
    classifier = IntentClassifier()
    llm = ExtractorGPT()
    app.run(port=4000)