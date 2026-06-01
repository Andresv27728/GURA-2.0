export default {
  command: ['inactivos', 'activos'],
  category: 'group',
  run: async ({ msg, sock }) => {
    const id = msg.chat

    const metadata = await sock.groupMetadata(id)
    const participants = metadata.participants.map(p => p.id)
    const total = participants.length

    const presencias = {}

    // Suscribirse a cada participante individualmente
    for (const jid of participants) {
      try {
        await sock.presenceSubscribe(jid)
      } catch (err) {
        console.log(`Error suscribiendo ${jid}:`, err.message)
      }
    }

    await new Promise((resolve) => {
      const listener = (data) => {
        const updates = data.presences
        if (updates) {
          for (const [jid, info] of Object.entries(updates)) {
            if (participants.includes(jid)) {
              presencias[jid] = info.lastKnownPresence
              console.log(`Usuario: ${jid} | Estado: ${info.lastKnownPresence}`)
            }
          }
        }
      }

      sock.ev.on('presence.update', listener)

      setTimeout(() => {
        sock.ev.off('presence.update', listener)
        console.log('Presencias finales:', presencias)
        resolve()
      }, 10000) // 10 segundos para grupos grandes
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
