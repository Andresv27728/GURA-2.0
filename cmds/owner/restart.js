export default {
  command: ['restart'],
  category: 'owner',
  description: 'Reiniciar el socket del bot.',
  isOwner: true,
  run: async ({ msg, sock }) => {
    try {
      const baileys = await import('baileys')

      const msg2 = baileys.generateWAMessageFromContent(
        msg.chat,
        baileys.proto.Message.fromObject({
          interactiveMessage: {
            header: {
              title: ": ̗̀「𝐈𝐬𝐨𝐥𝐚𝐭𝐞𝐝𝐋𝐚𝐛𝐬」"
            },
            body: {
              text: "✎ Reiniciando el Socket...\n> *Espere un momento...*"
            },
            nativeFlowMessage: {
              buttons: [
                {
                  name: "inapp_signup",
                  buttonParamsJson: "https://yosoyyo-api-ofc.onrender.com"
                }
              ]
            }
          }
        }),
        {}
      )

      await sock.relayMessage(
        msg.chat,
        msg2.message,
        { messageId: msg2.key.id }
      )

      setTimeout(() => {
        if (process.send) {
          process.send("restart")
        } else {
          process.exit(0)
        }
      }, 3000)

    } catch (e) {
      return msg.reply(`> Ocurrió un error al ejecutar el comando.\n> [Error: *${e.message}*]`)
    }
  }
}
