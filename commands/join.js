module.exports = {
    name: 'join',
    description: "Join the voice channel!",
    usage: 'join',
    async execute(client, message, args) {
        const voiceChannel = message.member.voice.channel;
        if(!voiceChannel) return message.channel.send(`You Need to be a in a voice channel to make the bot join!`)
        voiceChannel.join()
        message.react('✅')
    }
}