export default {
  command: ['api'],
  category: 'general',
  run: async ({ msg, sock }) => {
    const response = await fetch('https://yosoyyo-api-ofc.onrender.com/api/status?apiKey=free_key')
    const data = await response.json()

    await sock.sendMessage(msg.chat, {
      pollResultMessage: {
        name: '˚ ༘ Estado de la API ⋆˚',
        pollVotes: [
          { optionName: `🌐 ${data.api_name}`, optionVoteCount: 0 },
          { optionName: `✅ Online: ${data.system.online ? 'Sí' : 'No'}`, optionVoteCount: 0 },
          { optionName: `⏱️ Uptime`, optionVoteCount: data.system.uptime },
          { optionName: `👤 Usuario: ${data.user_data.username}`, optionVoteCount: 0 },
          { optionName: `📊 Requests usados`, optionVoteCount: data.user_data.daily_requests_used },
          { optionName: `💚 Restantes`, optionVoteCount: data.user_data.remaining_requests }
        ]
      }
    }, { quoted: msg })
  }
}
