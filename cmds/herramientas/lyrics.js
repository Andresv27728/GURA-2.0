import fetch from 'node-fetch';
import ytSearch from 'yt-search';

export default {
  command: ['lyrics', 'letra'],
  category: 'herramientas',
  description: 'Busca la letra de una canción usando YOSOYYO API.',
  run: async ({ msg, sock, args }) => {
    const from = msg.chat;
    const query = args.join(' ');

    if (!query) return sock.sendMessage(from, { text: 'Por favor, proporciona el nombre de la canción.' }, { quoted: msg });

    try {
      await sock.sendMessage(from, { text: `✍️ Buscando la letra de "${query}"...` }, { quoted: msg });

      const apiBase = 'https://yosoyyo-api-ofc.onrender.com/api/lyrics';
      const apiKey = 'Andresv27728';

      let res = await fetch(`${apiBase}?q=${encodeURIComponent(query)}&apiKey=${apiKey}`);
      let data = await res.json();

      if (!data?.result?.lyrics) {
        console.log('🔁 Usando respaldo con yt-search...');

        const search = await ytSearch(query);
        const video = search.videos?.[0];

        if (!video) throw new Error('No se encontró video en YouTube.');

        const ytUrl = video.url;

        res = await fetch(`${apiBase}?q=${encodeURIComponent(ytUrl)}&apiKey=${apiKey}`);
        data = await res.json();
      }

      const result = data?.result;

      if (!result?.lyrics) return sock.sendMessage(from, { text: `❌ No encontré la letra para "${query}".` }, { quoted: msg });

      const maxChars = 60096;
      let lyrics = result.lyrics;

      if (lyrics.length > maxChars) lyrics = lyrics.slice(0, maxChars - 50) + '\n...';

      const message = `📜 *${result.title}*\n👤 ${result.artist}\n\n${lyrics}\n\n🌐 API: https://yosoyyo-api-ofc.onrender.com`;

      await sock.sendMessage(from, { text: message }, { quoted: msg });

    } catch (error) {
      console.error('Error en lyrics:', error);
      await sock.sendMessage(from, { text: `❌ Ocurrió un error al buscar la letra de "${query}".` }, { quoted: msg });
    }
  }
}
