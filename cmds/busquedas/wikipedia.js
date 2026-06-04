import fetch from 'node-fetch'

export default {
  command: ['wikipedia', 'wiki'],
  category: 'busquedas',
  description: 'Busca en Wikipedia (ES) y devuelve información del primer resultado.',
  run: async ({ msg, sock, args }) => {
    const from = msg.chat
    const query = args.join(' ')
    if (!query) return sock.sendMessage(from, { text: '📚 Usa: wikipedia <término de búsqueda>' }, { quoted: msg })

    try {
      await sock.sendMessage(from, { react: { text: '🔎', key: msg.key } })

      // 1) Buscar en la API de búsqueda de Wikipedia en español
      const searchUrl = `https://es.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&utf8=`
      const searchRes = await fetch(searchUrl).then(r => r.json())
      const results = searchRes?.query?.search || []
      if (!results || results.length === 0) {
        await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
        return sock.sendMessage(from, { text: `No encontré resultados en Wikipedia para: ${query}` }, { quoted: msg })
      }

      // Tomar el primer resultado
      const first = results[0]
      const title = first.title

      // 2) Obtener el resumen y miniatura usando el endpoint REST de summary
      const summaryUrl = `https://es.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`
      const summaryRes = await fetch(summaryUrl).then(r => r.json())

      const pageUrl = summaryRes.content_urls?.desktop?.page || `https://es.wikipedia.org/wiki/${encodeURIComponent(title)}`
      const extract = summaryRes.extract || first.snippet || 'Sin extracto disponible.'
      const thumbnail = summaryRes.thumbnail?.source || null

      // Limitar tamaño del texto a un tamaño razonable para WhatsApp
      const maxChars = 60000
      const text = `📚 *${title}*\n\n${extract.length > maxChars ? extract.slice(0, maxChars - 100) + '\n... (texto truncado)' : extract}\n\n🔗 ${pageUrl}`

      if (thumbnail) {
        await sock.sendMessage(from, { image: { url: thumbnail }, caption: text }, { quoted: msg })
      } else {
        await sock.sendMessage(from, { text }, { quoted: msg })
      }

      await sock.sendMessage(from, { react: { text: '✅', key: msg.key } })

    } catch (e) {
      console.error('Error en comando wikipedia:', e)
      await sock.sendMessage(msg.chat, { react: { text: '❌', key: msg.key } })
      await sock.sendMessage(msg.chat, { text: `❌ Ocurrió un error al buscar en Wikipedia: ${e.message}` }, { quoted: msg })
    }
  }
}
