export default {
  command: ['inactivos', 'activos'],
  category: 'group',
  run: async ({ msg, sock }) => {
    const participants = (await sock.groupMetadata(msg.chat)).participants
    await sock.sendMessage(msg.chat, {
      pollResultMessage: {
        name: '˚ ༘ Actividad del Grupo ⋆˚',
        pollVotes: [
          { optionName: 'ׂׂૢ Activos', optionVoteCount: participants.length },
          { optionName: 'ׂׂૢ Inactivos', optionVoteCount: 0 }
        ]
      }
    }, { quoted: msg })
  }
}
