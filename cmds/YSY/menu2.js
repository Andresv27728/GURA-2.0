import moment from "moment-timezone"
import fetch from "node-fetch"

const christmasBorders = [
  "🌌🔭🧪🔬👨‍🔬👩‍🔬",
  "🌌⚛️🧪⚗️🔬🔭",
  "⚛️⚗️🧪🔬🌌⚛️",
  "👨‍🔬🔭⚛️🔬⚗️👩‍🔬",
  "🧪⚗️🔬👨‍🔬👩‍🔬⚛️🔭"
]

function randomBorder() {
  return christmasBorders[Math.floor(Math.random() * christmasBorders.length)]
}

async function makeFkontak() {
  try {
    const res = await fetch('https://files.catbox.moe/kjg1hi.jpg')
    const thumb = Buffer.from(await res.arrayBuffer())
    return {
      key: { participants: '0@s.whatsapp.net', remoteJid: 'status@broadcast', fromMe: false, id: 'Senku' },
      message: { locationMessage: { name: 'Laboratorio Senku', jpegThumbnail: thumb } },
      participant: '0@s.whatsapp.net'
    }
  } catch {
    return null
  }
}

export default {
  command: ['menu2'],
  category: 'main',
  description: 'Menú principal del bot.',
  run: async ({ msg, sock, args }) => {
    try {
      const baileys = await import('baileys')

      global.namecanal = '𝖄𝕺 𝕾𝕺𝖄 𝖄𝕺'
      global.canal = 'https://whatsapp.com/channel/0029VbAmMiM96H4KgBHZUn1z'
      global.idcanal = '120363399729727124@newsletter'

      const senkuVideos = [
        "https://files.catbox.moe/vgmwfj.mp4",
        "https://files.catbox.moe/vgmwfj.mp4"
      ]
      const randomVideo = senkuVideos[Math.floor(Math.random() * senkuVideos.length)]
      const fkontak = (await makeFkontak()) || msg

      // 📚 CATEGORÍAS
      let categories = {}
      Object.values(global.comandos || {})
        .filter(p => p?.category)
        .forEach(plugin => {
          const cat = plugin.category || 'Otros'
          if (!categories[cat]) categories[cat] = []
          if (plugin.command) {
            categories[cat].push(...plugin.command)
          }
        })

      // ❄️ Categoría seleccionada
      if (args[0] && categories[args[0]]) {
        const comandos = categories[args[0]]
          .map(cmd => ` *${cmd}*`)
          .join('\n')

        const border = randomBorder()
        const text = `${border}\n *BOT*\n${border}\n\n*Categoría:* ${args[0]}\n*Comandos disponibles:*\n\n${comandos || 'No hay comandos en esta categoría.'}\n\n${border}`

        const msg2 = baileys.generateWAMessageFromContent(
          msg.chat,
          baileys.proto.Message.fromObject({
            interactiveMessage: {
              header: { title: ": ̗̀「𝐈𝐬𝐨𝐥𝐚𝐭𝐞𝐝𝐋𝐚𝐛𝐬」" },
              body: { text },
              nativeFlowMessage: {
                buttons: [{ name: "inapp_signup", buttonParamsJson: "https://yosoyyo-api-ofc.onrender.com" }]
              }
            }
          }),
          {}
        )
        await sock.relayMessage(msg.chat, msg2.message, { messageId: msg2.key.id })
        return
      }

      // 🕒 Datos del sistema
      const uptimeSec = process.uptime()
      const h = Math.floor(uptimeSec / 3600)
      const mnt = Math.floor((uptimeSec % 3600) / 60)
      const s = Math.floor(uptimeSec % 60)
      const uptimeStr = `${h}h ${mnt}m ${s}s`

      const botId = sock.user.id.split(':')[0] + '@s.whatsapp.net'
      const botName = global.db?.data?.settings?.[botId]?.botname || 'Bot'

      const border = randomBorder()
      const headerText = `${border}
*BOT*
${border}

✨ *Bot:* ${botName}
⏱️ *Uptime:* ${uptimeStr}
🕒 *Hora:* ${moment.tz('America/Bogota').format('HH:mm:ss')}
📅 *Fecha:* ${moment.tz('America/Bogota').format('DD/MM/YYYY')}

📢 *Canal:* ${global.namecanal}
🔗 ${global.canal}
${border}`

      // VIDEO
      const mediaHeader = await baileys.prepareWAMessageMedia(
        { video: { url: randomVideo }, gifPlayback: false },
        { upload: sock.waUploadToServer }
      )

      // 📂 Lista de categorías
      const rows = Object.keys(categories).map(cat => ({
        title: `${cat}`,
        description: `Comandos de ${cat}`,
        id: `.menu2 ${cat}`
      }))

      const interactiveMessage = {
        body: { text: `${headerText}\n\n *Elige una categoría para continuar:*` },
        footer: { text: "CATEGORIAS" },
        header: {
          title: "MENÚ PRINCIPAL",
          hasMediaAttachment: true,
          videoMessage: mediaHeader.videoMessage
        },
        nativeFlowMessage: {
          buttons: [
            {
              name: "single_select",
              buttonParamsJson: JSON.stringify({
                title: "Categorías disponibles",
                sections: [{ title: "Laboratorio", rows }]
              })
            }
          ],
          messageParamsJson: ""
        }
      }

      const msgSend = baileys.generateWAMessageFromContent(
        msg.chat,
        { viewOnceMessage: { message: { interactiveMessage } } },
        { userJid: sock.user.id, quoted: fkontak }
      )

      await sock.relayMessage(msg.chat, msgSend.message, { messageId: msgSend.key.id })

    } catch (e) {
      console.error(e)
      const baileys = await import('baileys')
      const msg2 = baileys.generateWAMessageFromContent(
        msg.chat,
        baileys.proto.Message.fromObject({
          interactiveMessage: {
            header: { title: ": ̗̀「𝐈𝐬𝐨𝐥𝐚𝐭𝐞𝐝𝐋𝐚𝐛𝐬」" },
            body: { text: `> Ocurrió un error al ejecutar el comando.\n> [Error: *${e.message}*]` },
            nativeFlowMessage: {
              buttons: [{ name: "inapp_signup", buttonParamsJson: "https://yosoyyo-api-ofc.onrender.com" }]
            }
          }
        }),
        {}
      )
      await sock.relayMessage(msg.chat, msg2.message, { messageId: msg2.key.id })
    }
  }
}
