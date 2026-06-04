import fs from 'fs';
import path from 'path';
import axios from 'axios';
import FormData from 'form-data';
import { Shazam } from 'node-shazam';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { zencf } = require('zencf');

async function getSpotifyToken() {
  const { token } = await zencf.turnstileMin('https://spotidownloader.com/en13', '0x4AAAAAAA8QAiFfE5GuBRRS');

  const r = await axios.post('https://api.spotidownloader.com/session',
    { token },
    {
      headers: {
        'user-agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36',
        'content-type': 'application/json',
        origin: 'https://spotidownloader.com',
        referer: 'https://spotidownloader.com/'
      }
    }
  );

  return r.data.token;
}

export async function searchSpotify(query) {
  const bearer = await getSpotifyToken();
  const r = await axios.post('https://api.spotidownloader.com/search',
    { query },
    {
      headers: {
        'user-agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36',
        'content-type': 'application/json',
        authorization: `Bearer ${bearer}`,
        origin: 'https://spotidownloader.com',
        referer: 'https://spotidownloader.com/'
      }
    }
  );
  return r.data;
}

export async function downloadSpotify(input) {
  const bearer = await getSpotifyToken();
  let id = input;
  if (/spotify\.com\/track\//i.test(input)) {
    id = input.split('/track/')[1].split('?')[0];
  } else if (/^[a-zA-Z0-9]{22}$/.test(input)) {
    id = input;
  } else {
    // If it's not a URL or ID, search first
    const searchResults = await searchSpotify(input);
    if (searchResults && searchResults.length > 0) {
      id = searchResults[0].id;
    } else {
      throw new Error('No se encontraron resultados para la búsqueda.');
    }
  }

  const r = await axios.post('https://api.spotidownloader.com/download',
    { id },
    {
      headers: {
        'user-agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36',
        'content-type': 'application/json',
        authorization: `Bearer ${bearer}`,
        origin: 'https://spotidownloader.com',
        referer: 'https://spotidownloader.com/'
      }
    }
  );

  if (!r.data || !r.data.link) {
    throw new Error("No se pudo obtener el enlace de descarga.");
  }

  const audio = await axios.get(r.data.link, {
    responseType: 'arraybuffer',
    headers: {
      'user-agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36',
      authorization: `Bearer ${bearer}`,
      origin: 'https://spotidownloader.com',
      referer: 'https://spotidownloader.com/'
    }
  });

  return {
    buffer: Buffer.from(audio.data),
    metadata: r.data.metadata || {}
  };
}

export async function uploadToAdoFiles(filePath) {
  if (!filePath) {
    throw new Error("El path del archivo está vacío.");
  }
  if (!fs.existsSync(filePath)) {
    throw new Error(`El archivo no existe en la ruta: ${filePath}`);
  }

  try {
    const data = await fs.promises.readFile(filePath);
    const base64Data = data.toString('base64');
    const filename = path.basename(filePath);

    const response = await axios.post('https://adofiles.vercel.app/api/upload', {
      filename: filename,
      data: base64Data,
      expiration: 'never'
    }, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 60000
    });

    if (!response.data || !response.data.url) {
      throw new Error('Invalid response from AdoFiles');
    }

    return response.data.url;

  } catch (error) {
    console.error('Error uploading to AdoFiles:', error.message);
    throw new Error('Failed to upload file to AdoFiles: ' + error.message);
  }
}

export async function identifyMusic(filePath) {
  try {
    const shazam = new Shazam();
    const res = await shazam.recognise(filePath, 'es-ES');

    if (!res || !res.track) {
      return { noResults: true };
    }

    const track = res.track;
    return {
      success: true,
      result: {
        results: [{
          title: track.title,
          artists: track.subtitle ? [track.subtitle] : ['Desconocido'],
          album: track.sections?.find(s => s.type === 'SONG')?.metadata?.find(m => m.title === 'Álbum' || m.title === 'Album')?.text || 'Desconocido',
          genres: track.genres?.primary ? [track.genres.primary] : [],
          releaseDate: track.sections?.find(s => s.type === 'SONG')?.metadata?.find(m => m.title === 'Lanzamiento' || m.title === 'Released')?.text || 'No disponible',
          thumbnail: track.images?.coverart || track.images?.background || null,
          url: track.url || track.share?.href || null
        }]
      }
    };
  } catch (error) {
    console.error('Error in identifyMusic:', error);
    return { success: false, error: error.message };
  }
}

export const MAX_RETRIES = 5;

export async function anitubeFUNCTION(url, retries) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await axios.get(url, { timeout: 15000 });
      if (response.status === 200 && response.data) {
        return response.data;
      }
    } catch (error) {
      console.error(`Attempt ${i + 1} failed for ${url}:`, error.message);
      if (i === retries - 1) {
        throw new Error(`Failed to fetch data from ${url} after ${retries} attempts.`);
      }
      // Wait 2 seconds before retrying
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
}
