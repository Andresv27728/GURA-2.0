export default {
  command: ['al'],
  category: 'utils',
  description: 'Enviar mensaje interactivo de IsolatedLabs.',
  run: async ({ msg, sock }) => {
    try {
      const baileys = await import('baileys')

      const msg2 = baileys.generateWAMessageFromContent(
        msg.chat,
        baileys.proto.Message.fromObject({
          interactiveMessage: {
            header: {
              title: "𝖄𝕺 𝕾𝕺𝖄 𝖄𝕺"
            },
            body: {
              text: "ꕥ Qwen está procesando tu respuesta..."
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

    } catch (e) {
      return msg.reply(`> Ocurrió un error al ejecutar el comando.\n> [Error: *${e.message}*]`)
    }
  }
}
