export default {
  command: ['inactivos', 'activos'],
  category: 'group',
  run: async ({ msg, sock }) => {
    const id = msg.chat

    const metadata = await sock.groupMetadata(id)
    const participants = metadata.participants.map(p => p.id)
    const total = participants.length

    // Tu bot SÍ tiene presenceSubscribe
    try {
      await sock.presenceSubscribe(id)
    } catch (err) {
      console.log('Error presenceSubscribe:', err.message)
    }

    const presencias = {}

    await new Promise((resolve) => {
      const listener = (data) => {
        const chatId = data.id
        const updates = data.presences

        if (chatId === id && updates) {
          for (const [jid, info] of Object.entries(updates)) {
            presencias[jid] = info.lastKnownPresence
            console.log(`Usuario: ${jid} | Estado: ${info.lastKnownPresence}`)
          }
        }
      }

      sock.ev.on('presence.update', listener)

      setTimeout(() => {
        sock.ev.off('presence.update', listener)
        console.log('Presencias finales:', presencias)
        resolve()
      }, 8000)
    })

    const activos = participants.filter(p => presencias[p] === 'available').length
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
