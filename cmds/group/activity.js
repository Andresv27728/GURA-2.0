export default {
  command: ['inactivos', 'activos'],
  category: 'group',
  run: async ({ msg, sock }) => {
    const id = msg.chat

    // Obtener total de participantes del grupo
    const metadata = await sock.groupMetadata(id)
    const total = metadata.participants.length

    // Detectar activos con fallback por si chats no existe
    const mensajes = sock.chats?.[id]?.messages 
      ?? sock.store?.messages?.[id]?.array 
      ?? sock.messageStore?.[id] 
      ?? {}

    const participantesActivos = Object.values(mensajes)
      .map((item) => item.key?.participant)
      .filter((v, i, self) => v && self.indexOf(v) === i)

    const activos = participantesActivos.length
    const inactivos = total - activos

    await sock.sendMessage(id, {
      pollResultMessage: {
        name: '˚ ༘ Actividad del Grupo ⋆˚',
        pollVotes: [
          { optionName: 'ׂׂૢ Activos', optionVoteCount: activos },
          { optionName: 'ׂׂૢ Inactivos', optionVoteCount: inactivos }
        ]
      }
    }, { quoted: msg })
  }
}
