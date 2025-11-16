// global-tracking-bot.js
import { IMessageSDK } from './imessage-kit/dist/index.js';

const bot = new IMessageSDK();
const globalProcessed = new Set(); // Global across all checks
const ONE_MINUTE = 1 * 60 * 1000;
const MY_PHONE = '5083970277';

console.log('🤖 Global Tracking Bot');
console.log('🌍 Tracking messages globally across all checks');

// Track the last echo time to prevent rapid repeats
let lastEchoTime = 0;
const MIN_ECHO_INTERVAL = 5000; // Don't echo more than once every 5 seconds

setInterval(async () => {
  try {
    const result = await bot.getUnreadMessages(20); // Get more messages
    const now = Date.now();
    
    console.log(`\n🔍 ${new Date().toLocaleTimeString()} - Checking ${result.groups?.length} groups`);
    
    // Collect all candidate messages first
    const candidateMessages = [];
    
    for (const group of result.groups || []) {
      for (const msg of group.messages || []) {
        if (!msg?.text || msg.isFromMe) continue;
        
        let msgTime = typeof msg.date === 'number' ? 
          (msg.date > 1000000000000 ? msg.date : msg.date * 1000) : 
          new Date(msg.date).getTime();
        
        if ((now - msgTime) < ONE_MINUTE) {
          candidateMessages.push({
            msg,
            msgTime,
            guid: msg.guid,
            text: msg.text.trim()
          });
        }
      }
    }
    
    console.log(`📊 Found ${candidateMessages.length} candidate messages`);
    
    // Find the most recent unique message
    let messageToEcho = null;
    for (const candidate of candidateMessages) {
      // Create multiple tracking IDs
      const guidId = candidate.guid ? `G-${candidate.guid}` : null;
      const textTimeId = `T-${candidate.text}-${Math.round(candidate.msgTime / 1000)}`;
      
      // Check if we've already processed any version of this message
      const isProcessed = globalProcessed.has(guidId) || globalProcessed.has(textTimeId);
      
      if (!isProcessed && candidate.msgTime > lastEchoTime) {
        messageToEcho = candidate;
        
        // Mark all versions as processed immediately
        if (guidId) globalProcessed.add(guidId);
        globalProcessed.add(textTimeId);
        break; // Take the first unprocessed message
      }
    }
    
    // Echo only one message per check cycle
    if (messageToEcho && (now - lastEchoTime) > MIN_ECHO_INTERVAL) {
      console.log(`🎯 ECHOING: "${messageToEcho.text}"`);
      console.log(`   Time: ${new Date(messageToEcho.msgTime).toLocaleTimeString()}`);
      console.log(`   GUID: ${messageToEcho.guid || 'none'}`);
      
      await bot.send(MY_PHONE, `🤖 ${messageToEcho.text}`);
      lastEchoTime = now;
      console.log('✅ Echoed exactly once!');
    } else if (messageToEcho) {
      console.log(`⏳ Message found but waiting: "${messageToEcho.text}"`);
    } else {
      console.log('⏳ No new unique messages');
    }
    
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
}, 3000);