import { IMessageSDK } from './imessage-kit/dist/index.js';

async function sendCorrectly() {
  try {
    console.log('🚀 Using correct send method signature...');

    const imessage = new IMessageSDK();
    console.log('✅ SDK initialized');

    const phoneNumber = '5083970277';
    const message = 'Hello from Bloomy using correct SDK syntax! 🤖📈';

    // Method 1: Simple string content
    console.log('📤 Sending with string content...');
    const result1 = await imessage.send(phoneNumber, message);
    console.log('✅ String content sent successfully!');
    console.log('Result:', result1);

  } catch (error) {
    console.error('❌ String method failed:', error.message);

    // Method 2: Object content with text property
    await tryObjectContent();
  }
}

async function tryObjectContent() {
  try {
    const imessage = new IMessageSDK();
    const phoneNumber = '5083970277';

    console.log('📤 Sending with object content...');
    const result2 = await imessage.send(phoneNumber, {
      text: 'Hello with object content! 🎯',
      attachments: [] // Empty array for no attachments
    });
    console.log('✅ Object content sent successfully!');
    console.log('Result:', result2);

  } catch (error) {
    console.error('❌ Object method also failed:', error.message);
    console.log('\n💡 The SDK still needs database access even with correct parameters.');
    console.log('We need to fix the Full Disk Access permissions.');
  }
}

sendCorrectly();