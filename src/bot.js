const { Client } = require('discord.js');
const { handleCommand } = require('./modules/commands.js');
const {
  voiceStateUpdate,
  messageReactionAdd,
} = require('./modules/music_bot.js');

const client = new Client({
  intents: [
    'GUILD_VOICE_STATES',
    'GUILD_MESSAGES',
    'GUILDS',
    `GUILD_MESSAGE_REACTIONS`,
  ],
});

client.once('ready', () => {
  client.user.setActivity('>help', { type: 'PLAYING' });
  console.log('Ready!');
});

//client.on('debug', (info) => console.log(info))

client.login(process.env.TOKEN);
client.on('messageCreate', async (message) => handleCommand(message));
client.on('messageUpdate', async (_, newMessage) => handleCommand(newMessage));
client.on('messageReactionAdd', async (reaction, user) =>
  messageReactionAdd(reaction, user)
);
client.on('voiceStateUpdate', (oldState, newState) =>
  voiceStateUpdate(oldState, newState)
);

exports.client = client;
