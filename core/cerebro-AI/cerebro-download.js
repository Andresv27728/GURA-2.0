import yts from 'yt-search';
import { mkdir, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { resolve } from 'path';

const opik_api = 'https://dlp.opik.net/api/download';
const opik_base = 'https://dlp.opik.net';

function isYTUrl(url) {
  return /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/i.test(url);
}

function getVideoId(text) {
  const match = text.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/|v\/))([a-zA-Z0-9_-]{11})/);
  return match?.[1] || null;
}

function sanitizeFileName(name) {
  return name.replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, ' ').trim().slice(0, 120) || 'audio';
}

async function getVideoInfo(input, video_id) {
  if (video_id) {
    try {
      const info = await yts({ videoId: video_id });
      if (info?.videoId) return { ...info, url: `https://youtu.be/${info.videoId}`, image: info.thumbnail || info.image };
    } catch {}
  }
  const search = await yts(input);
  const video = search.videos?.[0] || search.all?.find(v => v.type === 'video');
  return video || null;
}

function buildDownloadUrls(download_url, file) {
  const urls = [];
  for (const raw of [download_url, file?.absolute_url, file?.url]) {
    if (!raw) continue;
    const full_url = raw.startsWith('http') ? raw : new URL(raw, opik_base).href;
    urls.push(full_url);
    if (full_url.startsWith('http://')) urls.push(full_url.replace('http://', 'https://'));
    if (full_url.startsWith('https://')) urls.push(full_url.replace('https://', 'http://'));
  }
  return [...new Set(urls)];
}

async function getAudioFromOpik(url) {
  const body = { args: `${url} -x --audio-format mp3 --embed-thumbnail`, label: '' };
  const res = await globalThis.fetch(opik_api, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(`Opik API error: ${res.status}`);
  const data = await res.json();
  const file = data?.generated_files?.[0] || data?.job?.generated_files?.[0] || null;
  const download_url = data?.download_url || file?.absolute_url || file?.url || null;
  if (!download_url && !file?.url && !file?.absolute_url) return null;
  const urls = buildDownloadUrls(download_url, file);
  return {
    url: urls[0], urls, name: file?.name || null,
    size: file?.size || null, size_human: file?.size_human || null,
    job_id: data?.job?.id || null, status: data?.job?.status || null
  };
}

export async function downloadAudio(query) {
  if (!query) return JSON.stringify({ success: false, error: "Falta el query (nombre o URL de YouTube)." }, null, 2);
  try {
    const video_id = getVideoId(query);
    const searchQuery = video_id ? `https://youtu.be/${video_id}` : query;
    let title = 'audio';
    if (isYTUrl(searchQuery) || video_id) {
      const video_info = await getVideoInfo(searchQuery, video_id);
      if (video_info) title = video_info.title || title;
    }
    const audio = await getAudioFromOpik(video_id ? `https://youtu.be/${video_id}` : query);
    if (!audio?.url) return JSON.stringify({ success: false, error: "No se pudo obtener el audio." }, null, 2);
    const ext = 'mp3';
    const localName = `${sanitizeFileName(title)}.${ext}`;
    const localPath = resolve(`./temp_agent/${localName}`);
    if (!existsSync('./temp_agent')) await mkdir('./temp_agent', { recursive: true });
    const res = await globalThis.fetch(audio.url);
    if (!res.ok) throw new Error(`HTTP ${res.status} al descargar audio`);
    const buf = Buffer.from(await res.arrayBuffer());
    await writeFile(localPath, buf);
    return JSON.stringify({
      success: true,
      title,
      filePath: localPath,
      fileName: localName,
      size: audio.size_human || `${buf.length} bytes`,
      message: `Audio descargado como ${localName}. Usa send_message con type:'audio' y content:'${localPath}' para enviarlo.`
    }, null, 2);
  } catch (e) {
    return JSON.stringify({ success: false, error: e.message }, null, 2);
  }
}
