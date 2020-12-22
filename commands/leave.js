module.exports = {
    name: 'leave',
    description: "Leaves the voice channel!",
    usage: 'leave',
    async execute(client, message, args) {
        const voiceChannel = message.member.voice.channel;
        if(!voiceChannel) return message.channel.send(`You Need to be a in a voice channel to make the bot leave!`)
        voiceChannel.leave()
        message.react('✅')
    }
}