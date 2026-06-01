import yts from 'yt-search'
import fetch from 'node-fetch'
import { writeFile, unlink } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { randomUUID } from 'crypto'

const cmd = {
  command: ['play', 'mp3', 'ytmp3', 'ytaudio', 'playaudio'],
  category: 'downloads',
  description: 'Descargar una canción de YouTube.',

  run: async ({ msg, sock, args, usedPrefix, command }) => {
    try {
      const fullText = args.join(' ')
      const shouldCall = /\|\s*(call|llamada)\s*$/i.test(fullText)
      const cleanArgs = shouldCall
        ? fullText.replace(/\|\s*(call|llamada)\s*$/i, '').trim()
        : fullText.trim()

      if (!cleanArgs) {
        return msg.reply('《✧》Por favor, menciona el nombre o URL del video que deseas descargar')
      }

      const video_id = getVideoId(cleanArgs)
      const query = video_id ? `https://youtu.be/${video_id}` : cleanArgs

      let url = query
      let title = 'audio'

      try {
        const video_info = await getVideoInfo(query, video_id)

        if (video_info) {
          url = video_info.url || `https://youtu.be/${video_info.videoId}`
          title = video_info.title || title

          const views = (video_info.views || 0).toLocaleString()
          const channel = video_info.author?.name || video_info.author || 'Desconocido'

          const info_message = `➩ Descargando › ${title}

> ❖ Canal › ${channel}
ⴵ Duración › ${video_info.timestamp || 'Desconocido'}
❀ Vistas › ${views}
✩ Publicado › ${video_info.ago || 'Desconocido'}
❒ Enlace › ${url}`

          if (video_info.image) {
            await sock.sendMessage(
              msg.chat,
              {
                image: { url: video_info.image },
                caption: info_message
              },
              { quoted: msg }
            )
          } else {
            await msg.reply(info_message)
          }
        }
      } catch {}

      if (!isYTUrl(url)) {
        return msg.reply('《✧》No encontré un video válido de YouTube.')
      }

      const audio = await getAudioFromOpik(url)

      if (!audio?.url) {
        return msg.reply('《✧》No se pudo descargar el *audio*, intenta más tarde.')
      }

      if (shouldCall) {
        await sendAudioAsCall({ sock, msg, audio })
      } else {
        await sock.sendMessage(
          msg.chat,
          {
            audio: { url: audio.url },
            fileName: audio.name || `${sanitizeFileName(title)}.mp3`,
            mimetype: 'audio/mpeg'
          },
          { quoted: msg }
        )
      }
    } catch (e) {
      await msg.reply(
        `> An unexpected error occurred while executing command *${usedPrefix + command}*.\n> [Error: *${e.message}*]`
      )
    }
  }
}

export default cmd

const opik_api = 'https://dlp.opik.net/api/download'
const opik_base = 'https://dlp.opik.net'

const isYTUrl = (url = '') =>
  /^(https?:\/\/)?(www\.|m\.)?(youtube\.com|youtu\.be)\/.+$/i.test(url)

const getVideoId = (text = '') => {
  const match = text.match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/|v\/))([a-zA-Z0-9_-]{11})/
  )

  return match?.[1] || null
}

const sanitizeFileName = (name = 'audio') =>
  name
    .replace(/[\/:*?"<>|]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120) || 'audio'

async function fetchJson(url, options = {}) {
  const res = await fetch(url, options)
  const json = await res.json().catch(() => null)

  if (!res.ok) {
    throw new Error(json?.message || json?.error || `HTTP ${res.status}`)
  }

  return json
}

async function getVideoInfo(input, video_id) {
  if (video_id) {
    try {
      const info = await yts({ videoId: video_id })

      if (info?.videoId) {
        return {
          ...info,
          url: `https://youtu.be/${info.videoId}`,
          image: info.thumbnail || info.image
        }
      }
    } catch {}
  }

  const search = await yts(input)
  const video = search.videos?.[0] || search.all?.find(v => v.type === 'video')

  if (!video) return null

  return {
    ...video,
    url: video.url || `https://youtu.be/${video.videoId}`,
    image: video.thumbnail || video.image
  }
}

function buildDownloadUrls(download_url, file) {
  const urls = []

  for (const raw of [download_url, file?.absolute_url, file?.url]) {
    if (!raw) continue

    const full_url = raw.startsWith('http')
      ? raw
      : new URL(raw, opik_base).href

    urls.push(full_url)

    if (full_url.startsWith('http://')) {
      urls.push(full_url.replace('http://', 'https://'))
    }

    if (full_url.startsWith('https://')) {
      urls.push(full_url.replace('https://', 'http://'))
    }
  }

  return [...new Set(urls)]
}

async function getAudioFromOpik(url) {
  const body = {
    args: `${url} -x --audio-format mp3 --embed-thumbnail`,
    label: ''
  }

  const res = await fetchJson(opik_api, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  })

  const file =
    res?.generated_files?.[0] ||
    res?.job?.generated_files?.[0] ||
    null

  const download_url =
    res?.download_url ||
    file?.absolute_url ||
    file?.url ||
    null

  if (!download_url && !file?.url && !file?.absolute_url) return null

  const urls = buildDownloadUrls(download_url, file)

  return {
    url: urls[0],
    urls,
    name: file?.name || null,
    size: file?.size || null,
    size_human: file?.size_human || null,
    job_id: res?.job?.id || null,
    status: res?.job?.status || null
  }
}

async function downloadAudioBuffer(urls = []) {
  let lastError = null

  for (const url of urls) {
    try {
      const res = await fetch(url)

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`)
      }

      const arrayBuffer = await res.arrayBuffer()
      return Buffer.from(arrayBuffer)
    } catch (e) {
      lastError = e
    }
  }

  throw lastError || new Error('No se pudo descargar el audio')
}

async function sendAudioAsCall({ sock, msg, audio }) {
  const tempFilePath = join(tmpdir(), `play-${randomUUID()}.mp3`)
  let client = null

  try {
    const audioBuffer = await downloadAudioBuffer(audio.urls?.length ? audio.urls : [audio.url])

    await writeFile(tempFilePath, audioBuffer)

    const { VoipClient } = await import('baileys-caller')
    const baileys = await import('baileys')

    client = new VoipClient({ sock, baileys })
    await client.connect()

    const call = await client.call(msg.chat, {
      audioSource: tempFilePath
    })

    call.on('ringing', () => console.log('ringing'))
    call.on('connected', () => console.log('connected'))
    call.on('audio', () => {})
    call.on('ended', reason => console.log('ended:', reason))

    await call.waitForEnd()
  } finally {
    if (client) {
      try {
        client.disconnect()
      } catch {}
    }

    await unlink(tempFilePath).catch(() => {})
  }
}