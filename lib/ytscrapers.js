import axios from 'axios';
import crypto from 'crypto';

let jsonYt2mate = null;
const gB = Buffer.from('ZXRhY2xvdWQub3Jn', 'base64').toString();
const headersYt2mate = {
  origin: 'https://v1.y2mate.nu',
  referer: 'https://v1.y2mate.nu/',
  'user-agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36',
  accept: '*/*'
};

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function ts() {
  return Math.floor(Date.now() / 1000);
}

async function getjson() {
  if (jsonYt2mate) return jsonYt2mate;
  const get = await axios.get('https://v1.y2mate.nu');
  const html = get.data;
  const m = /var json = JSON\.parse\('([^']+)'\)/.exec(html);
  if (!m) throw new Error('Could not find json in y2mate');
  jsonYt2mate = JSON.parse(m[1]);
  return jsonYt2mate;
}

function authorization() {
  let e = '';
  for (let i = 0; i < jsonYt2mate[0].length; i++) {
    e += String.fromCharCode(
      jsonYt2mate[0][i] - jsonYt2mate[2][jsonYt2mate[2].length - (i + 1)]
    );
  }
  if (jsonYt2mate[1]) e = e.split('').reverse().join('');
  return e.length > 32 ? e.slice(0, 32) : e;
}

function extrakid(url) {
  const m =
    /youtu\.be\/([a-zA-Z0-9_-]{11})/.exec(url) ||
    /v=([a-zA-Z0-9_-]{11})/.exec(url) ||
    /\/shorts\/([a-zA-Z0-9_-]{11})/.exec(url) ||
    /\/live\/([a-zA-Z0-9_-]{11})/.exec(url);

  if (!m) throw new Error('invalid youtube url');
  return m[1];
}

async function init() {
  const key = String.fromCharCode(jsonYt2mate[6]);
  const url = `https://eta.${gB}/api/v1/init?${key}=${authorization()}&t=${ts()}`;
  const res = await axios.get(url, { headers: headersYt2mate });
  if (res.data.error && res.data.error !== 0 && res.data.error !== '0') {
    throw res.data;
  }
  return res.data;
}

export async function yt2mate(videoUrl, format = 'mp3') {
  try {
    await getjson();
    const videoId = extrakid(videoUrl);
    const initRes = await init();

    let res = await axios.get(
      initRes.convertURL +
        '&v=' + videoId +
        '&f=' + format +
        '&t=' + ts() +
        '&_=' + Math.random(),
      { headers: headersYt2mate }
    );

    let data = res.data;
    if (data.error && data.error !== 0) {
      throw data;
    }

    if (data.redirect === 1 && data.redirectURL) {
      const r2 = await axios.get(
        data.redirectURL + '&t=' + ts(),
        { headers: headersYt2mate }
      );
      data = r2.data;
    }

    if (data.downloadURL && !data.progressURL) {
      return {
        id: videoId,
        title: data.title,
        format,
        download: data.downloadURL
      };
    }

    if (!data.progressURL) throw new Error('No download or progress URL');

    for (let i = 0; i < 20; i++) { // Limit retries to avoid infinite loop
      await sleep(3000);
      const progressRes = await axios.get(
        data.progressURL + '&t=' + ts(),
        { headers: headersYt2mate }
      );

      const p = progressRes.data;
      if (p.error && p.error !== 0) {
        throw p;
      }

      if (p.progress === 3) {
        return {
          id: videoId,
          title: p.title,
          format,
          download: data.downloadURL
        };
      }
    }
    throw new Error('Timeout waiting for conversion');
  } catch (error) {
    console.error('yt2mate error:', error);
    return null;
  }
}

const savetubeAnu = Buffer.from('C5D58EF67A7584E4A29F6C35BBC4EB12', 'hex');

function savetubeDecrypt(enc) {
  const b = Buffer.from(enc.replace(/\s/g, ''), 'base64');
  const iv = b.subarray(0, 16);
  const data = b.subarray(16);
  const d = crypto.createDecipheriv('aes-128-cbc', savetubeAnu, iv);
  return JSON.parse(Buffer.concat([d.update(data), d.final()]).toString());
}

export async function ytSearch(query) {
  const url = `https://yosoyyo-api-ofc.onrender.com/api/youtube?q=${encodeURIComponent(query)}&apiKey=Andresv27728`;
  for (let i = 0; i < 3; i++) {
    try {
      const res = await axios.get(url);
      if (res.data && (res.data.status === 200 || res.data.status === true) && res.data.result) {
        return {
          videos: res.data.result.map(v => {
            const timestamp = v.duration || '0:00';
            const parts = timestamp.split(':').reverse();
            let seconds = 0;
            for (let j = 0; j < parts.length; j++) {
              const val = parseInt(parts[j]);
              if (!isNaN(val)) seconds += val * Math.pow(60, j);
            }
            return {
              title: v.title,
              url: v.videoUrl,
              timestamp,
              seconds,
              image: v.thumbnailUrl || '',
              author: { name: v.channelName || 'Unknown' },
              download: {
                mp3: v.download?.mp3 || v.downloads?.mp3?.url || '',
                mp4: v.download?.mp4 || v.downloads?.mp4?.url || ''
              }
            };
          })
        };
      }
      console.log('--- YOSOYYO API DEBUG ---');
      console.log('URL:', url);
      console.log('Response Data:', JSON.stringify(res.data, null, 2));
      throw new Error(`Invalid API response (Status: ${res.data?.status})`);
    } catch (error) {
      let msg = error.message;
      console.error(`ytSearch error (attempt ${i + 1}):`, msg);
      if (i < 2) {
        await sleep(3000);
      } else {
        throw new Error(`YOSOYYO API error: ${msg}`);
      }
    }
  }
}

export async function savetube(url) {
  try {
    const random = await axios.get('https://media.savetube.vip/api/random-cdn', {
      headers: {
        origin: 'https://save-tube.com',
        referer: 'https://save-tube.com/',
        'User-Agent': 'Mozilla/5.0'
      }
    });

    const cdn = random.data.cdn;
    const info = await axios.post(`https://${cdn}/v2/info`,
      { url },
      {
        headers: {
          'Content-Type': 'application/json',
          origin: 'https://save-tube.com',
          referer: 'https://save-tube.com/',
          'User-Agent': 'Mozilla/5.0'
        }
      }
    );

    if (!info.data || !info.data.status) return { status: false };
    const json = savetubeDecrypt(info.data.data);

    async function download(type, quality) {
      const r = await axios.post(`https://${cdn}/download`,
        {
          id: json.id,
          key: json.key,
          downloadType: type,
          quality: String(quality)
        },
        {
          headers: {
            'Content-Type': 'application/json',
            origin: 'https://save-tube.com',
            referer: 'https://save-tube.com/',
            'User-Agent': 'Mozilla/5.0'
          }
        }
      );
      return r.data && r.data.data ? r.data.data.downloadUrl : null;
    }

    const videos = [];
    for (const v of json.video_formats) {
      videos.push({
        quality: v.quality,
        label: v.label,
        url: await download('video', v.quality)
      });
    }

    const audios = [];
    for (const a of json.audio_formats) {
      audios.push({
        quality: a.quality,
        label: a.label,
        url: await download('audio', a.quality)
      });
    }

    return {
      status: true,
      title: json.title,
      duration: json.duration,
      thumbnail: json.thumbnail,
      videos,
      audios
    };
  } catch (error) {
    console.error('savetube error:', error);
    return { status: false, error: error.message };
  }
}
