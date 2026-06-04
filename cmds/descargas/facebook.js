import { facebookDl } from '../../lib/scraper.js';

export default {
  command: ['facebook', 'fb', 'fbdl', 'fbvideo'],
  category: 'descargas',
  description: 'Descarga un video de Facebook desde un enlace.',
  run: async ({ msg, sock, args }) => {
    const url = args[0];
    const fbRegex = /https?:\/\/(www\.|web\.)?(facebook\.com|fb\.watch|reel)\/[^\s]+/i;

    if (!url || !fbRegex.test(url)) {
      const usageMessage = `📥 *Uso correcto del comando:*\n\n.facebook <enlace de Facebook>\n\n*Ejemplo:*\n.facebook https://www.facebook.com/watch/?v=1234567890`;
      return sock.sendMessage(msg.chat, { text: usageMessage }, { quoted: msg });
    }

    try {
      await sock.sendMessage(msg.chat, { react: { text: '🕒', key: msg.key } });

      let result = null;
      let error = null;

      for (let i = 0; i < 3; i++) {
        try {
          result = await facebookDl(url);
          if (result && (result.hd || result.sd)) break;
        } catch (err) {
          error = err;
          console.log(`Intento ${i + 1} fallido:`, err.message);
        }
      }

      if (!result || (!result.hd && !result.sd)) {
        await sock.sendMessage(msg.chat, { react: { text: '❌', key: msg.key } });
        return sock.sendMessage(msg.chat, { text: `❌ No se pudo obtener el video después de varios intentos. ${error ? `\nError: ${error.message}` : ''}` }, { quoted: msg });
      }

      const videoUrl = result.hd || result.sd;
      const title = result.title || 'Sin título';

      const caption = `📹 *Video de Facebook Descargado*\n\n*Título:* ${title}\n\n✅ Descargado con:\nhttps://yosoyyo-api-ofc.onrender.com`;

      await sock.sendMessage(msg.chat, { video: { url: videoUrl }, caption, mimetype: 'video/mp4' }, { quoted: msg });

      await sock.sendMessage(msg.chat, { react: { text: '✅', key: msg.key } });

    } catch (e) {
      console.error('Error en el comando facebook:', e);
      await sock.sendMessage(msg.chat, { react: { text: '❌', key: msg.key } });
      await sock.sendMessage(msg.chat, { text: '❌ Ocurrió un error inesperado al descargar el video.' }, { quoted: msg });
    }
  }
}
