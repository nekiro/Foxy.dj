const { joinVoiceChannel, AudioPlayerStatus, createAudioResource, createAudioPlayer } = require('@discordjs/voice')
const ytdl = require('ytdl-core');
const ytSearchApi = require('youtube-search-api');

console.log("Music bot initialized")
const queues = new Map()
let optionMessage = null

async function join(message) {
    if (message.member.voice.channel == null) {
        message.channel.send("You have to be in voice channel to use this command.")
        return
    }
    
    const connection = joinVoiceChannel({
        channelId: message.member.voice.channel.id,
        guildId: message.guild.id,
        adapterCreator: message.guild.voiceAdapterCreator
    })

    if (connection == null) {
        message.channel.send("Failed to connect voice channel.")
        return
    }

    let queue = queues.get(message.guild.id)
    if (!queue) {
        // create new queue
        queues.set(message.guild.id, {songs: [], channel: message.channel, voiceChannel: message.member.voice.channel, connection: connection, audioPlayer: createAudioPlayer()})

        queue = queues.get(message.guild.id)
        connection.subscribe(queue.audioPlayer);

        queue.audioPlayer.on(AudioPlayerStatus.Idle, () => {
            play(message.guild.id, queue.songs.shift());
        });

        queue.audioPlayer.on('error', (error, guildId) => {
            console.error(error);
        }, message.guild.id);
    }
}

function skip(guild) {
    const queue = queues.get(guild.id)
    if (!queue || queue.audioPlayer._state.status !== 'playing') {
        return
    }

    queue.audioPlayer.stop()
    play(guild.id, queue.songs.shift())
}

async function queue(guild) {
    const queue = queues.get(guild.id)
    if (!queue) {
        return
    }

    let index = 1
    let msg = await queue.channel.send(`Playlist: ${(queue.songs.length > 0 ? '\n' + queue.songs.map(s => `**${index++}. ${s.title}**\n${s.url}\n`).join('\n') : 'empty')}`)
    msg.suppressEmbeds(true)
}

async function pause(guild) {
    const queue = queues.get(guild.id)
    if (!queue || queue.audioPlayer._state.status !== 'playing') {
        return
    }

    await queue.audioPlayer.pause()
    queue.channel.send(`Playback paused.`)
}

async function resume(guild) {
    const queue = queues.get(guild.id)
    if (!queue || queue.audioPlayer._state.status !== 'paused') {
        return
    }

    await queue.audioPlayer.unpause()
    queue.channel.send(`Playback resumed.`)
}

async function disconnect(guild) {
    const queue = queues.get(guild.id)
    if (!queue) {
        return
    }

    await queue.connection.destroy()
    await queue.audioPlayer.stop()
    queues.delete(guild.id);
}

async function play(guildId, song) {
    const queue = queues.get(guildId);
    if (!song) {
        return
    }

    const stream = await getAudioStreamAsync(song.url);
    await queue.audioPlayer.play(createAudioResource(stream))
    await queue.channel.send(`Now playing: **${song.title}**.`)
}

async function addToQueue(message, skipSelection) {
    let queue = queues.get(message.guild.id)
    if (!queue) {
        join(message)
        queue = queues.get(message.guild.id)
    }

    if (!queue) {
        return
    }

    const args = message.content.split(" ")

    let song = null
    try {
        song = await ytdl.getInfo(args[1])
    } catch (err) {
        delete args[0]
        let list = await ytSearchApi.GetListByKeyword(args.join(","), false, 3)
        if (!skipSelection) {
            list = list.items.map(v => ({ title: v.title, url: `https://youtu.be/${v.id}` }))

            if (list.length == 0) {
                queue.channel.send('Sorry. I couldn\'t find that song.')
                return
            }

            let index = 1
            let response = await message.reply(`Which one?\n${list.map(v => `**${index++}**. ${v.title}`).join("\n")}`)
            response.react("1️⃣")
            response.react("2️⃣")
            response.react("3️⃣")
            optionMessage = {message: response, userId: message.member.user.id, options: list}
            return
        }

        if (list.items.length > 0) {
            try {
                song = await ytdl.getInfo(`https://youtu.be/${list.items[0].id}`)
            } finally {}
        }
    }

    if (!song) {
        queue.channel.send('Sorry. I couldn\'t find that song.')
        return
    }

    addSongToQueue(queue, {url: song.videoDetails.video_url, title: song.videoDetails.title })
}

function addSongToQueue(queue, song) {
    // if its the first song, then play it
    if (queue.audioPlayer._state.status === "idle") {
        play(queue.channel.guildId, song)
    } else {
        queue.songs.push(song)
        queue.channel.send(`Added **${song.title}** to queue.`)
    }
}

function getAudioStreamAsync(url) {
    return new Promise((resolve, reject) => {
        try {
            resolve(ytdl(url, { filter: 'audioonly', bitrate: 128000, highWaterMark: 1 << 25 }))
        } catch (err) {
            reject(err)
        }
    })
}

// hook voice update
async function onVoiceStateUpdate(oldState, newState) {
    const user = await newState.guild.members.cache.get(newState.id)
    if (user.bot) {
        return
    }

    const queue = await queues.get(newState.guild.id);
    if (!queue) {
        return
    }

    if (oldState.channelId === queue.voiceChannel.id && queue.voiceChannel.members.size == 1) {
        disconnect(newState.guild)
    }
}

async function onNewMessageReaction(reaction, user) {
    if (user.bot) {
        return
    }

    // let's make sure it's the correct option message reaction
    if (reaction.message === optionMessage.message && user.id === optionMessage.userId) {
        let song = null
        try {
            if (reaction._emoji.name === '1️⃣') {
                song = await ytdl.getInfo(optionMessage.options[0].url)
            } else if (reaction._emoji.name == '2️⃣') {
                song = await ytdl.getInfo(optionMessage.options[1].url)
            } else if (reaction._emoji.name == '3️⃣') {
                song = await ytdl.getInfo(optionMessage.options[2].url)
            }
        } catch (err) {
            console.log(err)
        }

        if (song) {
            const queue = queues.get(reaction.message.guildId)
            if (queue) {
                addSongToQueue(queue, {url: song.videoDetails.video_url, title: song.videoDetails.title })
            }
        }

        // reset option message object
        optionMessage = null

        // delete option message as we do not need it anymoer
        await reaction.message.delete()
    }
}

module.exports = {
    play: addToQueue,
    skip: skip,
    voiceStateUpdate: onVoiceStateUpdate,
    messageReactionAdd: onNewMessageReaction,
    resume: resume,
    pause: pause,
    queue: queue,
}
