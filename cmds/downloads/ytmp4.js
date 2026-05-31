import yts from 'yt-search'
import fetch from 'node-fetch'

const cmd = {
  command: ['play2', 'mp4', 'ytmp4', 'ytvideo', 'playvideo'],
  category: 'downloads',
  description: 'Descargar un vídeo de YouTube.',
  run: async ({ msg, sock, args, usedPrefix, command }) => {
    try {
      if (!args[0]) {
        return msg.reply('《✧》Por favor, menciona el nombre o URL del video que deseas descargar')
      }

      const input_text = args.join(' ').trim()
      const video_id = getVideoId(input_text)
      const query = video_id ? `https://youtu.be/${video_id}` : input_text

      let url = query
      let title = 'video'
      let thumbnail = null

      try {
        const video_info = await getVideoInfo(query, video_id)

        if (video_info) {
          url = video_info.url || `https://youtu.be/${video_info.videoId}`
          title = video_info.title || title
          thumbnail = video_info.image || video_info.thumbnail || null

          const views = (video_info.views || 0).toLocaleString()
          const channel = video_info.author?.name || video_info.author || 'Desconocido'

          const info_message = `➩ Descargando › *${title}*

> ❖ Canal › *${channel}*
> ⴵ Duración › *${video_info.timestamp || 'Desconocido'}*
> ❀ Vistas › *${views}*
> ✩ Publicado › *${video_info.ago || 'Desconocido'}*
> ❒ Calidad › *${ryze_format}*
> ❒ Enlace › *${url}*`

          if (thumbnail) {
            await sock.sendMessage(msg.chat, {
              image: { url: thumbnail },
              caption: info_message
            }, { quoted: msg })
          } else {
            await msg.reply(info_message)
          }
        }
      } catch {}

      if (!isYTUrl(url)) {
        return msg.reply('《✧》No encontré un video válido de YouTube.')
      }

      const video = await getVideoFromRyze(url)

      if (!video?.url) {
        return msg.reply('《✧》No se pudo descargar el *video*, intenta más tarde.')
      }

      await sock.sendMessage(msg.chat, {
        video: { url: video.url },
        fileName: `${sanitizeFileName(video.title || title)}.mp4`,
        mimetype: 'video/mp4',
        caption: `乂 *Video descargado*

> ❒ Calidad › *${video.quality || ryze_format}*
> ❒ Tamaño › *${video.size || 'Desconocido'}*`
      }, { quoted: msg })

    } catch (e) {
      await msg.reply(
        `> An unexpected error occurred while executing command *${usedPrefix + command}*.\n> [Error: *${e.message}*]`
      )
    }
  }
}

export default cmd

const ryze_api = 'https://ryzecodes.xyz/api/scrapers/36/run'
const ryze_key = 'ryzk0cdn'
const ryze_format = '480p'
const ryze_attempts = 6
const ryze_interval_ms = 1100

const isYTUrl = (url = '') =>
  /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/i.test(url)

const getVideoId = (text = '') => {
  const match = text.match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/|v\/))([a-zA-Z0-9_-]{11})/
  )

  return match?.[1] || null
}

const sanitizeFileName = (name = 'video') =>
  name
    .replace(/[\\/:*?"<>|]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120) || 'video'

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

  return video || null
}

async function getVideoFromRyze(url) {
  const res = await fetchJson(ryze_api, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': ryze_key
    },
    body: JSON.stringify({
      input: {
        url,
        format: ryze_format,
        attempts: ryze_attempts,
        interval_ms: ryze_interval_ms
      }
    })
  })

  const result = res?.result

  if (!res?.success || !result?.success) {
    throw new Error(res?.error || result?.error || 'API sin resultado válido')
  }

  const video_url =
    result.file_url ||
    result.download_urls?.[0] ||
    null

  if (!video_url) return null

  return {
    url: video_url,
    title: result.title || null,
    provider: result.provider || null,
    format: result.format || ryze_format,
    quality: result.selected_media?.quality || result.format || ryze_format,
    extension: result.selected_media?.extension || 'MP4',
    size: result.selected_media?.size || null,
    worker_url: result.diagnostics?.worker_url || null
  }
}
