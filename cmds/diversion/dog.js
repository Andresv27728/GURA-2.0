import axios from 'axios';

export default {
  command: ['dog', 'perro'],
  category: 'diversion',
  description: 'Envía una foto de un perro al azar.',
  run: async ({ msg, sock }) => {
    try {
      const apiResponse = await axios.get('https://dog.ceo/api/breeds/image/random');
      const dogImageUrl = apiResponse.data.message;

      if (!dogImageUrl) throw new Error('La API de perros no devolvió una URL válida.');

      const imageResponse = await axios.get(dogImageUrl, { responseType: 'arraybuffer' });

      const contentType = imageResponse.headers['content-type'];
      if (!contentType || !contentType.startsWith('image/')) throw new Error(`La URL no devolvió una imagen, sino un ${contentType}.`);

      const imageBuffer = Buffer.from(imageResponse.data, 'binary');

      await sock.sendMessage(msg.chat, { image: imageBuffer, caption: '¡Aquí tienes un lindo perrito! 🐶' }, { quoted: msg });

    } catch (e) {
      console.error('Error en el comando dog:', e);
      await sock.sendMessage(msg.chat, { text: `No se pudo obtener una foto de un perro. Error: ${e.message}` }, { quoted: msg });
    }
  }
}
