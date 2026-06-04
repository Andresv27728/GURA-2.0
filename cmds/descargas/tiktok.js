import fetch from 'node-fetch';
import axios from 'axios';

async function freetiktoklike(url) {
  try {
    const page = await axios.get('https://leofame.com/free-tiktok-likes');
    const html = page.data;
    const tokenMatch = html.match(/var\s+token\s*=\s*'([^']+)'/);
    if (!tokenMatch) return null;
    const token = tokenMatch[1];
    const cookies = page.headers['set-cookie']
      ? page.headers['set-cookie'].map(v => v.split(';')[0]).join('; ')
      : '';

    const res = await axios.post('https://leofame.com/free-tiktok-likes?api=1',
      new URLSearchParams({
        token,
        timezone_offset: 'Asia/Jakarta',
        free_link: url
      }).toString(),
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36',
          'Content-Type': 'application/x-www-form-urlencoded',
          'Origin': 'https://leofame.com',
          'Referer': 'https://leofame.com/free-tiktok-likes',
          'Cookie': cookies
        }
      }
    );

    return res.data;
  } catch (error) {
    console.error('Error in freetiktoklike helper:', error.message);
    return null;
  }
}

export default {
  command: ['tiktok', 'tt', 'tiktokdl'],
  category: 'descargas',
  description: 'Descarga videos de TikTok o busca videos por texto.',
  run: async ({ msg, sock, args }) => {
    if (!args[0]) return sock.sendMessage(msg.chat, { text: '*[❗] Por favor, ingresa un enlace de TikTok o texto para buscar...*' }, { quoted: msg });

    const query = args.join(' ');
    const isUrl = query.includes('tiktok.com');

    await sock.sendMessage(msg.chat, { react: { text: '⏳', key: msg.key } });

    if (isUrl) {
      await module.exports.handleDownload?.(sock, msg, query) || await (async () => {
        // fallback inline
        try {
          let videoUrl, audioUrl, images;

          // --- New Primary API (yosoyyo) ---
          try {
            const api = `https://yosoyyo-api-ofc.onrender.com/api/tiktoksearch?q=${encodeURIComponent(query)}&apiKey=Andresv27728`;
            const res = await axios.get(api);
            const json = res.data;
            if ((json?.status === 200 || json?.status === true) && json?.result && json.result.length > 0) {
              const video = json.result[0];
              videoUrl = video.download?.video;
              audioUrl = video.download?.audio;
              images = video.downloads?.v1?.slides;
            }
          } catch (e) {
            console.error('TikTok yosoyyo API failed:', e);
          }

          if (!videoUrl && (!images || images?.length === 0)) {
            try {
              const data = await freetiktoklike(query);
              if (data?.status === 'success' && data?.video_url) videoUrl = data.video_url;
              else if (data?.links && Array.isArray(data.links)) videoUrl = data.links.find(l => l?.type === 'video')?.url || data.links[0]?.url;
            } catch (e) {
              console.error('TikTok leofame fallback failed:', e);
            }
          }

          if ((!videoUrl || videoUrl.length === 0) && (!images || images.length === 0)) {
            await sock.sendMessage(msg.chat, { react: { text: '❌', key: msg.key } });
            return await sock.sendMessage(msg.chat, { text: '❌ No se pudo descargar el contenido de TikTok.' }, { quoted: msg });
          }

          if (images && images.length > 0) {
            for (const img of images) await sock.sendMessage(msg.chat, { image: { url: img.url || img } }, { quoted: msg });
          } else if (videoUrl) {
            await sock.sendMessage(msg.chat, { video: { url: videoUrl }, mimetype: 'video/mp4' }, { quoted: msg });
          }

          if (audioUrl) await sock.sendMessage(msg.chat, { audio: { url: audioUrl }, mimetype: 'audio/mp4' }, { quoted: msg });

          await sock.sendMessage(msg.chat, { react: { text: '✅', key: msg.key } });
        } catch (e) {
          console.error('Error en la descarga de TikTok:', e);
          await sock.sendMessage(msg.chat, { react: { text: '❌', key: msg.key } });
          await sock.sendMessage(msg.chat, { text: '❌ Ocurrió un error al descargar el video.' }, { quoted: msg });
        }
      })();
    } else {
      // handleSearch
      try {
        const api = `https://yosoyyo-api-ofc.onrender.com/api/tiktoksearch?q=${encodeURIComponent(query)}&apiKey=Andresv27728`;
        const res = await axios.get(api);
        const json = res.data;

        if ((json.status !== 200 && json.status !== true) || !json.result || json.result.length === 0) {
          await sock.sendMessage(msg.chat, { react: { text: '❌', key: msg.key } });
          return sock.sendMessage(msg.chat, { text: '❌ No se encontraron videos para esa búsqueda.' }, { quoted: msg });
        }

        const videos = json.result.slice(0, 5);

        for (const video of videos) {
          const author = video.authorName || 'Desconocido';
          const caption = `*Título:* ${video.title}\n*Autor:* ${author}`;

          if (video.download?.video) {
            await sock.sendMessage(msg.chat, { video: { url: video.download.video }, caption, mimetype: 'video/mp4' }, { quoted: msg });
          }
        }
        await sock.sendMessage(msg.chat, { react: { text: '✅', key: msg.key } });
      } catch (e) {
        console.error('Error en la búsqueda de TikTok:', e);
        await sock.sendMessage(msg.chat, { react: { text: '❌', key: msg.key } });
        await sock.sendMessage(msg.chat, { text: '❌ Ocurrió un error al buscar los videos.' }, { quoted: msg });
      }
    }
  }
}
