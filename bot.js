// Require the necessary discord.js classes
const { Client } = require('discord.js');
const { token } = require('./config.json');

// Create a new client instance
const client = new Client({
	intents: ['GUILD_VOICE_STATES', 'GUILD_MESSAGES', 'GUILDS', `GUILD_MESSAGE_REACTIONS`],
});

client.once('ready', () => {
	client.user.setActivity(">help", {type: "PLAYING"}) 
	console.log('Ready!');
});

//client.on('debug', (info) => console.log(info))

// Login to Discord with your client's token
client.login(token);

// export client for other files
exports.client = client

const { handleCommand } = require('./modules/commands.js');
client.on('messageCreate', async (message) => handleCommand(message));
client.on('messageUpdate', async (_, newMessage) => handleCommand(newMessage));

const { voiceStateUpdate, messageReactionAdd } = require('./modules/music_bot.js');
client.on('messageReactionAdd', async (reaction, user) => { messageReactionAdd(reaction, user)});
client.on('voiceStateUpdate', (oldState, newState) => voiceStateUpdate(oldState, newState))