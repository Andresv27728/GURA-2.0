import { downloadContentFromMessage } from '@whiskeysockets/baileys';

// utils.unwrapMessage is optional; import dynamically to avoid failing plugin load
async function getUnwrapMessage() {
  try {
    const mod = await import('../../lib/utils.js');
    return mod.unwrapMessage;
  } catch (e) {
    return null;
  }
}

export default {
  command: ['ver', 'read', 'view'],
  category: 'herramientas',
  description: 'Reenvía un archivo, imagen, video o audio (útil para ver una vez).',
  run: async ({ msg, sock }) => {
    const from = msg.chat;

    // El mensaje citado o el mensaje actual
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;

    // Desenvolvemos el mensaje para manejar viewOnce, ephemeral, etc.
    const unwrap = await getUnwrapMessage();
    const targetMsg = unwrap ? unwrap(quoted || msg.message) : (quoted || msg.message);

    if (!targetMsg) {
        return sock.sendMessage(from, { text: 'No se pudo encontrar contenido en el mensaje.' }, { quoted: msg });
    }

    // Encontrar el tipo de mensaje y el contenido de la media
    let type = '';
    let mediaContent = null;

    if (targetMsg.imageMessage) {
        type = 'image';
        mediaContent = targetMsg.imageMessage;
    } else if (targetMsg.videoMessage) {
        type = 'video';
        mediaContent = targetMsg.videoMessage;
    } else if (targetMsg.audioMessage) {
        type = 'audio';
        mediaContent = targetMsg.audioMessage;
    } else if (targetMsg.documentMessage) {
        type = 'document';
        mediaContent = targetMsg.documentMessage;
    }

    if (!type || !mediaContent) {
      return sock.sendMessage(from, { text: 'Responde a un *archivo, imagen, video o audio* para reenviarlo.' }, { quoted: msg });
    }

    const mime = mediaContent.mimetype || '';
    const fileName = mediaContent.fileName || `archivo.${mime.split('/')[1] || 'bin'}`;

    await sock.sendMessage(from, { react: { text: '🕒', key: msg.key } });

    try {
      const stream = await downloadContentFromMessage(mediaContent, type);
      const chunks = [];
      for await (const chunk of stream) {
        chunks.push(chunk);
      }
      const buffer = Buffer.concat(chunks);

      if (!buffer || buffer.length === 0) throw new Error('No se pudo descargar la media');

      if (type === 'image') {
        await sock.sendMessage(from, { image: buffer }, { quoted: msg });
      } else if (type === 'video') {
        await sock.sendMessage(from, { video: buffer }, { quoted: msg });
      } else if (type === 'audio') {
        await sock.sendMessage(from, { audio: buffer, mimetype: mime, fileName, ptt: false }, { quoted: msg });
      } else if (type === 'document') {
        await sock.sendMessage(from, { document: buffer, mimetype: mime, fileName }, { quoted: msg });
      }

      await sock.sendMessage(from, { react: { text: '✅', key: msg.key } });
    } catch (e) {
      console.error('Error en el comando ver:', e);
      await sock.sendMessage(from, { react: { text: '❌', key: msg.key } });
      await sock.sendMessage(from, { text: 'Ocurrió un error al intentar reenviar el archivo.' }, { quoted: msg });
    }
  }
}
