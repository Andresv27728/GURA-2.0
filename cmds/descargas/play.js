import fetch from 'node-fetch'
import axios from 'axios'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { exec } from 'child_process'
import { wrapper } from 'axios-cookiejar-support'
import { CookieJar } from 'tough-cookie'
import { yt2mate, savetube, ytSearch } from '../../lib/ytscrapers.js'

const LimitAud = 725 * 1024 * 1024
const userRequests = new Set()

const TMP_DIR = path.join(process.cwd(), 'tmp');
if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true })

const BASE_URL = 'https://downr.org'
const INFO_API = `${BASE_URL}/.netlify/functions/video-info`
const DOWNLOAD_API = `${BASE_URL}/.netlify/functions/youtube-download`
const ANALYTICS_API = `${BASE_URL}/.netlify/functions/analytics`

const headers = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Origin': 'https://downr.org',
  'Referer': 'https://downr.org/',
  'Content-Type': 'application/json',
  'Accept': '*/*',
  'Accept-Language': 'en-US,en;q=0.9'
}

const jar = new CookieJar()
const client = wrapper(axios.create({ jar }))

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

async function initSession() {
  try {
    await client.get(ANALYTICS_API, { headers })
  } catch (_) {}
}

async function fetchVideoInfo(url) {
  let videoData = null
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const infoResponse = await client.post(
        INFO_API,
        { url },
        { headers }
      )
      videoData = infoResponse.data
      break
    } catch (error) {
      if (error.response && error.response.status === 403 && error.response.data === 'user_retry_required') {
        await sleep(2000)
        continue
      }
      throw error
    }
  }
  return videoData
}

function buildTasks(url, videoData) {
  const mediaList = videoData?.medias || []
  const audioSource = mediaList.find(m => m.type === 'audio')
  const tasks = []
  if (audioSource) {
    tasks.push({
      name: 'Audio MP3',
      payload: { url, downloadMode: 'audio', videoQuality: '128' }
    })
  }
  return tasks
}

async function requestDownload(task) {
  const downloadResponse = await client.post(DOWNLOAD_API, task.payload, { headers })
  return downloadResponse.data
}

async function downloadToBuffer(url, referer = 'https://downr.org/') {
  const response = await axios.get(url, {
      responseType: 'arraybuffer',
      headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer': referer
      }
  })
  return Buffer.from(response.data)
}

let ffmpegPath = null;
function ffmpegConvert(input, output) {
  return new Promise(async (resolve, reject) => {
    try {
      if (!ffmpegPath) {
        try { ffmpegPath = (await import('ffmpeg-static')).default; } catch { ffmpegPath = null; }
      }
      const cmd = ffmpegPath
        ? `"${ffmpegPath}" -y -loglevel error -i "${input}" -map a -vn -acodec libmp3lame -ab 128k -ar 44100 "${output}"`
        : `ffmpeg -y -loglevel error -i "${input}" -map a -vn -acodec libmp3lame -ab 128k -ar 44100 "${output}"`;
      exec(cmd, err => err ? reject(err) : resolve());
    } catch (e) { reject(e); }
  })
}

export default {
  command: ['play', 'musica','play3','playdoc','play4','playdoc2'],
  category: 'descargas',
  description: 'Descarga audio de YouTube por nombre o URL.',
  run: async ({ msg, sock, args }) => {
    const from = msg.chat
    const text = args.join(' ')
    if (!text) return sock.sendMessage(from, { text: '🎵 Usa: .play nombre de canción' }, { quoted: msg })

    if (userRequests.has(msg.sender)) return sock.sendMessage(from, { text: '⏳ Ya tienes una descarga en proceso.' }, { quoted: msg })
    userRequests.add(msg.sender)

    let rawPath, mp3Path
    try {
      await sock.sendMessage(from, { react: { text: '🔍', key: msg.key } })

      const search = await ytSearch(text)
      const video = search.videos[0]
      if (!video) throw new Error('Sin resultados')

      const caption = `🎶 *${video.title}*\n⏱ Duración: ${video.timestamp}\n\nProcesando descarga...`

      if (video.image && video.image.trim() !== '') {
        await sock.sendMessage(from, { image: { url: video.image }, caption }, { quoted: msg })
      } else {
        await sock.sendMessage(from, { text: caption }, { quoted: msg })
      }

      let downloadUrl = null
      let buffer = null

      // 1. Primary: yosoyyo-api (from ytSearch)
      if (video.download?.mp3) {
        try {
          console.log('Trying yosoyyo-api...')
          downloadUrl = video.download.mp3
          buffer = await downloadToBuffer(downloadUrl).catch(() => null)
        } catch (err) {
          console.error('yosoyyo-api error:', err.message)
        }
      }

      // 2. Fallback: Scraper downr.org
      if (!buffer || buffer.length === 0) {
        try {
          console.log('Trying downr.org...')
          await initSession()
          const videoData = await fetchVideoInfo(video.url)
          const tasks = buildTasks(video.url, videoData)
          const audioTask = tasks[0]
          if (audioTask) {
            const dlData = await requestDownload(audioTask)
            if (dlData?.url) {
              downloadUrl = dlData.url
              buffer = await downloadToBuffer(downloadUrl, 'https://downr.org/').catch(() => null)
            }
          }
        } catch (err) {
          console.error('Scraper downr error:', err.message)
        }
      }

      // 3. Reinforcement: yt2mate
      if (!buffer || buffer.length === 0) {
        try {
          console.log('Trying yt2mate...')
          const res = await yt2mate(video.url, 'mp3')
          if (res?.download) {
            downloadUrl = res.download
            buffer = await downloadToBuffer(downloadUrl, 'https://v1.y2mate.nu/').catch(() => null)
          }
        } catch (err) {
          console.error('yt2mate error:', err.message)
        }
      }

      // 4. Reinforcement: savetube
      if (!buffer || buffer.length === 0) {
        try {
          console.log('Trying savetube...')
          const res = await savetube(video.url)
          if (res?.status && res.audios?.length > 0) {
            downloadUrl = res.audios[0].url
            buffer = await downloadToBuffer(downloadUrl, 'https://save-tube.com/').catch(() => null)
          }
        } catch (err) {
          console.error('savetube error:', err.message)
        }
      }

      if (!buffer || buffer.length === 0) throw new Error('No se pudo descargar el audio o el archivo está vacío (0kb).')

      const safe = video.title.replace(/[\\/:*?"<>|]/g,'').slice(0,50)
      const randomId = crypto.randomBytes(8).toString('hex');
      rawPath = path.join(TMP_DIR, `${randomId}.bin`)
      mp3Path = path.join(TMP_DIR, `${randomId}.mp3`)

      fs.writeFileSync(rawPath, buffer)

      // Conversión
      try {
        await ffmpegConvert(rawPath, mp3Path)
      } catch {
        fs.writeFileSync(mp3Path, buffer)
      }

      // Envío
      const finalAudio = fs.readFileSync(mp3Path)
      let sent = false
      try {
        await sock.sendMessage(from, { audio: finalAudio, mimetype: 'audio/mpeg' }, { quoted: msg })
        sent = true
      } catch {}

      if (!sent) {
        await sock.sendMessage(from, { document: finalAudio, mimetype: 'audio/mpeg', fileName: `${safe}.mp3` }, { quoted: msg })
      }

      await sock.sendMessage(from, { react: { text: '✅', key: msg.key } })

    } catch (e) {
      console.error(e)
      await sock.sendMessage(from, { text: `❌ Error: ${e.message}` }, { quoted: msg })
      await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
    } finally {
      if (rawPath && fs.existsSync(rawPath)) fs.unlinkSync(rawPath)
      if (mp3Path && fs.existsSync(mp3Path)) fs.unlinkSync(mp3Path)
      userRequests.delete(msg.sender)
    }
  }
}
