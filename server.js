import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Store latest analysis data
let latestAnalysis = {
    stock: '',
    sentiment: '',
    confidence: { positive: 0, negative: 0, neutral: 0 },
    analysis: '',
    timestamp: null,
    method: ''
};

// API endpoint to get latest analysis
app.get('/api/analysis', (req, res) => {
    res.json(latestAnalysis);
});

// API endpoint to receive new analysis from Discord bot
app.post('/api/analysis', (req, res) => {
    const { stock, sentiment, confidence, analysis, method } = req.body;
    
    latestAnalysis = {
        stock,
        sentiment,
        confidence,
        analysis,
        method,
        timestamp: new Date().toLocaleString()
    };
    
    console.log(`📊 Updated analysis for ${stock}: ${sentiment}`);
    res.json({ success: true });
});

// Serve the main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`🌐 Web dashboard running at http://localhost:${PORT}`);
    console.log(`📊 API available at http://localhost:${PORT}/api/analysis`);
});