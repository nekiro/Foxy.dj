const { prefix } = require('../config.json');
const { play, skip, pause, resume, queue } = require('./music_bot.js');
const { client } = require('../bot.js');

const commands = [
  {
    text: 'ping',
    callback: (message) =>
      message.channel.send(
        `🏓 Reponse latency: ${
          Date.now() - message.createdTimestamp
        }ms. API latency: ${client.ws.ping}ms`
      ),
  },
  {
    text: 'play',
    description: 'play your favorite music',
    callback: async (message) => play(message, true),
  },
  {
    text: 'play-select',
    description: 'play your favorite music',
    callback: async (message) => play(message, false),
  },
  {
    text: 'skip',
    description: 'skip current song',
    callback: async (message) => skip(message.guild),
  },
  {
    text: 'pause',
    description: 'pause current song',
    callback: async (message) => pause(message.guild),
  },
  {
    text: 'resume',
    description: 'resume current song',
    callback: async (message) => resume(message.guild),
  },
  {
    text: 'queue',
    description: 'check current playlist',
    callback: async (message) => queue(message.guild),
  },
  {
    text: 'help',
    callback: (message) => showHelp(message),
  },
];

function showHelp(message) {
  message.reply(
    commands
      .map((c) => `**${c.text}**${c.description ? ` - ${c.description}` : ''}`)
      .join('\n')
  );
}

exports.handleCommand = async (message) => {
  if (message.author.bot || !message.content.startsWith(prefix)) {
    return;
  }

  const args = message.content.substring(1).split(' ');

  const command = commands.find((c) => c.text === args[0]);
  if (!command) {
    console.log(`Unknown command ${args[0]}`);
    return;
  }

  if (command.response) {
    message.channel.send(command.response);
  } else if (command.callback) {
    command.callback(message);
  }
};
