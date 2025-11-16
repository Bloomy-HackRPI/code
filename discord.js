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
    
    console.log('✅ Message sent to phone successfully!');
    return result;
  } catch (error) {
    console.error('❌ Failed to send message to phone:', error.message);
    
    try {
      console.log('🔄 Trying alternative send method...');
      const result = await imessageBot.send(YOUR_PHONE_NUMBER, {
        text: messageText,
        attachments: []
      });
      console.log('✅ Alternative method worked!');
      return result;
    } catch (secondError) {
      console.error('❌ Both methods failed:', secondError.message);
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
              
              // Just mention Bloomy with the stock ticker to trigger analysis
              await responseChannel.send(`@Bloomy ${msg.text}`);
              console.log('Triggered stock analysis in Discord!');
              
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

// Track the last bot message for each stock request
const lastBotMessages = new Map();

// Listen for ALL bot messages and track the most recent one
discordClient.on('messageCreate', async (message) => {
  if (message.author.bot && message.author.id === discordClient.user.id) {
    if (discordProcessed.has(message.id)) return;
    
    console.log(`\n🤖 Bot message detected: "${message.content.substring(0, 100)}..."`);
    
    // Extract stock ticker from the message if possible
    let stockTicker = null;
    
    // Look for stock ticker in various message formats
    if (message.content.includes('analyzed')) {
      const match = message.content.match(/analyzed .+?\((.+?)\):/);
      if (match) stockTicker = match[1];
    } else if (message.content.includes('Analyzing')) {
      const match = message.content.match(/Analyzing .+?\((.+?)\)/);
      if (match) stockTicker = match[1];
    } else if (message.content.includes('(AAPL)') || message.content.includes('(NVDA)') || message.content.includes('(AVGO)')) {
      // Look for common tickers in parentheses
      const match = message.content.match(/\(([A-Z]{1,5})\)/);
      if (match) stockTicker = match[1];
    }
    
    // If we found a stock ticker, track this as the latest message for that stock
    if (stockTicker) {
      console.log(`📊 Tracking message for stock: ${stockTicker}`);
      lastBotMessages.set(stockTicker, {
        messageId: message.id,
        content: message.content,
        timestamp: Date.now()
      });
      
      // Wait 6 seconds to ensure this is the final message, then send it
      setTimeout(async () => {
        const currentLastMessage = lastBotMessages.get(stockTicker);
        if (currentLastMessage && currentLastMessage.messageId === message.id) {
          console.log(`✅ Sending final analysis for ${stockTicker} to phone...`);
          
          // Clean the message content
          let cleanMessage = message.content
            .replace(/<@!?\d+>/g, '')
            .replace(/<@&\d+>/g, '')
            .replace(/<#\d+>/g, '')
            .replace(/\*\*(.*?)\*\*/g, '$1')
            .replace(/\*(.*?)\*/g, '$1')
            .replace(/_(.*?)_/g, '$1')
            .replace(/`{1,3}(.*?)`{1,3}/g, '$1')
            .trim();
          
          discordProcessed.add(message.id);
          await sendToPhone(cleanMessage);
          
          // Clean up
          lastBotMessages.delete(stockTicker);
        }
      }, 1000); // 6 seconds to ensure it's the final message
    } else {
      // For non-stock messages, check if it's just a mention response
      const isJustMention = 
        message.content.startsWith('@Bloomy') || 
        (message.content.includes('@Bloomy') && message.content.split(' ').length <= 2);
      
      // Skip messages that are just "@Bloomy" or "@Bloomy AVGO" - these are the echo we want to avoid
      if (isJustMention) {
        console.log(`🚫 Skipping mention echo: "${message.content}"`);
        discordProcessed.add(message.id);
        return;
      }
      
      // Only send truly simple responses like "Kachow!"
      console.log(`💬 Simple bot response: "${message.content}"`);
      
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
  }
});

// Clean up old entries periodically
setInterval(() => {
  const now = Date.now();
  const tenMinutes = 10 * 60 * 1000;
  
  for (const [stockTicker, data] of lastBotMessages.entries()) {
    if (now - data.timestamp > tenMinutes) {
      console.log(`🧹 Cleaning up old stock entry: ${stockTicker}`);
      lastBotMessages.delete(stockTicker);
    }
  }
}, 5 * 60 * 1000); // Clean every 5 minutes

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