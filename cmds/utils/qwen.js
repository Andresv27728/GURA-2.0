import { createHash, randomUUID } from 'crypto';

const QWEN_EMAIL = "isolatedlabs.cn@gmail.com";
const QWEN_PASSWORD = "IsolatedLabs-67";
const BASE = 'https://chat.qwen.ai';
const MODEL = 'qwen3.6-max-preview';

const HEADERS = {
  'content-type': 'application/json',
  'accept': 'application/json',
  'source': 'web',
  'version': '0.2.40',
  'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36',
  'accept-language': 'en-US,en;q=0.9',
  'origin': BASE,
  'referer': `${BASE}/`,
};

if (!global.qwenHistory) global.qwenHistory = {};
if (!global.qwenGlobalChatIds) global.qwenGlobalChatIds = {};

function sha256(text) { return createHash('sha256').update(text).digest('hex'); }

function parseCookies(setCookieHeaders) {
  const jar = {};
  for (const header of setCookieHeaders || []) {
    const part = header.split(';')[0].trim();
    const eq = part.indexOf('=');
    if (eq !== -1) jar[part.slice(0, eq).trim()] = part.slice(eq + 1).trim();
  }
  return jar;
}

function cookieString(jar) { return Object.entries(jar).map(([k, v]) => `${k}=${v}`).join('; '); }

let cachedJar = null;

async function signin() {
  const jar = {};
  const res = await globalThis.fetch(`${BASE}/api/v2/auths/signin`, {
    method: 'POST',
    headers: { ...HEADERS, cookie: cookieString(jar) },
    body: JSON.stringify({ email: QWEN_EMAIL, password: sha256(QWEN_PASSWORD) }),
  });
  const setCookies = res.headers.getSetCookie?.() ?? [];
  Object.assign(jar, parseCookies(setCookies));
  cachedJar = jar;
  return jar;
}

async function ensureAuth() { return cachedJar ? cachedJar : signin(); }

async function createChat(jar) {
  const res = await globalThis.fetch(`${BASE}/api/v2/chats/new`, {
    method: 'POST',
    headers: { ...HEADERS, cookie: cookieString(jar) },
    body: JSON.stringify({ title: 'WhatsApp Bot Session', models: [MODEL], chat_mode: 'normal', chat_type: 't2t', timestamp: Date.now() }),
  });
  const body = await res.json();
  return body?.data?.id;
}

async function streamCompletion(chatId, prompt, jar) {
  const payload = {
    stream: true,
    chat_id: chatId,
    model: MODEL,
    messages: [{ role: 'user', content: prompt, timestamp: Math.floor(Date.now() / 1000), models: [MODEL] }],
  };
  const res = await globalThis.fetch(`${BASE}/api/v2/chat/completions?chat_id=${chatId}`, {
    method: 'POST',
    headers: { ...HEADERS, accept: 'text/event-stream', cookie: cookieString(jar) },
    body: JSON.stringify(payload),
  });

  let answer = '';
  const decoder = new TextDecoder();
  for await (const chunk of res.body) {
    const lines = decoder.decode(chunk, { stream: true }).split('\n');
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const raw = line.slice(6).trim();
      if (raw === '[DONE]') break;
      try {
        const parsed = JSON.parse(raw);
        const delta = parsed?.choices?.[0]?.delta;
        if (delta?.phase === 'answer' && delta.content) answer += delta.content;
      } catch {}
    }
  }
  return answer.trim();
}

export default {
  command: ['ia', 'qwen', 'ai'],
  category: 'utils',
  description: 'Realizar peticiones a Qwen.',
  run: async ({ msg, sock, args }) => {
    const text = args.join(' ').trim();
    if (!text) return msg.reply('《✧》 Escriba una petición.');

    const botId = sock.user.id.split(':')[0] + '@s.whatsapp.net';
    const username = global.db.data.users[msg.sender]?.name || 'usuario';
    const botname = global.db.data.settings[botId]?.botname || 'Bot';

    if (!global.qwenHistory[msg.chat]) global.qwenHistory[msg.chat] = [];
    const history = global.qwenHistory[msg.chat];
    history.push({ role: 'user', content: text });
    if (history.length > 15) history.shift();

    const fullPrompt = `${botname}, responde a ${username}: ${text}`;

    try {
      const sentMsg = await sock.sendMessage(msg.chat, { text: 'ꕥ Qwen está procesando...' });
      
      const jar = await ensureAuth();
      if (!global.qwenGlobalChatIds[msg.chat]) {
        global.qwenGlobalChatIds[msg.chat] = await createChat(jar);
      }

      const response = await streamCompletion(global.qwenGlobalChatIds[msg.chat], fullPrompt, jar);

      if (!response) throw new Error('Respuesta vacía');

      await sock.sendMessage(msg.chat, { text: response, edit: sentMsg.key });
      history.push({ role: 'assistant', content: response });
      await msg.react('✔️');
    } catch (e) {
      await msg.reply(`> Error: *${e.message}*`);
    }
  },
};
