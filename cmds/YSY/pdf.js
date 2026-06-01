export default {
  command: ['ml'],
  category: 'bygp',
  run: async ({ msg, sock }) => {
    try {
      const axios = (await import('axios')).default

      // ================= THUMBNAIL MULTI-METODO =================
      const IMG_URL = 'https://raw.githubusercontent.com/Andresv27728/dtbs/main/LOGOS/IMG_20260317_215244_926.jpg'

      async function getThumbnail(url) {

        // METODO 1: Jimp resize normal
        try {
          const Jimp = (await import('jimp')).default
          const res = await axios.get(url, { responseType: 'arraybuffer' })
          const img = await Jimp.read(Buffer.from(res.data))
          img.resize(100, 100)
          if (typeof img.getBufferAsync === 'function') {
            return await img.getBufferAsync('image/jpeg')
          }
          return await img.getBuffer('image/jpeg')
        } catch {}

        // METODO 2: Jimp con cover
        try {
          const Jimp = (await import('jimp')).default
          const res = await axios.get(url, { responseType: 'arraybuffer' })
          const img = await Jimp.read(Buffer.from(res.data))
          img.cover(80, 80)
          return await img.getBufferAsync('image/jpeg')
        } catch {}

        // METODO 3: Sin resize, buffer crudo
        try {
          const res = await axios.get(url, { responseType: 'arraybuffer' })
          return Buffer.from(res.data)
        } catch {}

        // METODO 4: Sharp si está disponible
        try {
          const sharp = (await import('sharp')).default
          const res = await axios.get(url, { responseType: 'arraybuffer' })
          return await sharp(Buffer.from(res.data))
            .resize(100, 100)
            .jpeg({ quality: 80 })
            .toBuffer()
        } catch {}

        // METODO 5: Canvas si está disponible
        try {
          const { createCanvas, loadImage } = await import('canvas')
          const res = await axios.get(url, { responseType: 'arraybuffer' })
          const image = await loadImage(Buffer.from(res.data))
          const canvas = createCanvas(100, 100)
          const ctx = canvas.getContext('2d')
          ctx.drawImage(image, 0, 0, 100, 100)
          return canvas.toBuffer('image/jpeg')
        } catch {}

        // Si todo falla, retorna null
        return null
      }

      const thumbResized = await getThumbnail(IMG_URL)

      // ================= VARIABLES =================
      const dcc = 'documento.pdf'; const mmt = 'application/pdf'
      const evn = 'Evento'
      const cdg = 'YO SOY YO'
      const msgText = `Holaas, Como estan`
      const fot = ``
      const enb = 'Encuesta'; const ent = 'Encuesta'
      const enf = 'Encuesta'
      const dpt = 'Copiar'; const dcd = 'TESTxDS'
      const enc = 'Enlace'; const enu = ''
      const bt1 = ''; const bi1 = ''
      const bt2 = ''; const bi2 = ''
      const bt3 = ''; const bi3 = ''
      const frm = 'Formulario'

      const nativeFlowPayload = {
        header: {
          documentMessage: {
            url: 'https://mmg.whatsapp.net/v/t62.7119-24/539012045_745537058346694_1512031191239726227_n.enc',
            mimetype: mmt,
            fileSha256: Buffer.from('fa09afbc207a724252bae1b764ecc7b13060440ba47a3bf59e77f01924924bfe', 'hex'),
            fileLength: { low: -727379969, high: 232, unsigned: true },
            pageCount: 0,
            mediaKey: Buffer.from('3163ba7c8db6dd363c4f48bda2735cc0d0413e57567f0a758f514f282889173c', 'hex'),
            fileName: dcc,
            fileEncSha256: Buffer.from('652f2ff6d8a8dae9f5c9654e386de5c01c623fe98d81a28f63dfb0979a44a22f', 'hex'),
            directPath: '/v/t62.7119-24/539012045_745537058346694_1512031191239726227_n.enc',
            mediaKeyTimestamp: { low: 1756370084, high: 0, unsigned: false },
            jpegThumbnail: thumbResized || undefined,
            contextInfo: {
              mentionedJid: [msg.sender],
              groupMentions: [],
              forwardingScore: 777,
              isForwarded: true
            }
          },
          hasMediaAttachment: true
        },
        body: { text: msgText },
        footer: { text: fot },
        nativeFlowMessage: {
          buttons: [
            { name: 'single_select', buttonParamsJson: '{"has_multiple_buttons":true}' },
            { name: 'call_permission_request', buttonParamsJson: '{"has_multiple_buttons":true}' },
            {
              name: 'single_select',
              buttonParamsJson:
                `{"title": "${enf}","sections":[
    {
      "title": "Opciones1",
      "highlight_label": "🥳",
      "rows": [
        {
          "title": "Holaa",
          "description": "Que bien",
          "id": "menu"
        }
      ]
    },
    {
      "title": "Opciones2",
      "highlight_label": "🚀",
      "rows": [
        {
          "title": "Increíble trabajo",
          "description": "Sigue así GianPool",
          "id": "p"
        },
        {
          "title": "Quiero ver más",
          "description": "Muestra otro ejemplo",
          "id": "ping"
        }
      ]
    }
  ],"has_multiple_buttons": true}`
            },
            {
              name: 'cta_copy',
              buttonParamsJson: `{"display_text":"${dpt}","id":"123456789","copy_code":"${dcd}"}`
            },
            {
              name: 'cta_url',
              buttonParamsJson: `{"display_text":"${enc}","url":"${enu}","merchant_url":"${enu}"}`
            },
            {
              name: 'quick_reply',
              buttonParamsJson: `{"display_text":"${bt1}","id":"${bi1}","type":"reply"}`
            },
            {
              name: 'quick_reply',
              buttonParamsJson: `{"display_text":"${bt2}","id":"${bi2}","type":"reply"}`
            },
            {
              name: 'quick_reply',
              buttonParamsJson: `{"display_text":"${bt3}","id":"${bi3}","type":"reply"}`
            },
            {
              name: 'galaxy_message',
              buttonParamsJson:
                `{"mode":"published","flow_message_version":"3","flow_token":"1:1307913409923914:293680f87029f5a13d1ec5e35e718af3","flow_id":"1307913409923914","flow_cta":"${frm}","flow_action":"navigate","flow_action_payload":{"screen":"QUESTION_ONE","params":{"user_id":"123456789","referral":"campaign_xyz"}},"flow_metadata":{"flow_json_version":"201","data_api_protocol":"v2","flow_name":"Lead Qualification [en]","data_api_version":"v2","categories":["Lead Generation","Sales"]}}`
            }
          ],
          messageParamsJson:
            `{"limited_time_offer":{"text": "${evn}","url": "https://github.com/Andresv27728","copy_code": "${cdg}","expiration_time": 1766725199000},"bottom_sheet": {"in_thread_buttons_limit": 2,"divider_indices": [1,2,3,4,5,999],"list_title": "${ent}","button_title": "${enb}"},"tap_target_configuration": {"title": "▸ X ◂","description": "Let's go","canonical_url": "https://github.com/Andresv27728","domain": "https://github.com/Andresv27729","button_index": 0}}`
        },
        contextInfo: {
          mentionedJid: [msg.sender],
          groupMentions: [],
          forwardingScore: 777,
          isForwarded: true,
          quotedMessage: msg.quoted ? {
            conversation: msg.quoted.text || '',
            senderKeyDistributionMessage: msg.quoted.senderKeyDistributionMessage || null
          } : null
        }
      }

      await sock.relayMessage(
        msg.chat,
        {
          viewOnceMessage: {
            message: {
              messageContextInfo: {
                deviceListMetadata: msg.quoted ? {
                  senderKeyHash: msg.quoted.senderKeyHash || null,
                  recipientKeyHash: msg.quoted.recipientKeyHash || null
                } : null,
                deviceListMetadataVersion: msg.quoted ? 2 : 1
              },
              interactiveMessage: nativeFlowPayload
            }
          }
        },
        { quoted: msg }
      )

    } catch (e) {
      await sock.sendMessage(msg.chat, { text: '❌ Ocurrió un error al generar el msg:\n' + e.message }, { quoted: msg })
    }
  }
}
