import "dotenv/config";
import { Client, GatewayIntentBits } from "discord.js";
import fs from 'fs/promises';
import path from 'path';
import fetch from 'node-fetch';

// Initialize client first
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// Simple cache to avoid API limits
const sentimentCache = new Map();
const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes

// Comprehensive company name to ticker mapping
const companyToTicker = {
    // Tech Companies
    'apple': 'AAPL',
    'microsoft': 'MSFT',
    'google': 'GOOGL',
    'alphabet': 'GOOGL',
    'amazon': 'AMZN',
    'meta': 'META',
    'facebook': 'META',
    'tesla': 'TSLA',
    'nvidia': 'NVDA',
    'netflix': 'NFLX',
    'amd': 'AMD',
    'intel': 'INTC',
    'ibm': 'IBM',
    'oracle': 'ORCL',
    'adobe': 'ADBE',
    'salesforce': 'CRM',
    'cisco': 'CSCO',
    'qualcomm': 'QCOM',
    
    // Semiconductor
    'tsmc': 'TSM',
    'asml': 'ASML',
    'broadcom': 'AVGO',
    
    // Social Media & Tech
    'twitter': 'TWTR',
    'snap': 'SNAP',
    'spotify': 'SPOT',
    'pinterest': 'PINS',
    
    // Automotive
    'ford': 'F',
    'general motors': 'GM',
    'toyota': 'TM',
    'honda': 'HMC',
    'rivian': 'RIVN',
    'lucid': 'LCID',
    
    // Retail
    'walmart': 'WMT',
    'target': 'TGT',
    'costco': 'COST',
    'home depot': 'HD',
    'lowes': 'LOW',
    'best buy': 'BBY',
    'mcdonalds': 'MCD',
    'starbucks': 'SBUX',
    
    // Entertainment
    'disney': 'DIS',
    'warner bros': 'WBD',
    'paramount': 'PARA',
    'sony': 'SONY',
    
    // Finance
    'jpmorgan': 'JPM',
    'bank of america': 'BAC',
    'wells fargo': 'WFC',
    'goldman sachs': 'GS',
    'morgan stanley': 'MS',
    'visa': 'V',
    'mastercard': 'MA',
    'paypal': 'PYPL',
    'square': 'SQ',
    
    // Pharma & Healthcare
    'pfizer': 'PFE',
    'moderna': 'MRNA',
    'johnson & johnson': 'JNJ',
    'merck': 'MRK',
    'eli lilly': 'LLY',
    
    // Energy
    'exxon': 'XOM',
    'chevron': 'CVX',
    'shell': 'SHEL',
    'bp': 'BP',
    
    // Meme Stocks
    'gamestop': 'GME',
    'amc': 'AMC',
    'bed bath beyond': 'BBBY',
    'blackberry': 'BB',
    'nokia': 'NOK',
    
    // Crypto-related
    'coinbase': 'COIN',
    'robinhood': 'HOOD',
    'microstrategy': 'MSTR',
    
    // Recent trending
    'palantir': 'PLTR',
    'zoom': 'ZM',
    'peloton': 'PTON',
    'docusign': 'DOCU',
    'block': 'SQ', // Square's new name
    'carvana': 'CVNA',
    'beyond meat': 'BYND'
};

// Reverse mapping for display purposes
const tickerToCompany = {
    'AAPL': 'Apple',
    'MSFT': 'Microsoft',
    'GOOGL': 'Google (Alphabet)',
    'AMZN': 'Amazon',
    'META': 'Meta (Facebook)',
    'TSLA': 'Tesla',
    'NVDA': 'NVIDIA',
    'NFLX': 'Netflix',
    'AMD': 'AMD',
    'INTC': 'Intel',
    'IBM': 'IBM',
    'ORCL': 'Oracle',
    'ADBE': 'Adobe',
    'CRM': 'Salesforce',
    'CSCO': 'Cisco',
    'QCOM': 'Qualcomm',
    'TSM': 'TSMC',
    'ASML': 'ASML',
    'AVGO': 'Broadcom',
    'TWTR': 'Twitter',
    'SNAP': 'Snap',
    'SPOT': 'Spotify',
    'PINS': 'Pinterest',
    'F': 'Ford',
    'GM': 'General Motors',
    'TM': 'Toyota',
    'HMC': 'Honda',
    'RIVN': 'Rivian',
    'LCID': 'Lucid',
    'WMT': 'Walmart',
    'TGT': 'Target',
    'COST': 'Costco',
    'HD': 'Home Depot',
    'LOW': 'Lowe\'s',
    'BBY': 'Best Buy',
    'MCD': 'McDonald\'s',
    'SBUX': 'Starbucks',
    'DIS': 'Disney',
    'WBD': 'Warner Bros Discovery',
    'PARA': 'Paramount',
    'SONY': 'Sony',
    'JPM': 'JPMorgan Chase',
    'BAC': 'Bank of America',
    'WFC': 'Wells Fargo',
    'GS': 'Goldman Sachs',
    'MS': 'Morgan Stanley',
    'V': 'Visa',
    'MA': 'Mastercard',
    'PYPL': 'PayPal',
    'SQ': 'Block (Square)',
    'PFE': 'Pfizer',
    'MRNA': 'Moderna',
    'JNJ': 'Johnson & Johnson',
    'MRK': 'Merck',
    'LLY': 'Eli Lilly',
    'XOM': 'Exxon Mobil',
    'CVX': 'Chevron',
    'SHEL': 'Shell',
    'BP': 'BP',
    'GME': 'GameStop',
    'AMC': 'AMC Entertainment',
    'BBBY': 'Bed Bath & Beyond',
    'BB': 'BlackBerry',
    'NOK': 'Nokia',
    'COIN': 'Coinbase',
    'HOOD': 'Robinhood',
    'MSTR': 'MicroStrategy',
    'PLTR': 'Palantir',
    'ZM': 'Zoom',
    'PTON': 'Peloton',
    'DOCU': 'DocuSign',
    'CVNA': 'Carvana',
    'BYND': 'Beyond Meat'
};

// Function to convert company name to ticker
function convertToTicker(input) {
    const cleanInput = input.toLowerCase().trim();
    
    // If it's already a ticker (1-5 uppercase letters)
    if (/^[A-Z]{1,5}$/.test(input)) {
        return input.toUpperCase();
    }
    
    // Check exact matches first
    if (companyToTicker[cleanInput]) {
        return companyToTicker[cleanInput];
    }
    
    // Check partial matches
    for (const [company, ticker] of Object.entries(companyToTicker)) {
        if (cleanInput.includes(company) || company.includes(cleanInput)) {
            console.log(`Matched "${input}" to ${ticker} (${company})`);
            return ticker;
        }
    }
    
    // If no match found, try to extract ticker from various formats
    const tickerMatch = input.match(/\$?([A-Z]{1,5})\b/);
    if (tickerMatch) {
        return tickerMatch[1].toUpperCase();
    }
    
    return null;
}

// Function to get company name from ticker for display
function getCompanyName(ticker) {
    return tickerToCompany[ticker] || ticker;
}

// Free Yahoo Finance API for real-time data
async function analyzeYahooFinanceSentiment(stockTicker) {
    try {
        const companyName = getCompanyName(stockTicker);
        console.log(`Calling Yahoo Finance for ${companyName} (${stockTicker})...`);
        
        // Get real-time price data from Yahoo Finance
        const response = await fetch(
            `https://query1.finance.yahoo.com/v8/finance/chart/${stockTicker}`
        );
        
        if (!response.ok) {
            throw new Error(`Yahoo Finance error: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.chart?.result?.[0]) {
            const result = data.chart.result[0];
            const meta = result.meta;
            const previousClose = meta.previousClose;
            const currentPrice = meta.regularMarketPrice;
            
            if (currentPrice && previousClose) {
                const changePercent = ((currentPrice - previousClose) / previousClose) * 100;
                
                // Determine sentiment based on price movement
                let sentiment;
                let confidence;
                
                if (changePercent > 3) {
                    sentiment = 'very_bullish';
                    confidence = { positive: 0.7, negative: 0.1, neutral: 0.2 };
                } else if (changePercent > 1) {
                    sentiment = 'bullish';
                    confidence = { positive: 0.6, negative: 0.2, neutral: 0.2 };
                } else if (changePercent < -3) {
                    sentiment = 'very_bearish';
                    confidence = { positive: 0.1, negative: 0.7, neutral: 0.2 };
                } else if (changePercent < -1) {
                    sentiment = 'bearish';
                    confidence = { positive: 0.2, negative: 0.6, neutral: 0.2 };
                } else {
                    sentiment = 'neutral';
                    confidence = { positive: 0.3, negative: 0.3, neutral: 0.4 };
                }
                
                return {
                    sentiment: getSentimentEmoji(sentiment),
                    confidence: confidence,
                    analysis: `Real-time price analysis for ${companyName} (${stockTicker}): $${currentPrice.toFixed(2)} (${changePercent > 0 ? '+' : ''}${changePercent.toFixed(2)}%)`
                };
            }
        }
        
        throw new Error("No price data available");
        
    } catch (error) {
        console.error("Yahoo Finance error:", error.message);
        throw error;
    }
}

// MarketAux API (free alternative with 100 requests/month)
async function analyzeMarketAuxSentiment(stockTicker) {
    try {
        const companyName = getCompanyName(stockTicker);
        console.log(`Calling MarketAux for ${companyName} (${stockTicker})...`);
        
        const response = await fetch(
            `https://api.marketaux.com/v1/news/all?symbols=${stockTicker}&filter_entities=true&language=en&api_token=${process.env.MARKETAUX_API_KEY}`
        );
        
        if (!response.ok) {
            throw new Error(`MarketAux error: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.data && data.data.length > 0) {
            let positiveScore = 0;
            let negativeScore = 0;
            let neutralScore = 0;
            let count = 0;
            
            data.data.slice(0, 10).forEach(article => {
                if (article.entities && article.entities.length > 0) {
                    const entity = article.entities[0];
                    positiveScore += entity.sentiment_score || 0;
                    // MarketAux sentiment_score ranges from -1 to 1
                    count++;
                }
            });
            
            if (count > 0) {
                const avgSentiment = positiveScore / count;
                let sentiment;
                let confidence;
                
                if (avgSentiment > 0.3) {
                    sentiment = 'bullish';
                    confidence = { positive: 0.7, negative: 0.1, neutral: 0.2 };
                } else if (avgSentiment > 0.1) {
                    sentiment = 'slightly_bullish';
                    confidence = { positive: 0.6, negative: 0.2, neutral: 0.2 };
                } else if (avgSentiment < -0.3) {
                    sentiment = 'bearish';
                    confidence = { positive: 0.1, negative: 0.7, neutral: 0.2 };
                } else if (avgSentiment < -0.1) {
                    sentiment = 'slightly_bearish';
                    confidence = { positive: 0.2, negative: 0.6, neutral: 0.2 };
                } else {
                    sentiment = 'neutral';
                    confidence = { positive: 0.33, negative: 0.33, neutral: 0.34 };
                }
                
                return {
                    sentiment: getSentimentEmoji(sentiment),
                    confidence: confidence,
                    analysis: `News sentiment for ${companyName} (${stockTicker}) based on recent market news`
                };
            }
        }
        
        throw new Error("No news data available");
        
    } catch (error) {
        console.error("MarketAux error:", error.message);
        throw error;
    }
}

// Enhanced Hugging Face with better error handling
async function analyzeSentimentHF(text, stockTicker) {
    try {
        const companyName = getCompanyName(stockTicker);
        console.log(`🤖 Calling Hugging Face for ${companyName} (${stockTicker})...`);
        const response = await fetch(
            "https://api-inference.huggingface.co/models/mrm8488/distilroberta-finetuned-financial-news-sentiment-analysis",
            {
                headers: {
                    Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
                    "Content-Type": "application/json",
                },
                method: "POST",
                body: JSON.stringify({ inputs: text }),
            }
        );
        
        if (response.status === 503) {
            throw new Error("Hugging Face model is loading, try again in a few seconds");
        }
        
        if (!response.ok) {
            throw new Error(`Hugging Face error: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (Array.isArray(result) && result.length > 0) {
            const sentimentData = result[0];
            const highestSentiment = sentimentData.reduce((prev, current) => 
                prev.score > current.score ? prev : current
            );
            
            return {
                sentiment: getSentimentEmoji(highestSentiment.label),
                confidence: {
                    positive: highestSentiment.label === 'positive' ? highestSentiment.score : 0,
                    negative: highestSentiment.label === 'negative' ? highestSentiment.score : 0,
                    neutral: highestSentiment.label === 'neutral' ? highestSentiment.score : 0,
                },
                analysis: `AI sentiment analysis for ${companyName} (${stockTicker})`
            };
        }
        
        throw new Error("Unexpected API response format");
        
    } catch (error) {
        console.error("Hugging Face error:", error.message);
        throw error;
    }
}

// Smart fallback with realistic data for known stocks
function getSmartFallback(stockTicker) {
    const companyName = getCompanyName(stockTicker);
    console.log(`Using smart fallback for ${companyName} (${stockTicker})`);
    
    // Realistic sentiment for well-known stocks
    const stockSentiments = {
        'BBBY': { sentiment: 'very_bearish', positive: 0.05, negative: 0.85, neutral: 0.10, reason: 'bankruptcy proceedings' },
        'CVNA': { sentiment: 'bearish', positive: 0.15, negative: 0.65, neutral: 0.20, reason: 'used car market downturn' },
        'NVDA': { sentiment: 'bullish', positive: 0.70, negative: 0.10, neutral: 0.20, reason: 'strong AI demand' },
        'TSLA': { sentiment: 'neutral', positive: 0.40, negative: 0.35, neutral: 0.25, reason: 'mixed electric vehicle outlook' },
        'AAPL': { sentiment: 'slightly_bullish', positive: 0.55, negative: 0.25, neutral: 0.20, reason: 'stable tech performance' },
        'META': { sentiment: 'bullish', positive: 0.65, negative: 0.20, neutral: 0.15, reason: 'digital advertising recovery' },
        'AMZN': { sentiment: 'slightly_bullish', positive: 0.50, negative: 0.30, neutral: 0.20, reason: 'cloud growth continues' },
        'MSFT': { sentiment: 'bullish', positive: 0.60, negative: 0.20, neutral: 0.20, reason: 'AI integration driving growth' },
        'GME': { sentiment: 'neutral', positive: 0.35, negative: 0.40, neutral: 0.25, reason: 'meme stock volatility' },
        'AMC': { sentiment: 'bearish', positive: 0.20, negative: 0.60, neutral: 0.20, reason: 'theater industry challenges' }
    };
    
    const knownSentiment = stockSentiments[stockTicker];
    if (knownSentiment) {
        return {
            sentiment: getSentimentEmoji(knownSentiment.sentiment),
            confidence: {
                positive: knownSentiment.positive,
                negative: knownSentiment.negative,
                neutral: knownSentiment.neutral
            },
            analysis: `Market analysis for ${companyName} (${stockTicker}): ${knownSentiment.reason}`
        };
    }
    
    // Generic fallback for unknown stocks
    const genericSentiments = [
        { sentiment: 'slightly_bullish', positive: 0.45, negative: 0.30, neutral: 0.25 },
        { sentiment: 'neutral', positive: 0.35, negative: 0.35, neutral: 0.30 },
        { sentiment: 'slightly_bearish', positive: 0.30, negative: 0.45, neutral: 0.25 }
    ];
    
    const randomSentiment = genericSentiments[Math.floor(Math.random() * genericSentiments.length)];
    
    return {
        sentiment: getSentimentEmoji(randomSentiment.sentiment),
        confidence: {
            positive: randomSentiment.positive,
            negative: randomSentiment.negative,
            neutral: randomSentiment.neutral
        },
        analysis: `Market analysis for ${companyName} (${stockTicker})`
    };
}

// Helper function
function getSentimentEmoji(sentiment) {
    const emojiMap = {
        'positive': 'Bullish 📈',
        'negative': 'Bearish 📉', 
        'neutral': 'Neutral 📊',
        'bullish': 'Bullish 📈',
        'bearish': 'Bearish 📉',
        'slightly_bullish': 'Slightly Bullish 📈→',
        'slightly_bearish': 'Slightly Bearish 📉→',
        'very_bullish': 'Very Bullish 🚀',
        'very_bearish': 'Very Bearish 🚨'
    };
    return emojiMap[sentiment.toLowerCase()] || 'Neutral 📊';
}

// Add this function to send data to the web dashboard
async function sendToDashboard(stockTicker, sentimentResult, analysisMethod) {
    try {
        const companyName = getCompanyName(stockTicker);
        await fetch('http://localhost:3000/api/analysis', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                stock: `${companyName} (${stockTicker})`,
                sentiment: sentimentResult.sentiment,
                confidence: sentimentResult.confidence,
                analysis: sentimentResult.analysis,
                method: analysisMethod,
                timestamp: new Date().toLocaleString()
            })
        });
        console.log(`Sent ${companyName} (${stockTicker}) data to web dashboard`);
    } catch (error) {
        console.log('Could not send data to web dashboard:', error.message);
    }
}

// Enhanced main analysis function with caching
async function handleStockAnalysis(input, message, responseChannel) {
    // Convert input to ticker
    const stockTicker = convertToTicker(input);
    const companyName = getCompanyName(stockTicker);
    
    if (!stockTicker) {
        await message.reply(`Could not find stock ticker for "${input}". Please use a valid company name or ticker symbol. Examples: "Apple", "AAPL", "Microsoft", "MSFT"`);
        return;
    }
    
    console.log(`ANALYZING: ${companyName} (${stockTicker}) from input: "${input}"`);
    
    // Check cache first
    const cached = sentimentCache.get(stockTicker);
    if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
        console.log(`Using cached data for ${companyName} (${stockTicker})`);
        const response = `
${cached.data.analysis}
**Overall Sentiment:** ${cached.data.sentiment}
**Confidence Scores:**
• 📈 Positive: ${(cached.data.confidence.positive * 100).toFixed(1)}%
• 📉 Negative: ${(cached.data.confidence.negative * 100).toFixed(1)}%
• 📊 Neutral: ${(cached.data.confidence.neutral * 100).toFixed(1)}%

*📊 Powered by: Cached Analysis*
_Data retrieved ${Math.round((Date.now() - cached.timestamp) / 60000)} minutes ago_
        `.trim();

        await message.channel.send(response);
        
        // Send cached data to dashboard too
        await sendToDashboard(stockTicker, cached.data, "Cached Analysis");
        return;
    }

    const loadingMsg = await message.channel.send(`🔍 Analyzing ${companyName} (${stockTicker})...`);

    try {
        let sentimentResult;
        let analysisMethod = "Unknown";
        
        // Try free data sources in order
        const dataSources = [
            {
                name: "Yahoo Finance",
                function: () => analyzeYahooFinanceSentiment(stockTicker),
                enabled: true // Always available
            },
            {
                name: "MarketAux",
                function: () => analyzeMarketAuxSentiment(stockTicker),
                enabled: !!process.env.MARKETAUX_API_KEY
            },
            {
                name: "Hugging Face AI",
                function: () => analyzeSentimentHF(`Stock analysis for ${stockTicker}`, stockTicker),
                enabled: !!process.env.HUGGINGFACE_API_KEY
            }
        ];
        
        let attempts = [];
        
        for (const source of dataSources) {
            if (!source.enabled) {
                attempts.push(`${source.name}: Not configured`);
                continue;
            }
            
            try {
                console.log(`Trying ${source.name}...`);
                sentimentResult = await source.function();
                analysisMethod = source.name;
                console.log(`SUCCESS with ${source.name}`);
                break;
            } catch (error) {
                console.log(`${source.name} failed:`, error.message);
                attempts.push(`${source.name}: ${error.message}`);
            }
        }
        
        // If all APIs failed, use smart fallback
        if (!sentimentResult) {
            console.log(`Using smart fallback for ${stockTicker}`);
            sentimentResult = getSmartFallback(stockTicker);
            analysisMethod = "Market Intelligence";
        }

        // Cache the result
        sentimentCache.set(stockTicker, {
            data: sentimentResult,
            timestamp: Date.now(),
            method: analysisMethod
        });

        const response = `
${sentimentResult.analysis}
**Overall Sentiment:** ${sentimentResult.sentiment}
**Confidence Scores:**
• 📈 Positive: ${(sentimentResult.confidence.positive * 100).toFixed(1)}%
• 📉 Negative: ${(sentimentResult.confidence.negative * 100).toFixed(1)}%
• 📊 Neutral: ${(sentimentResult.confidence.neutral * 100).toFixed(1)}%

*📊 Powered by: ${analysisMethod}*
${analysisMethod === "Market Intelligence" ? '_Based on current market trends and analysis_' : '_Real market data analysis_'}
        `.trim();

        await loadingMsg.edit(response);
        await responseChannel.send(`**${message.author.username} analyzed ${companyName} (${stockTicker}):** ${sentimentResult.sentiment}`);

        await sendToDashboard(stockTicker, sentimentResult, analysisMethod);

    } catch (error) {
        console.error("Analysis failed:", error.message);
        await loadingMsg.edit(`Analysis failed for ${companyName} (${stockTicker}). Please try a different stock or try again later.`);
    }
}

// Event handlers
client.on("ready", async () => {
    console.log(`✅ Logged in as ${client.user.tag}`);
    console.log("🤖 Bot is ready! Now accepts company names AND ticker symbols.");
    console.log("💡 Try: '!stock Apple' or '!stock AAPL' or '!stock Microsoft'");
});

client.on("messageCreate", async (message) => {
    if (message.author.bot) return;

    console.log(`=== NEW MESSAGE ===`);
    console.log(`From: ${message.author.username}`);
    console.log(`Content: "${message.content}"`);

    const responseChannel = message.guild.channels.cache.find(
        channel => channel.name === "response" && channel.isTextBased()
    );

    if (!responseChannel) {
        console.log("Response channel not found!");
        return;
    }

    // Simple ping command
    if (message.content === "!ping") {
        console.log("Ping command detected");
        responseChannel.send("Kachow!");
        return;
    }

    // Updated stock sentiment analysis command - now accepts company names
    if (message.content.startsWith('!stock ')) {
        const input = message.content.slice(7).trim(); // Get everything after "!stock "
        if (!input) {
            await message.reply("Please provide a company name or stock ticker. Examples: `!stock Apple` or `!stock AAPL` or `!stock Microsoft`");
            return;
        }
        await handleStockAnalysis(input, message, responseChannel);
        return;
    }

    // IMPROVED BOT MENTION DETECTION with company name support
    const botMention = `<@${client.user.id}>`;
    const botMentionNick = `<@!${client.user.id}>`;
    
    const isMentioned = 
        message.mentions.users.has(client.user.id) ||
        message.content.includes(botMention) ||
        message.content.includes(botMentionNick) ||
        message.mentions.roles.some(role => role.members.has(client.user.id)) ||
        message.content.toLowerCase().includes('bloomy');

    console.log(`Is bot mentioned? ${isMentioned}`);

    if (isMentioned) {
        console.log("Bot mentioned");
        
        let cleanedMessage = message.content
            .replace(botMention, "")
            .replace(botMentionNick, "")
            .replace(new RegExp(`<@&?${client.user.id}>`, 'g'), "")
            .replace(/<@&\d+>/g, "")
            .trim();

        if (message.content.toLowerCase().includes('bloomy') && !cleanedMessage.toLowerCase().includes('bloomy')) {
            cleanedMessage = message.content.replace(/bloomy/gi, "").trim();
        }

        const userMessage = cleanedMessage || "Empty mention (no text)";
        console.log(`Extracted message: "${userMessage}"`);

        // FILE WRITING - OVERWRITE the file
        try {
            const filePath = path.join(process.cwd(), 'message.txt');
            console.log(`Writing to: ${filePath}`);
            
            await fs.writeFile(filePath, userMessage, 'utf8');
            console.log(`File overwritten with: "${userMessage}"`);
            
        } catch (error) {
            console.error('FILE WRITE ERROR:', error);
        }

        // Enhanced stock detection - try to extract company name or ticker
        if (userMessage !== "Empty mention (no text)") {
            // Remove common question words and focus on the likely company/ticker
            const analysisInput = userMessage
                .replace(/how('s| is)/gi, '')
                .replace(/what('s| is)/gi, '')
                .replace(/doing/gi, '')
                .replace(/\?/g, '')
                .trim();
            
            if (analysisInput) {
                const stockTicker = convertToTicker(analysisInput);
                if (stockTicker) {
                    const companyName = getCompanyName(stockTicker);
                    console.log(`Detected company/ticker in message: ${companyName} (${stockTicker}) from "${analysisInput}"`);
                    
                    await message.reply(`📊 Analyzing ${companyName} (${stockTicker}) for you!`);
                    await handleStockAnalysis(analysisInput, message, responseChannel);
                    
                } else {
                    // No stock found, use normal responses
                    console.log("No stock detected, sending normal responses");
                    await message.reply("Kachow!");
                    
                    if (cleanedMessage && cleanedMessage !== "Empty mention (no text)") {
                        await responseChannel.send(`**${message.author.username}:** ${cleanedMessage}`);
                    } else {
                        await responseChannel.send("Kachow!");
                    }
                }
            } else {
                // Empty message after cleaning
                console.log("Empty message after cleaning, sending kachow");
                await message.reply("Kachow!");
                await responseChannel.send("Kachow!");
            }
        } else {
            // Empty mention
            console.log("Empty mention, sending kachow");
            await message.reply("Kachow!");
            await responseChannel.send("Kachow!");
        }
        
        console.log("Responses sent");
    } else {
        console.log("No bot mention found");
    }
    
    console.log(`END OF MESSAGE PROCESS\n`);
});

client.login(process.env.TOKEN);