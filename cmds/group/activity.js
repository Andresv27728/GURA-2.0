export default {
  command: ['inactivos', 'activos'],
  category: 'group',
  run: async ({ msg, sock }) => {
    const metadata = await sock.groupMetadata(msg.chat)
    const participants = metadata.participants.map(p => p.id)
    const total = participants.length

    // Intentar suscribirse a presencias con los 3 métodos posibles
    try {
      if (typeof sock.groupSubscribePresences === 'function') {
        await sock.groupSubscribePresences(msg.chat)
      } else if (typeof sock.subscribePresences === 'function') {
        await sock.subscribePresences(msg.chat)
      } else if (typeof sock.presenceSubscribe === 'function') {
        await sock.presenceSubscribe(msg.chat)
      } else {
        await sock.sendPresenceUpdate('available', msg.chat)
      }
    } catch (err) {
      console.log('Presencia no soportada:', err.message)
    }

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
