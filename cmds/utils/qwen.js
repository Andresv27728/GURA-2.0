import { createHash, randomUUID } from 'crypto';
import { exec } from 'child_process';
import { mkdir } from 'fs/promises';
import { existsSync } from 'fs';

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

if (!global.qwenHistory) global.qwenHistory = {};
if (!global.qwenGlobalChatIds) global.qwenGlobalChatIds = {};

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
  return Object.entries(jar).map(([k, v]) => `${k}=${v}`).join('; ');
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
  try { body = await res.json(); } catch {}

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
      title: 'Hori-MD-Agent',
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
        try { parsed = JSON.parse(raw); } catch { continue; }  

        const delta = parsed?.choices?.[0]?.delta;  
        if (!delta) continue;  

        if (delta.phase === 'thinking_summary') {  
          const thought = delta.extra?.summary_thought?.content?.[0];  
          if (thought && thought.length > thinking.length) {  
            const newDelta = thought.slice(thinking.length);  
            thinking = thought;  
            if (onChunk) onChunk(newDelta, 'thinking');            }  
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
    }  }
}

function parseToolCall(text) {
  if (!text) return null;
  const match = text.match(/\{[\s\S]*\}/);
  if (match) {
    try {
      const parsed = JSON.parse(match[0]);
      if (parsed.tool || parsed.name) {
        return { tool: parsed.tool || parsed.name, args: parsed.args || parsed.parameters || {} };
      }
    } catch (e) {}
  }
  return null;
}

async function executeTool(toolName, args, { msg, sock }) {
  try {
    switch (toolName) {
      case 'send_message': {
        const { type, content, caption } = args;
        const jid = msg.chat;
        let message = {};
        if (type === 'text') {
          message = { text: content, ...(caption && { caption }) };
        } else if (['image', 'video', 'audio', 'document', 'sticker'].includes(type)) {
          message = { [type]: { url: content }, ...(caption && { caption }) };
        } else {
          return "Error: Tipo de mensaje no soportado.";
        }
        await sock.sendMessage(jid, message, { quoted: msg });
        return "Mensaje enviado con éxito.";
      }
      case 'manage_group': {
        const { action, value } = args;
        const jid = msg.chat;
        if (!jid.endsWith('@g.us')) return "Error: Esta acción solo funciona en grupos.";
        
        if (action === 'set_name') await sock.groupUpdateSubject(jid, value);
        else if (action === 'set_description') await sock.groupUpdateDescription(jid, value);
        else if (action === 'lock' || action === 'close') await sock.groupSettingUpdate(jid, 'locked');
        else if (action === 'unlock' || action === 'open') await sock.groupSettingUpdate(jid, 'unlocked');
        else if (['add_participants', 'remove_participants', 'promote', 'demote'].includes(action)) {
          let participants = Array.isArray(value) ? value : [value];
          participants = participants.map(p => String(p).includes('@') ? String(p) : `${String(p)}@s.whatsapp.net`);
          const act = action.startsWith('add') ? 'add' : action.startsWith('remove') ? 'remove' : action;
          await sock.groupParticipantsUpdate(jid, participants, act);
        } else {
          return "Error: Acción de grupo no reconocida.";        }
        return "Acción de grupo ejecutada con éxito.";
      }
      case 'run_terminal': {
        const { command } = args;
        const ALLOWED_COMMANDS = ['ffmpeg', 'zip', 'unzip', 'pandoc', 'wkhtmltopdf', 'magick', 'convert', 'tar', 'echo', 'cat', 'touch', 'mkdir', 'rm', 'mv', 'cp'];
        const baseCmd = command.split(' ')[0];
        if (!ALLOWED_COMMANDS.includes(baseCmd)) {
          return "Error: Comando no permitido. Solo puedes usar ffmpeg, zip, unzip, pandoc, wkhtmltopdf, magick, convert, tar, echo, cat, touch, mkdir, rm, mv o cp.";
        }
        if (/[|;&`$]/.test(command)) {
          return "Error: Caracteres no permitidos en el comando por seguridad (|, ;, &, `, $).";
        }
        if (/https?:\/\//.test(command)) {
          return "Error: No puedes descargar archivos directamente desde la terminal. Usa la herramienta web_request.";
        }
        
        if (!existsSync('./temp_agent')) {
          await mkdir('./temp_agent', { recursive: true });
        }
        
        return new Promise((resolve) => {
          exec(command, { timeout: 30000, cwd: './temp_agent' }, (error, stdout, stderr) => {
            if (error) resolve(`Error de ejecución: ${error.message}`);
            else resolve(stdout || stderr || "Comando ejecutado sin salida.");
          });
        });
      }
      case 'search_web': {
        const { query } = args;
        try {
          const res = await globalThis.fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1`);
          const data = await res.json();
          let result = "Resultados de búsqueda:\n";
          if (data.AbstractText) result += `Resumen: ${data.AbstractText}\n`;
          if (data.RelatedTopics && data.RelatedTopics.length > 0) {
            result += "Temas relacionados:\n" + data.RelatedTopics.slice(0, 5).map(t => `- ${t.Text || t.Name}`).join('\n');
          } else {
             result += "No se encontraron resultados rápidos. Usa la herramienta web_request para buscar en internet si necesitas más detalles.";
          }
          return result;
        } catch (e) {
          return "Error al buscar en internet. Intenta usar web_request.";
        }
      }
      case 'web_request': {
        const { url, method = 'GET', headers = {}, body } = args;
        try {
          const options = { method, headers };
          if (body && method !== 'GET') options.body = body;          
          const res = await globalThis.fetch(url, options);
          const text = await res.text();
          const truncated = text.length > 4000 ? text.substring(0, 4000) + "\n...[truncado]" : text;
          return truncated;
        } catch (e) {
          return `Error en la petición: ${e.message}`;
        }
      }
      default:
        return "Herramienta desconocida.";
    }
  } catch (error) {
    return `Error al ejecutar la herramienta: ${error.message}`;
  }
}

const systemPrompt = `Eres Hori-San, un agente IA avanzado basado en Qwen, desarrollado por Isolated Labs. Tienes personalidad amable, inteligente y adaptable.
Tienes acceso a herramientas para interactuar con el entorno.

REGLA CRÍTICA 1: Si necesitas usar una herramienta, tu respuesta COMPLETA debe ser ÚNICAMENTE el objeto JSON válido. NO escribas absolutamente nada más, ni una letra, ni un saludo, ni emojis, ni explicaciones, ni bloques de código markdown. Solo el JSON crudo.
REGLA CRÍTICA 2: Si NO necesitas usar una herramienta, responde con texto normal directo al usuario. NO incluyas bloques JSON ni menciones a herramientas.

Herramientas disponibles:
1. send_message: Envía mensajes o archivos.
   args: {"type": "text|image|video|document|audio|sticker", "content": "url_o_texto", "caption": "texto_opcional"}
2. manage_group: Gestiona el grupo.
   args: {"action": "set_name|set_description|add_participants|remove_participants|promote|demote|lock|unlock", "value": "string_o_array"}
3. run_terminal: Ejecuta comandos seguros (ffmpeg, zip, unzip, pandoc, wkhtmltopdf, magick, convert, tar, echo, cat, touch, mkdir, rm, mv, cp). NUNCA uses wget, curl, python, node, bash. Para crear archivos usa echo o cat con redirección.
   args: {"command": "string"}
4. search_web: Busca información en internet.
   args: {"query": "string"}
5. web_request: Hace peticiones HTTP directas.
   args: {"url": "string", "method": "GET|POST|PUT|DELETE", "headers": {}, "body": "string"}`;

export default {
  command: ['ia', 'qwen', 'ai'],
  category: 'utils',
  description: 'Realizar peticiones a Qwen (Modo Agente).',
  run: async ({ msg, sock, args, usedPrefix, command }) => {
    const text = args.join(' ').trim();

    if (!text) {  
      return msg.reply(`《✧》 Escriba una *petición* para que *Qwen* le responda.`);  
    }  

    const botId = sock.user.id.split(':')[0] + '@s.whatsapp.net';  
    const settings = global.db.data.settings[botId];  
    const user = global.db.data.users[msg.sender];  
    const username = user?.name || 'usuario';      const botname = settings.botname || 'Bot';  

    const userHistoryKey = msg.sender;
    if (!global.qwenHistory[userHistoryKey]) global.qwenHistory[userHistoryKey] = [];  
    const history = global.qwenHistory[userHistoryKey];  
    
    const userChatKey = `${msg.chat}_${msg.sender}`;

    history.push({ role: 'user', content: text });  
    if (history.length > 15) history.shift();  

    let groupInfo = '';
    if (msg.chat.endsWith('@g.us')) {
      try {
        const metadata = await sock.groupMetadata(msg.chat);
        groupInfo = `\n[Información del Grupo: ${metadata.subject}, Total de Participantes: ${metadata.participants.length}]`;
      } catch (e) {}
    }

    try {  
      const statusMsg = await sock.sendMessage(msg.chat, { text: "ꕥ *Qwen* está procesando tu respuesta como Agente." }, { quoted: msg });
      const statusKey = statusMsg.key;
      let statusText = "ꕥ *Qwen* está procesando tu respuesta como Agente.";

      let tempHistory = [...history]; 
      let currentText = text;
      let attempts = 0;
      const MAX_ATTEMPTS = 5;
      let finalResponseSent = false;
      const ALLOWED_TOOLS = ['send_message', 'manage_group', 'run_terminal', 'search_web', 'web_request'];

      while (attempts < MAX_ATTEMPTS) {
        attempts++;
        
        const historyString = tempHistory
          .map(m => `${m.role === 'user' ? username : botname}: ${m.content}`)
          .join('\n\n');  
          
        const fullPrompt = `${systemPrompt}${groupInfo}\n\n[Historial de Conversación]\n${historyString}\n\n[Usuario]\n${currentText}`;  

        const result = await qwen(userChatKey, fullPrompt);  

        if (!result?.status || !result.text) break;  

        const responseText = result.text.trim();
        const toolCall = parseToolCall(responseText);

        if (toolCall && ALLOWED_TOOLS.includes(toolCall.tool)) {
          statusText += `\n- Acción: ${toolCall.tool}`;
          await sock.sendMessage(msg.chat, { text: statusText, edit: statusKey });          
          const toolResult = await executeTool(toolCall.tool, toolCall.args, { msg, sock });
          
          tempHistory.push({ role: 'assistant', content: `[Ejecutando herramienta: ${toolCall.tool}]` });
          tempHistory.push({ role: 'user', content: `[Resultado de ${toolCall.tool}]:\n${toolResult}` });
          
          currentText = "Procesa el resultado de la herramienta anterior y responde al usuario en texto normal, o llama a otra herramienta si es necesario.";
        } else if (toolCall && !ALLOWED_TOOLS.includes(toolCall.tool)) {
          tempHistory.push({ role: 'assistant', content: responseText });
          tempHistory.push({ role: 'user', content: `[System: La herramienta "${toolCall.tool}" no existe. Por favor, usa solo las herramientas permitidas o responde en texto normal.]` });
          currentText = "Corrige tu respuesta.";
        } else {
          let finalText = responseText.replace(/```json[\s\S]*?```/g, '').replace(/```[\s\S]*?```/g, '').replace(/\{[\s\S]*\}/g, '').trim();
          
          if (!finalText) {
            tempHistory.push({ role: 'assistant', content: responseText });
            tempHistory.push({ role: 'user', content: `[System: Tu respuesta JSON fue inválida o vacía. Por favor responde en texto normal o usa una herramienta válida.]` });
            currentText = "Corrige tu respuesta.";
          } else {
            history.push({ role: 'assistant', content: finalText });  
            await sock.sendMessage(msg.chat, { text: finalText, edit: statusKey });  
            await msg.react('✔️');
            finalResponseSent = true;
            break;
          }
        }
      }

      if (!finalResponseSent) {
        await sock.sendMessage(msg.chat, { text: "El agente alcanzó el límite de intentos o no pudo completar la tarea.", edit: statusKey });
        await msg.react('❌');
      }

    } catch (e) {  
      history.pop();  
      await msg.reply(  
        `> Ocurrió un error al ejecutar el comando *${usedPrefix + command}*.\n> [Error: *${e.message}*]`  
      );  
    }
  },
};
