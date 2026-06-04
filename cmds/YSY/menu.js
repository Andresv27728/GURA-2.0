import moment from "moment-timezone"
import fetch from "node-fetch"

const oceanBorders = [
  "🌊🦈💙🫧🔱🐚",
  "💙🌊🐬🫧🦈🌊",
  "🐚🔱🌊💙🫧🐬",
  "🦈💙🌊🐚🔱🫧",
  "🫧🌊💙🐬🐚🔱"
]

const frasesGura = [
  "🌊 Las olas siempre traen algo nuevo, ¡splish splash!",
  "🔱 Gura llegó desde Atlantis para acompañarte.",
  "🦈💙 Que tu día sea tan tranquilo como las profundidades del océano.",
  "¡Aaaaaa! Gura te desea mares de felicidad.",
  "🌊 El océano es grande, pero mi hambre es mayor. ¿Alguien dijo salmón?",
  "🐚 Un saludo desde Atlantis, ¡una sonrisa para ti!",
  "💙🐬 Todo es más lindo cuando suena el mar.",
  "🔱🌟 Nunca es tarde para construir un castillo de arena.",
  "🦈 Gura te observa y te desea buenas vibras.",
  "💙 Que la magia del mar te acompañe siempre.",
  "🌊 Mareas altas o bajas, siempre estaré aquí.",
  "🫧💫 Recuerda: cada ola trae una nueva oportunidad.",
  "🐚 Desde las profundidades, Gura te dice: ¡hola chumbie!",
  "🐬 Incluso los tiburones necesitamos un descanso a veces.",
  "🌊 Las olas brillan más cuando tú sonríes.",
  "💙 Tu corazón es más profundo que cualquier fosa marina.",
  "🐟 Nunca dejes de nadar hacia tus sueños.",
  "🔱🧜 Una sirena dejó un mensaje secreto en el coral para ti.",
  "🫧 La vida es más bonita bajo el agua.",
  "🌊 ¡Gura está en camino!",
  "🐬💙 Navega con el corazón ligero.",
  "El sol brilla en la superficie, pero la paz está en el fondo.",
  "💫 Un pequeño tiburón te desea un gran día.",
  "🌊 Las mejores aventuras comienzan con un chapuzón.",
  "🐟 Que cada ola te recuerde que eres único.",
  "🐚 ¿Escuchas eso? Es el mar llamándote.",
  "💙 Gura manda abrazos salados pero sinceros.",
  "🦈 Un tiburón feliz es un tiburón que comió bien."
]

function randomBorder() {
  return oceanBorders[Math.floor(Math.random() * oceanBorders.length)]
}

function randomFraseGura() {
  return frasesGura[Math.floor(Math.random() * frasesGura.length)]
}

async function makeFkontak() {
  try {
    const res = await fetch('https://raw.githubusercontent.com/Andresv27728/dtbs/main/LOGOS/IMG_20260317_215244_926.jpg')
    const thumb = Buffer.from(await res.arrayBuffer())
    return {
      key: { participants: '0@s.whatsapp.net', remoteJid: 'status@broadcast', fromMe: false, id: 'GawrGura' },
      message: { locationMessage: { name: 'Atlantis de Gawr Gura', jpegThumbnail: thumb } },
      participant: '0@s.whatsapp.net'
    }
  } catch {
    return null
  }
}

export default {
  command: ['menu'],
  category: 'main',
  description: 'Menú principal del bot.',
  run: async ({ msg, sock, args }) => {
    try {
      const baileys = await import('baileys')

      global.namecanal = '𝖄𝕺 𝕾𝕺𝖄 𝖄𝕺'
      global.canal = 'https://whatsapp.com/channel/0029VbAmMiM96H4KgBHZUn1z'
      global.idcanal = '120363399729727124@newsletter'

      const senkuVideos = [
        "https://raw.githubusercontent.com/Andresv27728/dtbs/main/SSYouTube.online_blue horizon!! - Gawr Gura_1080p.mp4",
        "https://raw.githubusercontent.com/Andresv27728/dtbs/main/SSYouTube.online_blue horizon!! - Gawr Gura_1080p.mp4"
      ]
      const randomVideo = senkuVideos[Math.floor(Math.random() * senkuVideos.length)]
      const fkontak = (await makeFkontak()) || msg

      // 📚 CATEGORÍAS
      // Agrupar los comandos por categoría leyendo global.comandos.
      // global.comandos es un Map donde la key es el nombre del comando
      // y el value contiene metadata (entre ellas `category`).
      let categories = {}
      const comandosMap = global.comandos instanceof Map ? global.comandos : new Map(Object.entries(global.comandos || {}))
      for (const [cmdName, data] of comandosMap) {
        const cat = data?.category || 'Otros'
        if (!categories[cat]) categories[cat] = []
        // Añadir el nombre del comando (asegurando no duplicados)
        if (!categories[cat].includes(cmdName)) categories[cat].push(cmdName)
      }
      // Ordenar categorías y comandos para una presentación consistente
      for (const k of Object.keys(categories)) categories[k].sort((a, b) => a.localeCompare(b))

      // ❄️ Categoría seleccionada
      if (args[0] && categories[args[0]]) {
        const comandos = categories[args[0]]
          .map(cmd => ` *${cmd}*`)
          .join('\n')

        const border = randomBorder()
        const text = `${border}\n *GAWR GURA*\n${border}\n\n${randomFraseGura()}\n\n*Categoría:* ${args[0]}\n*Comandos disponibles:*\n\n${comandos || 'No hay comandos en esta categoría.'}\n\n${border}`

        const msg2 = baileys.generateWAMessageFromContent(
          msg.chat,
          baileys.proto.Message.fromObject({
            interactiveMessage: {
              header: { title: ": ̗̀「GAWR GURA」" },
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
      const botName = global.db?.data?.settings?.[botId]?.botname || 'GAWR GURA'

      const border = randomBorder()
      const headerText = `${border}
*GAWR GURA*
${border}

✨ *Bot:* ${botName}
💙 *Frase:* ${randomFraseGura()}
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

      // Construir un solo mensaje con todas las categorías y comandos
      const catEntries = Object.keys(categories).sort((a, b) => a.localeCompare(b));
      const listText = catEntries.map((cat, idx) => {
        const cmds = categories[cat].map(c => `  • ${c}`).join('\n');
        return `\n${idx + 1}. ${cat} (${categories[cat].length})\n${cmds}`;
      }).join('\n');

      const fancyHeader = `${border}\n╔═━ ･ ｡ﾟ☆: *.☾ .* ☆ﾟ｡･ ･━═╗\n   ✦ MENÚ GAWR GURA ✦\n╚═━ ･ ｡ﾟ☆: *.☾ .* ☆ﾟ｡･ ･━═╝\n${border}`;

      const fullText = `${fancyHeader}\n\n✨ ${randomFraseGura()}\n\n${headerText}\n\n📚 Categorías y comandos:${listText}\n\n${border}\nUsa: .menu <Categoría> para ver solo esa categoría (ej. .menu utils)`;

      // Enviar como texto simple con contacto falso como quoted para estilo
      await sock.sendMessage(msg.chat, { text: fullText }, { quoted: fkontak });

    } catch (e) {
      console.error(e)
      const baileys = await import('baileys')
      const msg2 = baileys.generateWAMessageFromContent(
        msg.chat,
        baileys.proto.Message.fromObject({
          interactiveMessage: {
            header: { title: ": ̗̀「GAWR GURA」" },
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
