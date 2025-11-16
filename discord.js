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
const ONE_MINUTE = 1 * 60 * 1000;

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;

if (!DISCORD_TOKEN) {
  console.error('DISCORD_TOKEN is missing from .env file!');
  console.log('Make sure your .env file has: DISCORD_TOKEN=your_bot_token_here');
  process.exit(1);
}

console.log('Message to Discord Forwarding Bot');
console.log('Checking configuration...');

discordClient.once('ready', () => {
  console.log(`Discord bot logged in as ${discordClient.user.tag}`);
  
  let responseChannel = null;
  for (const guild of discordClient.guilds.cache.values()) {
    responseChannel = guild.channels.cache.find(
      channel => channel.name === "response" && channel.isTextBased()
    );
    
    if (responseChannel) {
      console.log(`Found response channel: #${responseChannel.name} in ${guild.name}`);
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