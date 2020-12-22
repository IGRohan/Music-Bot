const Discord = require('discord.js')
const client = new Discord.Client()
require('dotenv').config()

const fs = require('fs')
client.commands = new Discord.Collection()
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'))
for(const file of commandFiles) {
    const commands = require(`./commands/${file}`)
    client.commands.set(commands.name, commands)
    console.log(`Successfully Loaded command ${commands.name}`)
}

const ytdl = require('ytdl-core')
const ytsearch = require('yt-search')
const { split } = require('ffmpeg-static')
const queue = new Map()

client.once('ready', () => {
    console.log(`${client.user.username} has Logged In!`)
})

client.on('message', async message => {
    const prefix = process.env.prefix
    if(!message.guild) return; 
    if(message.author.bot) return;
    if(!message.content.startsWith(prefix)) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/g)
    const command = args.shift().toLowerCase()

    const cmd = client.commands.get(command)
    if(cmd) cmd.execute(client, message, args)

    if(command === 'check') {
        
    }

    //Defining Server Queue
    const serverQueue = queue.get(message.guild.id)
    //Defining some other necessary things
    const url = args[0] ? args[0].replace(/<(.+)>/g, '$1') : ''

    // PLAY COMMAND
    // Usage: play <song name>

    if(command === 'play') {

        const voiceChannel = message.member.voice.channel;
        if(!voiceChannel) return message.channel.send(`You need to be in a voice channel to play music!`)
        const permissions = voiceChannel.permissionsFor(message.client.user)
        if(!permissions.has('CONNECT')) return message.channel.send(`I don\'t have permissions to connect to voice channels!`)
        if(!permissions.has('SPEAK')) return message.channel.send(`I don\'t have permissions to speak in the voice channels!`)
        if(!args[0]) return message.channel.send(`You need to provide a song name or youtube link in order to play it!`)

        const videoSearch = async(query) => {
            const videoResult = await ytsearch(query)
            return videoResult.videos[0]
        }

        try {
            var videoID = getID(args[0])
            var video = await ytsearch({ videoId: videoID })
        } catch {
            try {
                var video = await videoSearch(args.join(' '))
            } catch {
                return message.channel.send(`Could Not find any videos with this name, try using a youtube link!`)
            }
        }

        const song = {
            id: video.id,
            title: video.title,
            url: video.url,
            thumbnail: video.thumbnail,
            views: video.views,
            upload: video.ago,
            duration: video.duration
        }
        
        //If no queue, make one!
        if(!serverQueue) {
            const queueConstruct = {
                textChannel: message.channel,
                voiceChannel: voiceChannel,
                connection: null,
                songs: [],
                volume: 5,
                playing: true
            }
            queue.set(message.guild.id, queueConstruct)
            queueConstruct.songs.push(song)

            try {
                var connection = await voiceChannel.join() 
                queueConstruct.connection = connection
                play(message.guild, queueConstruct.songs[0])          
            } catch (error) {
                console.log(error)
                queue.delete(message.guild.id)
                return message.channel.send(`There was an error joining the voice channel! \n\n **Console Error:** ${error}`)
            }
        } else {
            serverQueue.songs.push(song)
            const songAdded = new Discord.MessageEmbed()
            .setDescription(`**${song.title}** has been added to queue`)
            return message.channel.send(songAdded)
        }
        return undefined

    } 
    // STOP COMMAND
    // Usage: stop 
    if(command === 'stop') {
        const voiceChannel = message.member.voice.channel;
        if(!voiceChannel) return message.channel.send(`You need to be in a voice channel to stop music!`)
        if(!serverQueue) return message.channel.send(`There is nothing playing!`)
        serverQueue.songs = []
        serverQueue.connection.dispatcher.end()
        message.channel.send(`Stopped the Music!`)
        return undefined
    }
    // SKIP COMMAND
    // Usage: skip
    if(command === 'skip') {
        const voiceChannel = message.member.voice.channel;
        if(!voiceChannel) return message.channel.send(`You need to be in a voice channel to skip music!`)
        if(!serverQueue) return message.channel.send(`There is nothing playing!`)
        serverQueue.connection.dispatcher.end()
        message.channel.send(`Skipped the Music!`)
        return undefined
    }
    // VOLUME COMMAND
    // Usage: volume [amount between 1-10]
    if(command === 'volume') {
        const voiceChannel = message.member.voice.channel;
        if(!voiceChannel) return message.channel.send(`You need to be in a voice channel to change music volume!`)
        if(!serverQueue) return message.channel.send(`There is nothing playing!`)
        if(!args[0]) return message.channel.send(`Current Music Volume is \`${serverQueue.volume}\``)
        if(isNaN(args[0])) return message.channel.send(`This is an invalid number!`)
        if(args[0] > 10) return message.channel.send(`Volume cannot be increased to higher than 10.`)
        serverQueue.volume = args[0]
        serverQueue.connection.dispatcher.setVolumeLogarithmic(args[0] / 5) 
        message.channel.send(`I have change the music volume to: **${args[0]}**`)
        return undefined
    }
    // NOW PLAYING COMMAND
    // Usage: np or nowplaying
    if(command === 'nowplaying') {
        if(!serverQueue) return message.channel.send(`There is nothing playing!`)
        const npEmbed = new Discord.MessageEmbed()
        .setDescription(`Now Playing: **${serverQueue.songs[0].title}**`)
        return undefined
    }
    // QUEUE COMMAND
    // Usage: queue
    if(command === 'queue') {
        if(!serverQueue) return message.channel.send(`There is nothing playing!`)
        const queueEmbed = new Discord.MessageEmbed()
        .setDescription(`
__**📃 Server Queue**__
${serverQueue.songs.map(song => `**-** ${song.title}`).join('\n')}
        
**Now Playing:** ${serverQueue.songs[0].title}`, { split: true })
        .setColor('BLUE')

        message.channel.send(queueEmbed)
        return undefined
    }
    // PAUSE COMMAND
    // Usage: pause
    if(command === 'pause') {
        const voiceChannel = message.member.voice.channel;
        if(!voiceChannel) return message.channel.send(`You need to be in a voice channel to pause music!`)
        if(!serverQueue) return message.channel.send(`There is nothing playing!`)
        if(!serverQueue.playing) return message.channel.send(`Music is already paused!`)

        serverQueue.playing = false
        serverQueue.connection.dispatcher.pause()
        const pauseEmbed = new Discord.MessageEmbed()
        .setDescription(`Music has been Paused!`)
        .setColor('BLUE')
        message.channel.send(pauseEmbed)
        return undefined
    }
    // RESUME COMMAND
    // Usage: resume
    if(command === 'resume') {
        const voiceChannel = message.member.voice.channel;
        if(!voiceChannel) return message.channel.send(`You need to be in a voice channel to resume music!`)
        if(!serverQueue) return message.channel.send(`There is nothing playing!`)
        if(serverQueue.playing) return message.channel.send(`Music is already playing!`)

        serverQueue.playing = true
        serverQueue.connection.dispatcher.resume()
        const resumeEmbed = new Discord.MessageEmbed()
        .setDescription(`Music has been Resumed!`)
        .setColor('BLUE')
        message.channel.send(resumeEmbed)
        return undefined
    }

})

function play(guild, song) {
    const serverQueue = queue.get(guild.id)

    if(!song) {
        queue.delete(guild.id)
        return
    }

    const dispatcher = serverQueue.connection.play(ytdl(song.url, { filter: 'audioonly' }))
        dispatcher.on('finish', () => {
            serverQueue.songs.shift()
            play(guild, serverQueue.songs[0])
        })
        dispatcher.on('error', error => {
            console.log(error)
        })
        dispatcher.setVolumeLogarithmic(serverQueue.volume / 5)

        const songStart = new Discord.MessageEmbed()
        .setAuthor(`Started Playing: ${song.title}`)
        .setThumbnail(song.thumbnail)
        .setColor('#FFFFFF')
        .addField('**Views:**', song.views)
        .addField('**Duration:**', song.duration)
        .addField('**Uploaded On:**', song.upload)
        serverQueue.textChannel.send(songStart)
}

function getID(url){
    var ID = '';
    url = url.replace(/(>|<)/gi,'').split(/(vi\/|v=|\/v\/|youtu\.be\/|\/embed\/)/);
    if(url[2] !== undefined) {
      ID = url[2].split(/[^0-9a-z_\-]/i);
      ID = ID[0];
    }
    else {
      ID = url;
    }
      return ID;
  }

client.login(process.env.token)