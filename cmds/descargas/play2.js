import axios from 'axios';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { pipeline } from 'stream/promises';
import { yt2mate, savetube, ytSearch } from '../../lib/ytscrapers.js';

const TMP_DIR = path.join(process.cwd(), 'tmp');
if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });

const WHATSAPP_VIDEO_LIMIT = 100 * 1024 * 1024; // 100 MB
const userRequests = new Set();

async function downloadToFile(url, filePath, referer = 'https://vidssave.com/') {
  const response = await axios.get(url, {
    responseType: 'stream',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Referer': referer
    }
  });

  await pipeline(response.data, fs.createWriteStream(filePath));
}

async function ytdl(url) {
  try {
    const res = await axios.post('https://api.vidssave.com/api/contentsite_api/media/parse',
      new URLSearchParams({
        auth: '20250901majwlqo',
        domain: 'api-ak.vidssave.com',
        origin: 'cache',
        link: url
      }).toString(),
      {
        headers: {
          'user-agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36',
          'content-type': 'application/x-www-form-urlencoded',
          origin: 'https://vidssave.com',
          referer: 'https://vidssave.com/'
        }
      }
    );

    if (!res.data || !res.data.data) return null;
    const { title, thumbnail, duration, resources } = res.data.data;

    if (!resources || !Array.isArray(resources)) return null;

    return {
      title,
      thumbnail,
      duration,
      formats: resources.map(r => ({
        type: r.type,
        quality: r.quality,
        format: r.format,
        size: r.size,
        url: r.download_url
      }))
    };
  } catch (error) {
    console.error('Error en ytdl helper:', error.message);
    return null;
  }
}

export default {
  command: ['play2', 'video'],
  category: 'descargas',
  description: 'Descarga un video por nombre/URL (play2).',
  run: async ({ msg, sock, args }) => {
    console.log('\n▶ PLAY2:', msg.sender);
    const text = args.join(' ');
    if (!text) {
      return sock.sendMessage(msg.chat, { text: '🎥 Usa: .play2 nombre de video' }, { quoted: msg });
    }
    if (userRequests.has(msg.sender)) {
      return sock.sendMessage(msg.chat, { text: '⏳ Ya tienes una descarga en proceso.' }, { quoted: msg });
    }
    userRequests.add(msg.sender);
    let videoPath;
    try {
      await sock.sendMessage(msg.chat, { react: { text: '👀', key: msg.key } });
      const search = await ytSearch(text);
      const video = search.videos[0];
      if (!video) throw new Error('Sin resultados');

      const caption = `🎥 ${video.title}\n⏱ ${video.timestamp}\n\n⏳ Procesando...`;

      if (video.image && video.image.trim() !== '') {
        await sock.sendMessage(msg.chat, { image: { url: video.image }, caption }, { quoted: msg });
      } else {
        await sock.sendMessage(msg.chat, { text: caption }, { quoted: msg });
      }

      const randomId = crypto.randomBytes(8).toString('hex');
      videoPath = path.join(TMP_DIR, `${randomId}.mp4`);
      let downloadUrl = null;
      let success = false;

      // 1. Primary: yosoyyo-api (from ytSearch)
      if (video.download?.mp4) {
        try {
          console.log('Trying yosoyyo-api...');
          downloadUrl = video.download.mp4;
          await downloadToFile(downloadUrl, videoPath);
          success = true;
        } catch (err) {
          console.error('yosoyyo-api error:', err.message);
        }
      }

      // 2. Fallback: Vidssave
      if (!success) {
        try {
          console.log('Trying vidssave...');
          const data = await ytdl(video.url);
          if (data?.formats && Array.isArray(data.formats) && data.formats.length > 0) {
            const videoFormat = data.formats.find(f => f?.type === 'video' && f?.format === 'mp4') ||
                                data.formats.find(f => f?.format === 'mp4');
            if (videoFormat?.url) {
              downloadUrl = videoFormat.url;
              await downloadToFile(downloadUrl, videoPath, 'https://vidssave.com/');
              success = true;
            }
          }
        } catch (e) {
          console.error("Vidssave failed:", e.message);
        }
      }

      // 3. Reinforcement: yt2mate
      if (!success) {
        try {
          console.log('Trying yt2mate...');
          const res = await yt2mate(video.url, 'mp4');
          if (res?.download) {
            downloadUrl = res.download;
            await downloadToFile(downloadUrl, videoPath, 'https://v1.y2mate.nu/');
            success = true;
          }
        } catch (err) {
          console.error('yt2mate error:', err.message);
        }
      }

      // 4. Reinforcement: savetube
      if (!success) {
        try {
          console.log('Trying savetube...');
          const res = await savetube(video.url);
          if (res?.status && res.videos?.length > 0) {
            const videoFormat = res.videos.find(v => v.quality === '360') || res.videos[0];
            downloadUrl = videoFormat.url;
            await downloadToFile(downloadUrl, videoPath, 'https://save-tube.com/');
            success = true;
          }
        } catch (err) {
          console.error('savetube error:', err.message);
        }
      }

      if (!success || !fs.existsSync(videoPath) || fs.statSync(videoPath).size === 0) {
        throw new Error('No se pudo descargar el video o el archivo está vacío (0kb).');
      }

      const fileSizeInBytes = fs.statSync(videoPath).size;
      const safeTitle = video.title.replace(/[^\w\s]/gi, '');

      if (fileSizeInBytes < WHATSAPP_VIDEO_LIMIT) {
        await sock.sendMessage(msg.chat, { video: { url: videoPath }, mimetype: 'video/mp4', caption: video.title }, { quoted: msg });
      } else {
        await sock.sendMessage(msg.chat, { document: { url: videoPath }, mimetype: 'video/mp4', fileName: `${safeTitle}.mp4` }, { quoted: msg });
      }
      await sock.sendMessage(msg.chat, { react: { text: '✅', key: msg.key } });

    } catch (e) {
      console.log('❌ ERROR PLAY2:', e.message);
      await sock.sendMessage(msg.chat, { react: { text: '❌', key: msg.key } });
      const errorMsg = e.code === 'ENOSPC'
        ? '❌ *ERROR:* No queda espacio en el servidor para procesar esta descarga.'
        : `❌ Error: ${e.message}`;
      await sock.sendMessage(msg.chat, { text: errorMsg }, { quoted: msg });
    } finally {
      try {
        if (videoPath && fs.existsSync(videoPath)) fs.unlinkSync(videoPath);
      } catch (err) {
        console.error('Error cleaning up file in play2.js:', err)
      }
      userRequests.delete(msg.sender);
    }
  }
};
