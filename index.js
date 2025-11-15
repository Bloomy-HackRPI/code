require("dotenv").config();
const { Client, GatewayIntentBits } = require("discord.js");
const fs = require('fs').promises;
const path = require('path');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.on("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  const responseChannel = message.guild.channels.cache.find(
    channel => channel.name === "response" && channel.isTextBased()
  );

  if (!responseChannel) {
    console.log("Response channel not found!");
    return;
  }

  if (message.content === "!ping") {
    responseChannel.send("Kachow!");
    return;
  }

  const botMention = `<@${client.user.id}>`;
  const botMentionNick = `<@!${client.user.id}>`;

  if (message.content.includes(botMention) || message.content.includes(botMentionNick)) {
    const cleanedMessage = message.content
      .replace(botMention, "")
      .replace(botMentionNick, "")
      .trim();

    console.log(`Bot mentioned in channel: ${message.channel.name}, message: "${cleanedMessage}"`);
    const userMessage = cleanedMessage.length > 0 ? cleanedMessage : "Empty mention (no text)";
    
    try {
      const filePath = path.join(__dirname, './message.txt');
      await fs.writeFile(filePath, userMessage, 'utf8');
      console.log(`Message written to ${filePath}: "${userMessage}"`);
      
      const fileContent = await fs.readFile(filePath, 'utf8');
      console.log(`Verified file content: "${fileContent}"`);
    } catch (error) {
      console.error('Error writing to file:', error);
    }

    if (cleanedMessage.length === 0) {
      message.reply("Kachow!");
      responseChannel.send("Kachow!");
    } else {
      message.reply("Kachow!");
      responseChannel.send(`**${message.author.username}:** ${cleanedMessage}`);
    }
  }
});

client.login(process.env.TOKEN);