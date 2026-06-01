import fetch from 'node-fetch';
import { createHash, randomUUID } from 'crypto';

const QWEN_EMAIL = "isolatedlabs.cn@gmail.com";
const QWEN_PASSWORD = "IsolatedLabs-67";

const BASE = 'https://chat.qwen.ai';
const MODEL = 'qwen3.7-plus';

const HEADERS = {
  'content-type': 'application/json',
  accept: 'application/json',
  source: 'web',
  version: '0.2.40',
  'user-agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36',
  'accept-language': 'en-US,en;q=0.9',
  origin: BASE,
  referer: `${BASE}/`,
};

const langs = {
  typescript: 'ts',
  javascript: 'js',
  python: 'py',
  html: 'html',
  css: 'css',
  java: 'java',
  cpp: 'cpp',
  c: 'c',
  json: 'json',
  bash: 'sh',
  sql: 'sql',
  rust: 'rs',
  go: 'go',
  php: 'php',
  ruby: 'rb',
};

function detectLanguage(query, response) {
  const q = query.toLowerCase();
  const r = response;

  if (/typescript/i.test(q)) return 'typescript';
  if (/\bpython\b/i.test(q)) return 'python';
  if (/\bhtml\b/i.test(q)) return 'html';
  if (/\bcss\b/i.test(q)) return 'css';
  if (/\bjava\b(?!script)/i.test(q)) return 'java';
  if (/\bc\+\+|cpp\b/i.test(q)) return 'cpp';
  if (/\bjson\b/i.test(q)) return 'json';
  if (/\bbash\b|\bshell\b/i.test(q)) return 'bash';
  if (/\bsql\b/i.test(q)) return 'sql';
  if (/\brust\b/i.test(q)) return 'rust';
  if (/\bgolang\b|\bgo\b/i.test(q)) return 'go';
  if (/\bphp\b/i.test(q)) return 'php';
  if (/\bruby\b/i.test(q)) return 'ruby';
  if (/javascript/i.test(q)) return 'javascript';

  const asksCode = /(c[oó]digo|code|programa|script|funci[oó]n|clase|m[eé]todo|algoritmo|actualiza|edita|crea|implementa)/i.test(q);
  if (!asksCode) return null;

  if (/def |import \w+\n|print\s*\(|:\n\s{4}/i.test(r)) return 'python';
  if (/<html|<div|<body|<span|<head/i.test(r)) return 'html';
  if (/\{[\s\S]*color:|margin:|padding:|font-/i.test(r)) return 'css';
  if (/public\s+class|System\.out\.print/i.test(r)) return 'java';
  if (/#include\s*<|int main\s*\(/i.test(r)) return 'cpp';
  if (/SELECT |INSERT |UPDATE |DELETE |CREATE TABLE/i.test(r)) return 'sql';
  if (/fn main\(\)|let mut |println!\(/i.test(r)) return 'rust';
  if (/func \w+\(|package main|fmt\.Print/i.test(r)) return 'go';
  if (/<\?php|\$[a-z_]+\s*=/i.test(r)) return 'php';
  if (/def initialize|\.each do |puts /i.test(r)) return 'ruby';
  if (/\{["'][\w]+["']\s*:/i.test(r) && !/function|const|let|var/.test(r)) return 'json';

  if (/function|class\s+\w|const |let |var |=>|\bimport\b|\bexport\b|console\.log/i.test(r)) {
    return /:\s*(string|number|boolean|void|any)\b|interface\s+\w|<\w+>/i.test(r)
      ? 'typescript'
      : 'javascript';
  }

  return null;
}

function sha256(text) {
  return createHash('sha256').update(text).digest('hex');
}

function parseCookies(setCookieHeaders) {
  const jar = {};
  for (const header of setCookieHeaders || []) {
    const part = header.split(';')[0].trim();
    const eq = part.indexOf('=');
    if (eq !== -1) {
      jar[part.slice(0, eq).trim()] = part.slice(eq + 1).trim();
    }
  }
  return jar;
}

function cookieString(jar) {
  return Object.entries(jar)
    .map(([k, v]) => `${k}=${v}`)
    .join('; ');
}

let cachedJar = null;

async function signin() {
  if (!QWEN_EMAIL || !QWEN_PASSWORD) {
    throw new Error('Qwen no está configurado. Define QWEN_EMAIL y QWEN_PASSWORD.');
  }

  const jar = {};
  const res = await fetch(`${BASE}/api/v2/auths/signin`, {
    method: 'POST',
    headers: { ...HEADERS, cookie: cookieString(jar) },
    body: JSON.stringify({
      email: QWEN_EMAIL,
      password: sha256(QWEN_PASSWORD),
    }),
  });

  const setCookies = res.headers.getSetCookie?.() ?? [];
  Object.assign(jar, parseCookies(setCookies));

  let body = {};
  try {
    body = await res.json();
  } catch {}

  if (!res.ok || body?.success === false) {
    throw new Error(`Qwen signin falló: ${JSON.stringify(body)}`);
  }

  cachedJar = jar;
  return jar;
}

async function ensureAuth() {
  if (cachedJar) return cachedJar;
  return signin();
}

async function createChat(jar, signal) {
  const res = await fetch(`${BASE}/api/v2/chats/new`, {
    method: 'POST',
    headers: { ...HEADERS, cookie: cookieString(jar) },
    body: JSON.stringify({
      title: 'New Chat',
      models: [MODEL],
      chat_mode: 'normal',
      chat_type: 't2t',
      timestamp: Date.now(),
      project_id: '',
    }),
    signal,
  });

  const body = await res.json();
  if (!body?.data?.id) {
    throw new Error(`Qwen createChat falló: ${JSON.stringify(body)}`);
  }

  return body.data.id;
}

async function streamCompletion(chatId, prompt, jar, onChunk, signal) {
  const fid = randomUUID();
  const controller = new AbortController();
  const onExternalAbort = () => controller.abort();

  if (signal) {
    if (signal.aborted) controller.abort();
    else signal.addEventListener('abort', onExternalAbort, { once: true });
  }

  const payload = {
    stream: true,
    version: '2.1',
    incremental_output: true,
    chat_id: chatId,
    chat_mode: 'normal',
    model: MODEL,
    parent_id: null,
    messages: [
      {
        fid,
        parentId: null,
        childrenIds: [],
        role: 'user',
        content: prompt,
        user_action: 'chat',
        files: [],
        timestamp: Math.floor(Date.now() / 1000),
        models: [MODEL],
        chat_type: 't2t',
        feature_config: {
          thinking_enabled: true,
          output_schema: 'phase',
          research_mode: 'normal',
          auto_thinking: false,
          thinking_mode: 'Thinking',
          thinking_format: 'summary',
          auto_search: false,
        },
        extra: { meta: { subChatType: 't2t' } },
        sub_chat_type: 't2t',
        parent_id: null,
      },
    ],
    timestamp: Math.floor(Date.now() / 1000),
  };

  try {
    const res = await fetch(`${BASE}/api/v2/chat/completions?chat_id=${chatId}`, {
      method: 'POST',
      headers: {
        ...HEADERS,
        accept: 'text/event-stream',
        'x-accel-buffering': 'no',
        cookie: cookieString(jar),
        referer: `${BASE}/c/${chatId}`,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!res.ok) {
      const text = await res.text();
      if (res.status === 401 || res.status === 403) {
        cachedJar = null;
        throw new Error(`Qwen auth expirado (${res.status}): ${text.slice(0, 200)}`);
      }
      throw new Error(`Qwen completion falló (${res.status}): ${text.slice(0, 200)}`);
    }

    let thinking = '';
    let answer = '';
    const decoder = new TextDecoder();
    let buffer = '';

    for await (const chunk of res.body) {
      buffer += decoder.decode(chunk, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop();

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const raw = line.slice(6).trim();
        if (raw === '[DONE]') break;

        let parsed;
        try {
          parsed = JSON.parse(raw);
        } catch {
          continue;
        }

        const delta = parsed?.choices?.[0]?.delta;
        if (!delta) continue;

        if (delta.phase === 'thinking_summary') {
          const thought = delta.extra?.summary_thought?.content?.[0];
          if (thought && thought.length > thinking.length) {
            const newDelta = thought.slice(thinking.length);
            thinking = thought;
            if (onChunk) onChunk(newDelta, 'thinking');
          }
        } else if (delta.phase === 'answer' && delta.content) {
          answer += delta.content;
          if (onChunk) onChunk(delta.content, 'answer');
        }
      }
    }

    return { text: answer.trim(), thinking: thinking.trim() };
  } finally {
    if (signal) signal.removeEventListener('abort', onExternalAbort);
  }
}

async function qwen(prompt, onChunk = null, options = {}) {
  const MAX_RETRIES = 2;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const jar = await ensureAuth();
      const chatId = await createChat(jar, options.signal);
      const result = await streamCompletion(chatId, prompt, jar, onChunk, options.signal);

      return {
        status: true,
        text: result.text,
        thinking: result.thinking,
      };
    } catch (err) {
      if (err?.name === 'AbortError') throw err;

      const isAuthError =
        err.message?.includes('401') ||
        err.message?.includes('403') ||
        err.message?.includes('auth') ||
        err.message?.includes('login');

      if (isAuthError && attempt < MAX_RETRIES) {
        cachedJar = null;
        continue;
      }

      throw err;
    }
  }
}

export default {
  command: ['ia', 'chatgpt'],
  category: 'utils',
  description: 'Realizar peticiones a Qwen.',
  run: async ({ msg, sock, args, usedPrefix, command }) => {
    const text = args.join(' ').trim();

    if (!text) {
      return msg.reply(`《✧》 Escriba una *petición* para que *Qwen* le responda.`);
    }

    const botId = sock.user.id.split(':')[0] + '@s.whatsapp.net';
    const settings = global.db.data.settings[botId];
    const user = global.db.data.users[msg.sender];
    const username = user?.name || 'usuario';
    const botname = settings.botname || 'Bot';

    const basePrompt = `Tu nombre es ${botname}, eres una IA amigable, divertida y útil. Hablas en español. Llamarás a la persona por su nombre: ${username}.`;

    try {
      const { key } = await sock.sendMessage(
        msg.chat,
        { text: `ꕥ *Qwen* está procesando tu respuesta...` },
        { quoted: msg }
      );

      await msg.react('🕒');

      const result = await qwen(`${basePrompt}\n\nUsuario: ${text}`);

      if (!result?.status || !result.text) {
        return sock.reply(msg.chat, '《✧》 No se pudo obtener una *respuesta* válida', msg);
      }

      const clean = result.text.trim();
      const lang = detectLanguage(text, clean);

      if (lang) {
        const ext = langs[lang] ?? 'txt';
        const filename = `ꕥ respuesta.${ext}`;

        const tableData = {
          title: '✎ Qwen',
          headers: ['Campo', 'Valor'],
          rows: [
            ['Lenguaje', lang],
            ['Líneas', String(clean.split('\n').length)],
            ['Caracteres', String(clean.length)],
          ],
        };

        await sock.sendMessage(msg.chat, {
          text: `ꕥ *Qwen* · respuesta en *${lang}*`,
          edit: key,
        });

        await sock.sendCodeMessage(msg.chat, filename, clean, msg, tableData);
      } else {
        await sock.sendMessage(msg.chat, { text: clean, edit: key });
      }

      await msg.react('✔️');
    } catch (e) {
      await msg.reply(
        `> Ocurrió un error al ejecutar el comando *${usedPrefix + command}*.\n> [Error: *${e.message}*]`
      );
    }
  },
};
