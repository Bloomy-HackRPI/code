import { IMessageSDK } from './imessage-kit/dist/index.js';
import { Client, GatewayIntentBits } from 'discord.js';
import 'dotenv/config'; 

const imessageBot = new IMessageSDK();
const discordClient = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages, 
    GatewayIntentBits.MessageContent
  ]
});

const globalProcessed = new Set();
const discordProcessed = new Set();
const ONE_MINUTE = 1 * 60 * 1000;

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const YOUR_PHONE_NUMBER = process.env.YOUR_PHONE_NUMBER;

if (!DISCORD_TOKEN) {
  console.error('DISCORD_TOKEN is missing from .env file!');
  console.log('Make sure your .env file has: DISCORD_TOKEN=your_bot_token_here');
  process.exit(1);
}

if (!YOUR_PHONE_NUMBER) {
  console.error('YOUR_PHONE_NUMBER is missing from .env file!');
  console.log('Make sure your .env file has: YOUR_PHONE_NUMBER=+1234567890');
  process.exit(1);
}

console.log('Message to Discord Forwarding Bot');
console.log('Checking configuration...');

let globalResponseChannel = null;

discordClient.once('ready', () => {
  console.log(`Discord bot logged in as ${discordClient.user.tag}`);
  
  let responseChannel = null;
  for (const guild of discordClient.guilds.cache.values()) {
    responseChannel = guild.channels.cache.find(
      channel => channel.name === "response" && channel.isTextBased()
    );
    
    if (responseChannel) {
      console.log(`Found response channel: #${responseChannel.name} in ${guild.name}`);
      globalResponseChannel = responseChannel;
      break;
    }
  }
  
  if (responseChannel) {
    startiMessagePolling(responseChannel);
  } else {
    console.log('Response channel not found! Available channels:');
    discordClient.guilds.cache.forEach(guild => {
      console.log(`\nServer: ${guild.name}`);
      guild.channels.cache.forEach(channel => {
        if (channel.isTextBased()) {
          console.log(`   #${channel.name}`);
        }
      });
    });
    process.exit(1);
  }
});

async function sendToPhone(messageText) {
  try {
    console.log(`📱 Sending to phone: "${messageText}"`);
    
    const result = await imessageBot.send(YOUR_PHONE_NUMBER, messageText);
    
    console.log('Message sent to phone successfully!');
    return result;
  } catch (error) {
    console.error('Failed to send message to phone:', error.message);
    
    try {
      console.log('Trying alternative send method...');
      const result = await imessageBot.send(YOUR_PHONE_NUMBER, {
        text: messageText,
        attachments: []
      });
      console.log('Alternative method worked!');
      return result;
    } catch (secondError) {
      console.error('Both methods failed:', secondError.message);
      throw secondError;
    }
  }
}

function startiMessagePolling(responseChannel) {
  console.log('📱 Starting iMessage polling...');
  
  setInterval(async () => {
    try {
      const result = await imessageBot.getUnreadMessages(15);
      const now = Date.now();
      
      let foundNewMessage = false;
      
      for (const group of result.groups || []) {
        for (const msg of group.messages || []) {
          if (!msg?.text || msg.isFromMe) continue;
          
          let msgTime = typeof msg.date === 'number' ? 
            (msg.date > 1000000000000 ? msg.date : msg.date * 1000) : 
            new Date(msg.date).getTime();
          
          if ((now - msgTime) < ONE_MINUTE) {
            const guidId = msg.guid ? `G-${msg.guid}` : null;
            
            if (!globalProcessed.has(guidId)) {
              console.log(`\n📱 New iMessage: "${msg.text}"`);
              console.log(`   Time: ${new Date(msgTime).toLocaleTimeString()}`);
              
              await responseChannel.send(`@Bloomy 📱 iMessage: "${msg.text}"`);
              console.log('Forwarded to Discord!');
              
              if (guidId) globalProcessed.add(guidId);
              foundNewMessage = true;
              break;
            }
          }
        }
        if (foundNewMessage) break;
      }
      
      if (!foundNewMessage) {
        console.log('No new iMessages');
      }
      
    } catch (error) {
      console.log('iMessage polling error:', error.message);
    }
  }, 3000);
}

let pendingAnalysis = new Map();

discordClient.on('messageCreate', async (message) => {
  if (message.author.bot && message.author.id === discordClient.user.id) {
    if (message.content.includes('🔍 Analyzing') && message.content.includes('...')) {
      console.log(`\n📊 Stock analysis started: "${message.content}"`);
      
      const match = message.content.match(/Analyzing (.+?) \((.+?)\)/);
      if (match) {
        const companyName = match[1];
        const stockTicker = match[2];
        
        console.log(`Waiting for analysis completion for ${companyName} (${stockTicker})`);
        
        pendingAnalysis.set(message.id, {
          stockTicker,
          companyName,
          startTime: Date.now(),
          loadingMessage: message
        });
      }
    }
  }
});

discordClient.on('messageCreate', async (message) => {
  if (message.author.bot && message.author.id === discordClient.user.id) {
    if (discordProcessed.has(message.id)) return;
    
    const hasConfidenceScores = 
      message.content.includes('Confidence Scores:') &&
      message.content.includes('Positive:') &&
      message.content.includes('Negative:') &&
      message.content.includes('Neutral:') &&
      message.content.includes('Powered by:');
    
    if (hasConfidenceScores) {
      console.log(`\nComplete analysis detected with confidence scores!`);

      const analysisText = extractCompleteAnalysis(message.content);
      
      if (analysisText) {
        discordProcessed.add(message.id);
        console.log('📤 Sending complete analysis to phone...');
        await sendToPhone(analysisText);
      }
      
      cleanPendingAnalysis();
    }
  }
});

function extractCompleteAnalysis(messageContent) {
  try {
    const lines = messageContent.split('\n');
    let analysisData = {
      priceAnalysis: '',
      overallSentiment: '',
      confidenceScores: [],
      poweredBy: ''
    };
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
    
      if (line.includes('Real-time price analysis for') || line.includes('Market analysis for')) {
        analysisData.priceAnalysis = line;
      }
      
      if (line.includes('Overall Sentiment:')) {
        analysisData.overallSentiment = line.replace('**Overall Sentiment:**', '').trim();
      }
      
      if (line.includes('Positive:') && line.includes('%')) {
        analysisData.confidenceScores.push(line.replace('• 📈', '').trim());
      }
      if (line.includes('Negative:') && line.includes('%')) {
        analysisData.confidenceScores.push(line.replace('• 📉', '').trim());
      }
      if (line.includes('Neutral:') && line.includes('%')) {
        analysisData.confidenceScores.push(line.replace('• 📊', '').trim());
      }
      
      if (line.includes('Powered by:')) {
        analysisData.poweredBy = line.replace('*📊 Powered by:*', '').trim();
      }
    }
   
    if (analysisData.priceAnalysis && analysisData.overallSentiment && analysisData.confidenceScores.length === 3) {
      const formattedAnalysis = `
${analysisData.priceAnalysis}
Overall Sentiment: ${analysisData.overallSentiment}
Confidence Scores:
• 📈 ${analysisData.confidenceScores[0]}
• 📉 ${analysisData.confidenceScores[1]}
• 📊 ${analysisData.confidenceScores[2]}

📊 Powered by: ${analysisData.poweredBy}
${analysisData.poweredBy.includes('Yahoo') ? 'Real market data analysis' : 'Based on current market trends and analysis'}
      `.trim();
      
      console.log('Formatted analysis for phone:', formattedAnalysis);
      return formattedAnalysis;
    }
  } catch (error) {
    console.error('Error parsing analysis:', error);
  }
  
  return null;
}

function cleanPendingAnalysis() {
  const now = Date.now();
  const timeout = 2 * 60 * 1000; 
  
  for (const [messageId, analysis] of pendingAnalysis.entries()) {
    if (now - analysis.startTime > timeout) {
      console.log(`Removing timed out analysis for ${analysis.stockTicker}`);
      pendingAnalysis.delete(messageId);
    }
  }
}

discordClient.on('messageCreate', async (message) => {
  if (message.author.bot && message.author.id === discordClient.user.id) {
    if (discordProcessed.has(message.id)) return;
    
    if (message.content.includes('Confidence Scores:') || 
        message.content.includes('🔍 Analyzing')) {
      return;
    }

    console.log(`\nSimple bot response: "${message.content}"`);
    
    let cleanMessage = message.content
      .replace(/<@!?\d+>/g, '')
      .replace(/<@&\d+>/g, '')
      .replace(/<#\d+>/g, '')
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/_(.*?)_/g, '$1')
      .replace(/`{1,3}(.*?)`{1,3}/g, '$1')
      .trim();
    
    if (cleanMessage.length > 0) {
      discordProcessed.add(message.id);
      await sendToPhone(`Bloomy: ${cleanMessage}`);
    }
  }
});

discordClient.on('error', (error) => {
  console.error('Discord client error:', error);
});

console.log('Logging into Discord...');
discordClient.login(DISCORD_TOKEN).catch(error => {
  console.error('Failed to login to Discord:', error.message);
  console.log('Check your DISCORD_TOKEN in the .env file');
  process.exit(1);
});

process.on('SIGINT', () => {
  console.log('\nShutting down...');
  discordClient.destroy();
  process.exit(0);
});