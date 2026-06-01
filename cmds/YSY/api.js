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
          { optionName: `⏱️ Uptime: ${data.system.uptime}`, optionVoteCount: 0 },
          { optionName: `👤 Usuario: ${data.user_data.username}`, optionVoteCount: 0 },
          { optionName: `📊 Usados: ${data.user_data.daily_requests_used}`, optionVoteCount: 0 },
          { optionName: `💚 Restantes: ${data.user_data.remaining_requests}`, optionVoteCount: 0 }
        ]
      }
    }, { quoted: msg })
  }
}
