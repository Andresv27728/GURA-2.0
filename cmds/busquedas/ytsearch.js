import { ytSearch } from '../../lib/ytscrapers.js';

export default {
  command: ['ytsearch'],
  category: 'busquedas',
  description: 'Busca los 10 videos más relevantes en YouTube.',
  run: async ({ msg, sock, args }) => {
    if (args.length === 0) return sock.sendMessage(msg.chat, { text: 'Por favor, proporciona un término de búsqueda.' }, { quoted: msg });

    const query = args.join(' ');

    try {
      const searchResults = await ytSearch(query);
      const videos = searchResults.videos.slice(0, 10);

      if (videos.length === 0) return sock.sendMessage(msg.chat, { text: 'No se encontraron resultados para tu búsqueda.' }, { quoted: msg });

      let responseText = `*Resultados de la búsqueda para "${query}":*\n\n`;

      videos.forEach((video, index) => {
        responseText += `*${index + 1}. ${video.title}*\n`;
        responseText += `*Autor:* ${video.author.name}\n`;
        responseText += `*Duración:* ${video.timestamp}\n`;
        responseText += `*URL:* ${video.url}\n\n`;
      });

      await sock.sendMessage(msg.chat, { text: responseText.trim() }, { quoted: msg });

    } catch (error) {
      console.error('Error en el comando ytsearch:', error);
      await sock.sendMessage(msg.chat, { text: '❌ Ocurrió un error al realizar la búsqueda.' }, { quoted: msg });
    }
  }
}
