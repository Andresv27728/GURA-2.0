import { VoipClient } from 'baileys-caller'

export default {
  command: ['call', 'llamar'],
  category: 'general',
  description: 'Realiza una llamada de voz a un número.',
  run: async ({ msg, sock, args }) => {
    const from = msg.chat

    if (!args[0]) {
      return await sock.sendMessage(from, {
        text: '📞 Debes indicar un número.\nEjemplo: *.call 1234567890*'
      }, { quoted: msg })
    }

    const numero = args[0].replace(/[^0-9]/g, '')

    if (numero.length < 10) {
      return await sock.sendMessage(from, {
        text: '❌ Número inválido. Usa el formato internacional.\nEjemplo: *.call 573001234567*'
      }, { quoted: msg })
    }

    await sock.sendMessage(from, {
      text: `📞 Iniciando llamada a *${numero}*...`
    }, { quoted: msg })

    try {
      const client = new VoipClient({ authDir: './Sessions/Owner' })
      await client.connect()

      const call = await client.call(numero, {
        audioSource: 'silence'
      })

      call.on('ringing', async () => {
        await sock.sendMessage(from, { text: `🔔 Timbrando a *${numero}*...` })
      })

      call.on('connected', async () => {
        await sock.sendMessage(from, { text: `✅ Llamada conectada con *${numero}*` })
      })

      call.on('ended', async (reason) => {
        await sock.sendMessage(from, { text: `📵 Llamada finalizada.\n*Razón:* ${reason}` })
        client.disconnect()
      })

      call.on('error', async (err) => {
        await sock.sendMessage(from, { text: `❌ Error: ${err.message}` })
        client.disconnect()
      })

      await call.waitForEnd()

    } catch (err) {
      await sock.sendMessage(from, {
        text: `❌ No se pudo realizar la llamada.\n*Error:* ${err.message}`
      }, { quoted: msg })
    }
  }
}
