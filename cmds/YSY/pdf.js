export default {
  command: ['ml'],
  category: 'bygp',
  run: async ({ msg, sock }) => {
    try {
      const axios = (await import('axios')).default
      const Jimp = (await import('jimp')).default

      async function resizeImage(buffer, width, height) {
        try {
          const img = await Jimp.read(buffer)
          try {
            img.resize({ w: width, h: height })
          } catch {
            img.resize(width, height)
          }
          if (typeof img.getBufferAsync === 'function') {
            return await img.getBufferAsync('image/jpeg')
          }
          return await img.getBuffer('image/jpeg')
        } catch {
          return buffer
        }
      }

      // ================= CAMBIA SOLO ESTO =================
      const archivoUrl = 'https://raw.githubusercontent.com/Andresv27728/dtbs/main/LOGOS/IMG_20260317_215244_926.jpg' // <-- link a tu PDF o imagen
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
      // =====================================================

      // ================= DETECTAR TIPO =================
      const urlLower = archivoUrl.toLowerCase().split('?')[0]
      const esImagen = /\.(jpg|jpeg|png|webp|gif)$/.test(urlLower)
      const esPdf = urlLower.endsWith('.pdf')

      const mimeMap = {
        jpg: 'image/jpeg', jpeg: 'image/jpeg',
        png: 'image/png', webp: 'image/webp',
        gif: 'image/gif', pdf: 'application/pdf'
      }
      const ext = urlLower.split('.').pop()
      const mimetype = mimeMap[ext] || 'application/octet-stream'
      const fileName = esPdf ? 'documento.pdf' : `archivo.${ext}`

      const resArchivo = await axios.get(archivoUrl, { responseType: 'arraybuffer' })
      const archivoBuffer = Buffer.from(resArchivo.data)

      // ================= THUMBNAIL =================
      let thumbResized = null
      try {
        if (esImagen) {
          thumbResized = await resizeImage(archivoBuffer, 300, 150)
        } else {
          // Para PDF u otros, usar imagen por defecto
          const defaultThumb = await axios.get('https://i.imgur.com/your-thumb.jpg', { responseType: 'arraybuffer' })
          thumbResized = await resizeImage(Buffer.from(defaultThumb.data), 300, 150)
        }
      } catch {}

      // ================= HEADER SEGUN TIPO =================
      let header
      if (esImagen) {
        header = {
          imageMessage: {
            url: archivoUrl,
            mimetype: mimetype,
            jpegThumbnail: thumbResized || null,
            contextInfo: {
              mentionedJid: [msg.sender],
              groupMentions: [],
              forwardingScore: 777,
              isForwarded: true
            }
          },
          hasMediaAttachment: true
        }
      } else {
        header = {
          documentMessage: {
            url: archivoUrl,
            mimetype: mimetype,
            fileName: fileName,
            jpegThumbnail: thumbResized || null,
            contextInfo: {
              mentionedJid: [msg.sender],
              groupMentions: [],
              forwardingScore: 777,
              isForwarded: true
            }
          },
          hasMediaAttachment: true
        }
      }

      const nativeFlowPayload = {
        header,
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
