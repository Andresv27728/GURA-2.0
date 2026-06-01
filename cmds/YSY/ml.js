export default {
  command: ['ml'],
  category: 'YSY',
  run: async ({ msg, sock }) => {
    try {
      const fs = await import('fs')
      const { join } = await import('path')
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

      const name = msg?.pushName || 'User'
      const tagUser = '@' + msg.sender?.split('@')[0]

      const imgPath1 = join(process.cwd(), 'nodejs.jpg')
      const thumbLocal = fs.default.existsSync(imgPath1) ? fs.default.readFileSync(imgPath1) : null
      const thumbResized = thumbLocal ? await resizeImage(thumbLocal, 300, 150) : null

      // Documento
      const dcc = 'documento.pdf'; const mmt = 'application/pdf'
      const evn = 'Evento'
      const cdg = 'YO SOY YO'
      // Mensaje
      const msgText = `Holaas, Como estan`
      const fot = ``
      const enb = 'Encuesta'; const ent = 'Encuesta'
      // Botones
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
            jpegThumbnail: thumbResized || null,
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
          "description": "HOLA XD",
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
            `{"limited_time_offer":{"text": "${evn}","url": "https://github.com/Andresv27728","copy_code": "${cdg}","expiration_time": 1766725199000},"bottom_sheet": {"in_thread_buttons_limit": 2,"divider_indices": [1,2,3,4,5,999],"list_title": "${ent}","button_title": "${enb}"},"tap_target_configuration": {"title": "▸ X ◂","description": "Let's go","canonical_url": "https://github.com/Andresv27728","domain": "https://github.com/Andresv27728","button_index": 0}}`
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
