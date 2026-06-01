export default {
  command: ['inactivos', 'activos'],
  category: 'group',
  run: async ({ msg, sock }) => {
    const metadata = await sock.groupMetadata(msg.chat)
    const participants = metadata.participants.map(p => p.id)
    const total = participants.length

    // Suscribirse a presencias
    await sock.groupSubscribePresences(msg.chat)

    const presencias = {}

    // Escuchar presencias 5 segundos
    await new Promise((resolve) => {
      const listener = ({ id, presences: updates }) => {
        if (id === msg.chat) {
          for (const [jid, data] of Object.entries(updates)) {
            presencias[jid] = data.lastKnownPresence
          }
        }
      }

      sock.ev.on('presence.update', listener)

      setTimeout(() => {
        sock.ev.off('presence.update', listener)
        resolve()
      }, 5000)
    })

    const activos = participants.filter(p => presencias[p] === 'available').length
    const inactivos = total - activos

    await sock.sendMessage(msg.chat, {
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
