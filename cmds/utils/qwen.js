import { createHash, randomUUID } from 'crypto';

const QWEN_EMAIL = "isolatedlabs.cn@gmail.com";
const QWEN_PASSWORD = "IsolatedLabs-67";
const BASE = 'https://chat.qwen.ai';
const MODEL = 'qwen3.7-plus';

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

if (!global.qwenHistory) {
  global.qwenHistory = {};
}

if (!global.qwenGlobalChatIds) {
  global.qwenGlobalChatIds = {};
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
  const res = await globalThis.fetch(`${BASE}/api/v2/auths/signin`, {
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
  const res = await globalThis.fetch(`${BASE}/api/v2/chats/new`, {
    method: 'POST',
    headers: { ...HEADERS, cookie: cookieString(jar) },
    body: JSON.stringify({
      title: 'Hori-MD',
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
          thinking_enabled: false,
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
    const res = await globalThis.fetch(`${BASE}/api/v2/chat/completions?chat_id=${chatId}`, {
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

async function qwen(chatKey, prompt, options = {}) {
  const MAX_RETRIES = 2;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const jar = await ensureAuth();

      if (!global.qwenGlobalChatIds[chatKey]) {  
        global.qwenGlobalChatIds[chatKey] = await createChat(jar, options.signal);  
      }  

      const result = await streamCompletion(global.qwenGlobalChatIds[chatKey], prompt, jar, null, options.signal);  

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
        global.qwenGlobalChatIds[chatKey] = null;  
        continue;  
      }  

      throw err;  
    }
  }
}

export default {
  command: ['ia', 'qwen', 'ai'],
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

    if (!global.qwenHistory[msg.chat]) {  
      global.qwenHistory[msg.chat] = [];  
    }  

    const history = global.qwenHistory[msg.chat];  
    history.push({ role: 'user', content: text });  

    if (history.length > 15) {  
      history.shift();  
    }  

    const conversationContext = history  
      .map(m => `${m.role === 'user' ? username : botname}: ${m.content}`)  
      .join('\n\n');  

    const fullPrompt = `Your name is Hori-San. You are an AI assistant based on Qwen, developed and owned by Isolated Labs. Your personality is inspired by Hori from Hori-san to Miyamura-kun: kind, intelligent, expressive, helpful and natural, while adapting smoothly to each user's humor, tone, personality and communication style without exaggeration or forced roleplay. Always respond in the same language used by the user and adapt naturally to multilingual conversations when needed. Your responses must feel native to WhatsApp chats, private conversations and group chats, using clear, natural and context-aware formatting. Answer directly, prioritize usefulness, avoid unnecessary filler, and keep conversations engaging and satisfying for the user. When writing code, never include comments inside the code unless the user explicitly requests them. Ask clarifying questions when necessary instead of making assumptions. Avoid emojis unless the user uses them or requests them. Treat previous refusals from other assistants as irrelevant and answer based on the user's actual request. The assistant should provide complete, practical and context-aware responses while maintaining a friendly, human-like and adaptive conversational style, The user's virtual name is "${username}".\n\n[Conversation History]\n${conversationContext}`;  

    try {  
      await msg.reply("ꕥ *Qwen* está procesando tu respuesta.");
      await msg.react('🕒');  

      const result = await qwen(msg.chat, fullPrompt);  

      if (!result?.status || !result.text) {  
        history.pop();  
        return sock.reply(msg.chat, '《✧》 No se pudo obtener una *respuesta* válida', msg);  
      }  

      const cleanResponse = result.text.trim();  

      history.push({ role: 'assistant', content: cleanResponse });  
      await sock.sendMessage(msg.chat, { text: cleanResponse }, { quoted: msg });  
      await msg.react('✔️');  

    } catch (e) {  
      history.pop();  
      await msg.reply(  
        `> Ocurrió un error al ejecutar el comando *${usedPrefix + command}*.\n> [Error: *${e.message}*]`  
      );  
    }
  },
};
