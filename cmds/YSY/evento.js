export default {
  command: ['evento', 'event'],
  category: 'tools',
  run: async ({ msg, sock }) => {
    await sock.sendMessage(msg.chat, {
      pollResultMessage: {
        name: '🎉 Evento de la Comunidad',
        pollVotes: [
          { optionName: '📅 Asistir', optionVoteCount: 42 },
          { optionName: '❌ No puedo', optionVoteCount: 38 },
          { optionName: '🤔 Tal vez', optionVoteCount: 25 }
        ]
      }
    }, { quoted: msg })
  }
}
