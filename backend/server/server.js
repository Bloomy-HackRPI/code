const express = require('express');

const server = express();
const PORT = 3000;
// endpoint for serving frontend
server.get('/', (req, res) => {

});

// endpoint for api calls
server.post('/api', (req, res) => {
    /*
    * Flow for api call:
    * 1. parse query (maybe the entire conversation is saved as a context?)
    * 2. pass query to rasa, extract intent
    * 3. pass query, intent, intent prompt to LLM, extract parameters
    * 4. run the intent script on the BB terminal with the extracted parameters
    * 5. pass result, intent, query to LLM to generate an NLP-style response
    * 6. respond to client
    */
});

server.listen(PORT, () => {
    console.log('http://localhost:3000');
});