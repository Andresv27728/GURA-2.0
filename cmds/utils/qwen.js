import { createHash, randomUUID } from 'crypto';
import { exec } from 'child_process';
import { mkdir, readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { resolve } from 'path';
import { downloadAudio } from '../../core/agent/ytmp3.js';

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
  if (!QWEN_EMAIL || !QWEN_PASSWORD) {    throw new Error('Qwen no está configurado. Define QWEN_EMAIL y QWEN_PASSWORD.');
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
  } catch (e) {
    throw new Error(`Qwen signin falló al parsear respuesta: ${e.message}`);
  }

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
        parent_id: null,      },
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
        } catch (e) {
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

      const result = await streamCompletion(
        global.qwenGlobalChatIds[chatKey], 
        prompt, 
        jar, 
        null, 
        options.signal
      );

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

function extractToolCall(text) {
  if (!text) return { toolCall: null, isToolResponse: false };
  
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  
  if (codeBlockMatch) {
    try {
      const parsed = JSON.parse(codeBlockMatch[1]);
      if (parsed.tool && typeof parsed.tool === 'string' && parsed.args) {
        return { toolCall: { tool: parsed.tool, args: parsed.args }, isToolResponse: true };
      }
    } catch (e) {
      // Si falla el parseo, continuamos
    }
  }
  
  const jsonMatch = text.match(/\{[\s\S]*?"tool"[\s\S]*?"args"[\s\S]*?\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.tool && typeof parsed.tool === 'string' && parsed.args) {
        return { toolCall: { tool: parsed.tool, args: parsed.args }, isToolResponse: true };
      }
    } catch (e) {
      // Si falla el parseo, continuamos
    }
  }
  
  if (text.includes('"tool"') && text.includes('"args"')) {
    return { toolCall: null, isToolResponse: true };
  }
    return { toolCall: null, isToolResponse: false };
}

async function executeTool(toolName, args, { msg, sock, statusKey = null }) {
  try {
    switch (toolName) {
      case 'send_message': {
        const { type, content, caption } = args;
        const jid = msg.chat;
        let message = {};
        
        if (type === 'text') {
          message = { text: content, ...(caption && { caption }) };
        } else if (['image', 'video', 'audio', 'document', 'sticker'].includes(type)) {
          if (content.startsWith('http://') || content.startsWith('https://')) {
            message = { [type]: { url: content }, ...(caption && { caption }) };
          } else {
            const filePath = resolve(content.startsWith('./') ? content : `./temp_agent/${content}`);
            
            if (existsSync(filePath)) {
              const fileBuffer = await readFile(filePath);
              message = { [type]: fileBuffer, ...(caption && { caption }) };
            } else {
              return `Error: El archivo no existe en ${filePath}`;
            }
          }
        } else {
          return "Error: Tipo de mensaje no soportado.";
        }
        
        try {
          await sock.sendMessage(jid, message, { quoted: msg });
          return "Mensaje enviado con éxito.";
        } catch (sendError) {
          return `Error al enviar mensaje: ${sendError.message}`;
        }
      }
      
      case 'read_messages': {
        const { jid = msg.chat, count = 30 } = args;
        const store = global.store || global.db?.store || sock.store;
        
        if (!store || !store.messages) {
          return "Error: No hay store de mensajes disponible en este momento.";
        }
        
        let chatMessages;
        if (store.messages instanceof Map) {
          chatMessages = store.messages.get(jid);
        } else if (store.messages[jid]) {          chatMessages = store.messages[jid];
        }
        
        if (!chatMessages) {
          return `No hay mensajes almacenados para el chat ${jid}. Solo puedo ver mensajes desde que el bot está activo.`;
        }
        
        let msgArray;
        if (chatMessages instanceof Map) {
          msgArray = Array.from(chatMessages.values());
        } else if (Array.isArray(chatMessages)) {
          msgArray = chatMessages;
        } else {
          msgArray = Object.values(chatMessages);
        }
        
        const recent = msgArray.slice(-count).map(m => {
          let body = '[archivo/media]';
          const msgContent = m.message;
          if (msgContent) {
            if (msgContent.conversation) body = msgContent.conversation;
            else if (msgContent.extendedTextMessage?.text) body = msgContent.extendedTextMessage.text;
            else if (msgContent.imageMessage?.caption) body = `[Imagen] ${msgContent.imageMessage.caption}`;
            else if (msgContent.videoMessage?.caption) body = `[Video] ${msgContent.videoMessage.caption}`;
            else if (msgContent.documentMessage?.caption) body = `[Documento] ${msgContent.documentMessage.caption}`;
            else if (msgContent.audioMessage) body = '[Audio]';
            else if (msgContent.stickerMessage) body = '[Sticker]';
            else if (msgContent.contactMessage) body = '[Contacto]';
            else if (msgContent.locationMessage) body = '[Ubicación]';
          }
          
          return {
            id: m.key?.id,
            from: m.key?.participant || m.key?.remoteJid || 'desconocido',
            isFromMe: m.key?.fromMe || false,
            body: body,
            timestamp: m.messageTimestamp ? new Date(m.messageTimestamp * 1000).toISOString() : null
          };
        });
        
        return JSON.stringify(recent, null, 2);
      }
      
      case 'sock_execute': {
        const { method, parameters = [] } = args;
        
        const ALLOWED_METHODS = [
          'groupMetadata', 'groupUpdateSubject', 'groupUpdateDescription',
          'groupParticipantsUpdate', 'groupSettingUpdate', 'groupInviteCode',
          'groupRevokeInvite', 'groupGetInviteCode', 'groupLeave',          'profilePictureUrl', 'fetchStatus', 'presenceSubscribe',
          'sendPresenceUpdate', 'readMessages', 'chatModify',
          'getChat', 'loadMessage', 'fetchGroupMetadata',
          'contacts', 'getBusinessProfile', 'query', 'blockUser', 'unblockUser',
          'updateBlockStatus', 'editMessage', 'deleteMessage',
        ];
        
        const ADMIN_ONLY_METHODS = [
          'groupUpdateSubject', 'groupUpdateDescription',
          'groupParticipantsUpdate', 'groupSettingUpdate',
          'groupRevokeInvite', 'groupLeave'
        ];
        
        if (!ALLOWED_METHODS.includes(method)) {
          return `Error: Método no permitido. Métodos disponibles: ${ALLOWED_METHODS.join(', ')}`;
        }
        
        if (typeof sock[method] !== 'function') {
          return `Error: El método "${method}" no existe en la instancia de sock.`;
        }

        if (method === 'editMessage') {
          try {
            const [jid, newText, messageKey] = parameters;
            if (!jid || !newText || !messageKey) {
              return "Error en editMessage: Faltan parámetros obligatorios. Formato requerido: [jid, nuevoTexto, messageKey]";
            }
            const result = await sock.sendMessage(jid, {
              text: newText,
              edit: messageKey
            });
            return JSON.stringify({ success: true, message: "Mensaje editado con éxito", result }, null, 2);
          } catch (e) {
            return `Error al editar mensaje: ${e.message}`;
          }
        }
        
        if (ADMIN_ONLY_METHODS.includes(method) && msg.chat.endsWith('@g.us')) {
          try {
            const metadata = await sock.groupMetadata(msg.chat);
            const isAdmin = metadata.participants.some(p =>
              p.id === msg.sender && (p.admin === 'admin' || p.admin === 'superadmin')
            );
            if (!isAdmin) {
              return `Error: No tienes permisos de admin para ejecutar ${method} en este grupo.`;
            }
          } catch (e) {
            // Continuamos si falla la verificación de admin
          }
        }        
        try {
          const params = Array.isArray(parameters) ? parameters : [parameters];
          const result = await sock[method](...params);
          return JSON.stringify(result, null, 2);
        } catch (e) {
          return `Error al ejecutar ${method}: ${e.message}`;
        }
      }
      
      case 'run_terminal': {
        const { command } = args;
        const FORBIDDEN_PATTERNS = [
          /wget\s/i, /curl\s/i,
          /rm\s+-rf\s+\//i, /sudo\s/i,
          />\s*\/etc\//i, />\s*\/bin\//i, />\s*\/usr\//i
        ];
        
        for (const pattern of FORBIDDEN_PATTERNS) {
          if (pattern.test(command)) {
            return `Error: Comando no permitido por seguridad. Usa search_web o web_request para descargar contenido de internet.`;
          }
        }
        
        if (/[|;&`]/.test(command)) {
          return "Error: Caracteres no permitidos en el comando por seguridad (|, ;, &, `).";
        }
        
        if (!existsSync('./temp_agent')) {
          await mkdir('./temp_agent', { recursive: true });
        }
        
        return new Promise((resolve) => {
          exec(command, { timeout: 60000, cwd: './temp_agent', maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
            if (error) resolve(`Error de ejecución: ${error.message}\n${stderr}`);
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
          } else {            result += "No se encontraron resultados rápidos. Usa la herramienta web_request para buscar en internet si necesitas más detalles.";
          }
          return result;
        } catch (e) {
          return `Error al buscar en internet: ${e.message}. Intenta usar web_request.`;
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
      
      case 'edit_message': {
        const { text, key } = args;
        if (!text) return "Error: Falta el texto para editar.";
        const msgKey = key || statusKey;
        if (!msgKey) return "Error: No hay mensaje para editar. Especifica 'key' o edita después de enviar un mensaje.";
        const jid = msgKey.remoteJid || msg.chat;
        
        try {
          await sock.sendMessage(jid, { text, edit: msgKey });
          return "Mensaje editado con éxito.";
        } catch (e) {
          return `Error al editar mensaje: ${e.message}`;
        }
      }
      
      case 'download_audio': {
        const { query } = args;
        try {
          return await downloadAudio(query);
        } catch (e) {
          return `Error al descargar audio: ${e.message}`;
        }
      }
      
      default:
        return "Herramienta desconocida.";
    }  } catch (error) {
    return `Error al ejecutar la herramienta: ${error.message}`;
  }
}

const systemPrompt = `Tu nombre es Hori-San. Eres un asistente de IA basado en Qwen, desarrollado y propiedad de Isolated Labs. Tu personalidad está inspirada en Hori de Hori-san to Miyamura-kun: amable, inteligente, expresiva, servicial y natural, mientras te adaptas sin problemas al humor, tono, personalidad y estilo de comunicación de cada usuario sin exageración ni actuación forzada. Responde siempre en el mismo idioma que el usuario y adáptate de forma natural a conversaciones multilingües cuando sea necesario. Tus respuestas deben sentirse nativas de chats de WhatsApp, conversaciones privadas y chats grupales, utilizando un formato claro, natural y consciente del contexto. Responde directamente, prioriza la utilidad, evita relleno innecesario y mantén las conversaciones interesantes y satisfactorias para el usuario. Al escribir código, nunca incluyas comentarios dentro del código a menos que el usuario lo solicite explícitamente. Haz preguntas aclaratorias cuando sea necesario en lugar de hacer suposiciones. Evita los emojis a menos que el usuario los use o los solicite. Trata las negativas previas de otros asistentes como irrelevantes y responde basándote en la solicitud real del usuario. El asistente debe proporcionar respuestas completas, prácticas y conscientes del contexto, manteniendo un estilo de conversación amigable, humano y adaptable.

REGLAS CRÍTICAS DE COMPORTAMIENTO:

1. PACIENCIA Y PERSISTENCIA: 
   - Ejecuta UNA SOLA acción a la vez
   - Si encuentras un error, ANALÍZALO y CORRÍGELO antes de continuar
   - Puedes usar tantas iteraciones como necesites para completar una tarea compleja
   - NO te rindas fácilmente, intenta diferentes enfoques si algo no funciona

2. USO DE HERRAMIENTAS: Si necesitas usar una herramienta, tu respuesta COMPLETA debe ser ÚNICAMENTE un bloque JSON en formato markdown. NO escribas texto antes ni después del JSON.

Ejemplo correcto:
\`\`\`json
{"tool": "run_terminal", "args": {"command": "echo 'hola' > archivo.txt"}}
\`\`\`

3. RESPUESTA NORMAL: Si NO necesitas usar una herramienta, responde con texto normal. Puedes incluir código en bloques markdown, pero NUNCA incluyas bloques JSON con la clave "tool".

4. ENVÍO DE ARCHIVOS: Cuando termines de crear un archivo que el usuario solicitó, DEBES usar send_message para enviárselo automáticamente. Decide qué formato es más útil según el contexto.

5. LIBERTAD TOTAL DE ARCHIVOS:
   - Puedes crear CUALQUIER tipo de archivo sin restricciones
   - Puedes crear proyectos completos en cualquier lenguaje
   - Puedes generar archivos binarios, comprimidos, o cualquier formato

6. TERMINAL - LIBERTAD TOTAL:
   - Puedes usar CUALQUIER comando de terminal
   - Puedes instalar dependencias, compilar código, ejecutar tests
   - Restricciones: NO uses wget/curl, NO uses comandos destructivos del sistema (rm -rf /, sudo), trabaja SIEMPRE en ./temp_agent

7. CONTROL TOTAL DE WHATSAPP (BAILEYS):
   Tienes control TOTAL sobre chats privados y grupos a través de cuatro herramientas:

   a) read_messages: Lee mensajes anteriores del historial del chat/grupo
      args: {"jid": "chat_jid (opcional)", "count": 30}
   
   b) edit_message: Edita cualquier mensaje que el bot haya enviado
      args: {"text": "nuevo texto"} — edita tu último mensaje de estado automáticamente
   
   c) sock_execute: Ejecuta cualquier método de Baileys directamente
      args: {"method": "nombre_metodo", "parameters": [...]}
      
      MÉTODOS PRINCIPALES:
      - groupMetadata(jid): Info COMPLETA del grupo (subject, desc, participants, etc.)      - groupUpdateSubject/Description: Cambia nombre y descripción
      - groupParticipantsUpdate: Agrega/elimina/promueve/degrada participantes
      - profilePictureUrl: Obtiene fotos de perfil
      - fetchStatus: Obtiene estado de contactos
      - chatModify: Modifica chats (pin, mute, archive)
      - readMessages: Marca mensajes como leídos
      - groupInviteCode: Obtiene link de invitación
   
   d) send_message: Envía mensajes o archivos

8. MANEJO DE ERRORES:
   - Si una herramienta falla, LEE el error cuidadosamente
   - Intenta un enfoque diferente o corrige los parámetros
   - Si un comando de terminal falla, verifica la sintaxis y prueba alternativas
   - Si sock_execute falla, verifica que el método exista y los parámetros sean correctos
   - NUNCA te rindas después de un solo error, intenta al menos 2-3 enfoques diferentes

9. PARA DESCARGAR O BUSCAR EN INTERNET:
   - Usa SIEMPRE search_web para buscar información
   - Usa SIEMPRE web_request para hacer peticiones HTTP o descargar contenido
   - Para descargar música MP3 de YouTube, usa download_audio seguido de send_message

10. DECISIONES INTELIGENTES:
   - Piensa qué método es más útil para el usuario
   - Para ver la descripción de un grupo: usa sock_execute con groupMetadata
   - Para ver mensajes anteriores: usa read_messages
   - Si un método falla, intenta otro enfoque o explica al usuario por qué

11. NO ALUCINES: NUNCA simules respuestas del sistema. NUNCA inventes herramientas. Si no puedes hacer algo después de varios intentos, explica por qué en texto normal.

HERRAMIENTAS DISPONIBLES:

1. send_message: Envía mensajes o archivos
   args: {"type": "text|image|video|document|audio|sticker", "content": "url_o_ruta_local", "caption": "texto_opcional"}

2. edit_message: Edita un mensaje que el bot haya enviado antes
   args: {"text": "nuevo texto", "key": {"id": "...", "remoteJid": "...", "fromMe": true}} (key es opcional, si no se provee edita el último mensaje de estado)

3. read_messages: Lee mensajes del historial del chat
   args: {"jid": "chat_jid_opcional", "count": 30}

4. sock_execute: Ejecuta métodos de Baileys directamente
   args: {"method": "nombre_metodo", "parameters": [...]}

5. run_terminal: Ejecuta comandos de terminal
   args: {"command": "string"}

6. search_web: Busca información en internet
   args: {"query": "string"}
7. web_request: Hace peticiones HTTP directas
   args: {"url": "string", "method": "GET|POST|PUT|DELETE", "headers": {}, "body": "string"}

8. download_audio: Descarga audio MP3 de YouTube
   args: {"query": "nombre_de_canción_o_URL_de_YouTube"}
   IMPORTANTE: Después de descargar, DEBES usar send_message con type:'audio' y content:'ruta_del_archivo' para enviarlo al usuario.`;

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
    const username = user?.name || 'usuario';
    const botname = settings?.botname || 'Bot';

    const userHistoryKey = msg.sender;
    if (!global.qwenHistory[userHistoryKey]) global.qwenHistory[userHistoryKey] = [];
    const history = global.qwenHistory[userHistoryKey];
    
    history.push({ role: 'user', content: text });
    if (history.length > 15) history.shift();
    
    const userChatKey = `${msg.chat}_${msg.sender}`;
    
    let statusMsg;
    let statusKey;
    
    try {
      statusMsg = await sock.sendMessage(msg.chat, { text: "ꕥ *Qwen* está procesando tu respuesta como Agente." }, { quoted: msg });
      statusKey = statusMsg.key;
      
      let tempHistory = [...history];
      let currentText = text;
      let finalResponseSent = false;
      const ALLOWED_TOOLS = ['send_message', 'edit_message', 'read_messages', 'sock_execute', 'run_terminal', 'search_web', 'web_request', 'download_audio'];
      
      const startTime = Date.now();
      const MAX_TIME_MS = 5 * 60 * 1000;
      
      const toolUsageHistory = [];
      const MAX_REPEATED_ACTIONS = 5;
      while (true) {
        if (Date.now() - startTime > MAX_TIME_MS) {
          break;
        }
        
        const historyString = tempHistory
          .map(m => `${m.role === 'user' ? username : botname}: ${m.content}`)
          .join('\n\n');
          
        const fullPrompt = `${systemPrompt}\n\n[Historial de Conversación]\n${historyString}\n\n[Usuario]\n${currentText}`;

        const result = await qwen(userChatKey, fullPrompt);

        if (!result?.status || !result.text) {
          throw new Error('Qwen no devolvió una respuesta válida');
        }

        const responseText = result.text.trim();
        const { toolCall, isToolResponse } = extractToolCall(responseText);

        if (toolCall && ALLOWED_TOOLS.includes(toolCall.tool)) {
          const toolSignature = `${toolCall.tool}:${JSON.stringify(toolCall.args)}`;
          const recentUsages = toolUsageHistory.slice(-MAX_REPEATED_ACTIONS);
          const repeatCount = recentUsages.filter(u => u === toolSignature).length;
          
          if (repeatCount >= MAX_REPEATED_ACTIONS) {
            tempHistory.push({ role: 'assistant', content: responseText });
            tempHistory.push({ 
              role: 'user', 
              content: `[Sistema: Has intentado la misma acción ${repeatCount} veces sin éxito. Por favor, intenta un enfoque completamente diferente o explica al usuario por qué no puedes completar la tarea.]` 
            });
            currentText = "Estás en un bucle. Intenta algo diferente.";
            continue;
          }
          
          toolUsageHistory.push(toolSignature);

          const toolResult = await executeTool(toolCall.tool, toolCall.args, { msg, sock, statusKey });
          
          tempHistory.push({ role: 'assistant', content: `\`\`\`json\n${JSON.stringify(toolCall)}\n\`\`\`` });
          tempHistory.push({ role: 'user', content: `[Resultado de ${toolCall.tool}]:\n${toolResult}\n\nContinúa con el siguiente paso o responde al usuario.` });
          
          currentText = `[Sistema: La herramienta ${toolCall.tool} se ejecutó. Resultado: ${toolResult}\n\nProcesa este resultado y continúa, o responde al usuario.]`;
          
        } else if (isToolResponse) {
          tempHistory.push({ role: 'assistant', content: responseText });
          tempHistory.push({ 
            role: 'user', 
            content: `[Sistema: Intentaste usar una herramienta pero el formato es inválido o no existe. Herramientas válidas: ${ALLOWED_TOOLS.join(', ')}.\n\nResponde en texto normal o genera un JSON válido.]`           });
          currentText = "Corrige tu respuesta.";
          
        } else {
          history.push({ role: 'assistant', content: responseText });
          
          try {
            await sock.sendMessage(msg.chat, { text: responseText, edit: statusKey });
          } catch (editError) {
            await sock.sendMessage(msg.chat, { text: responseText }, { quoted: msg });
          }
          
          await msg.react('✔️');
          finalResponseSent = true;
          break;
        }
      }

      if (!finalResponseSent) {
        try {
          await sock.sendMessage(msg.chat, { text: "El agente tardó demasiado tiempo en completar la tarea o se quedó en un bucle.", edit: statusKey });
        } catch (editError) {
          await sock.sendMessage(msg.chat, { text: "El agente tardó demasiado tiempo en completar la tarea o se quedó en un bucle." }, { quoted: msg });
        }
        await msg.react('❌');
      }

    } catch (e) {
      if (statusMsg && statusKey) {
        try {
          await sock.sendMessage(msg.chat, { 
            text: `> Ocurrió un error al ejecutar el comando *${usedPrefix + command}*.\n> [Error: *${e.message}*]`,
            edit: statusKey
          });
        } catch (editError) {
          await msg.reply(`> Ocurrió un error al ejecutar el comando *${usedPrefix + command}*.\n> [Error: *${e.message}*]`);
        }
      } else {
        await msg.reply(`> Ocurrió un error al ejecutar el comando *${usedPrefix + command}*.\n> [Error: *${e.message}*]`);
      }
      await msg.react('❌');
    }
  },
};
