import ws from 'ws';
import moment from 'moment';
import chalk from 'chalk';
import fs from "fs";
import path from 'path';
import gradient from 'gradient-string';
import GraphemeSplitter from 'grapheme-splitter';
import { getCachedMeta, setCachedMeta } from '#serialize';
import { initDB } from '#system/database';

const splitter = new GraphemeSplitter();
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const normalizePrefixes = (value) => {
  if (value == null || value === 1) return [];
  if (Array.isArray(value)) return [...new Set(value.filter(Boolean))];
  if (typeof value === 'string') return splitter.splitGraphemes(value).filter(Boolean);
  return [];
};
const resolvePrefixConfig = (msg, chat, settings) => {
  const hasChatOverride = msg.isGroup && chat?.prefix !== null && chat?.prefix !== undefined;
  const source = hasChatOverride ? chat.prefix : settings.prefix;
  const prefixes = normalizePrefixes(source);
  const allowBare = source === 1 || (!hasChatOverride && prefixes.length > 0);
  return { prefixes, allowBare };
};

export default async (sock, msg) => {
  if (msg.fromMe && !msg.key.participant && msg.isBot) return;  
  const sender = msg.sender;
  let body = msg.body || '';
  if (typeof global.rawLogsRAM !== 'string') {
  global.rawLogsRAM = '';

  const ansiRegex = /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g;

  const hookStream = (stream) => {
    const oldWrite = stream.write;

    stream.write = function (chunk, encoding, callback) {
      let str = typeof chunk === 'string'
        ? chunk
        : chunk.toString('utf8');

      str = str
        .replace(ansiRegex, '')
        .replace(/\r/g, '')
        .replace(/\n{3,}/g, '\n\n')
        .trim();

      if (str) {
        global.rawLogsRAM += str + '\n';
      }

      return oldWrite.apply(stream, arguments);
    };
  };

  hookStream(process.stdout);
  hookStream(process.stderr);
  }
  initDB(msg, sock);
  
  const from = msg.key.remoteJid;
  const botJid = sock.user.id.split(':')[0] + '@s.whatsapp.net';
  const chat = global.db.data.chats[msg.chat];
  const settings = global.db.data.settings[botJid];
  const user = global.db.data.users[sender];
  const users = global.db.data.chats[msg.chat]?.users?.[sender];
  const pushname = msg.pushName || 'Sin nombre';
  const isOwner = global.owner.map(num => num + '@s.whatsapp.net').includes(sender);
  const isROwner = [botJid, ...(settings.owner ? [settings.owner] : []), ...global.owner.map(num => num + '@s.whatsapp.net')].includes(sender);

  let groupMetadata = null;
  let groupName = '';
  if (msg.isGroup) {
    groupMetadata = getCachedMeta(msg.chat);
    if (!groupMetadata) {
      groupMetadata = await sock.groupMetadata(msg.chat).catch(() => null);
      if (groupMetadata) setCachedMeta(msg.chat, groupMetadata);
    }
    groupName = groupMetadata?.subject || '';
  }
  const participants = groupMetadata?.participants || [];
  const adminSet = new Set(participants.filter(p => p.admin === 'admin' || p.admin === 'superadmin').flatMap(p => [p.id?.split('@')[0], p.lid?.split('@')[0], p.phoneNumber?.split('@')[0]].filter(Boolean)));
  const senderBase = sender.split('@')[0];
  const botBase = botJid.split('@')[0];
  const isBotAdmins = msg.isGroup ? adminSet.has(botBase) : false;
  const isAdmins = msg.isGroup ? adminSet.has(senderBase) : false;

  Promise.allSettled((global.cmdsExecute ?? []).filter(p => p.type === 'all').map(p => p.fn({ msg, sock, groupMetadata, participants, isAdmins, isBotAdmins, isOwner, __dirname: p.dirname }).catch(e => console.error(chalk.gray(`[ ✿ ] Error all-plugin ${p.key}: ${e.message}`)))));

  const today = new Date().toLocaleDateString('es-CO', { timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit' }).split('/').reverse().join('-');
  if (!users.stats) users.stats = {};
  if (!users.stats[today]) users.stats[today] = { msgs: 0, cmds: 0 };
  users.stats[today].msgs++;
  global.db.data.chats[from].users[sender].stats = users.stats;

  const { prefixes: activePrefixes, allowBare } = resolvePrefixConfig(msg, chat, settings);
  const prefixMatchers = [...activePrefixes].sort((a, b) => b.length - a.length).map(p => new RegExp('^' + escapeRegex(p), 'i'));
  if (allowBare) prefixMatchers.push(/^/i);
  const strRegex = (str) => str.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&');
  let customCmd = null;
  let pluginPrefix = prefixMatchers;
  for (const [cmdName, data] of global.comandos) {
    if (!data.customPrefix) continue;
    const cp = data.customPrefix;
    const ms = cp instanceof RegExp ? [[cp.exec(msg.text), cp]] : Array.isArray(cp) ? cp.map(p => { let r = p instanceof RegExp ? p : new RegExp(strRegex(p)); return [r.exec(msg.text), r]; }) : typeof cp === 'string' ? [[new RegExp(strRegex(cp)).exec(msg.text), new RegExp(strRegex(cp))]] : [[null, null]];
    if (ms.find(p => p[0])) { customCmd = cmdName; pluginPrefix = cp; break; }
  }
  let matchs = pluginPrefix instanceof RegExp ? [[pluginPrefix.exec(msg.text), pluginPrefix]] : Array.isArray(pluginPrefix) ? pluginPrefix.map(p => {
    let regex = p instanceof RegExp ? p : new RegExp(strRegex(p));
    return [regex.exec(msg.text), regex];
  }) : typeof pluginPrefix === 'string' ? [[new RegExp(strRegex(pluginPrefix)).exec(msg.text), new RegExp(strRegex(pluginPrefix))]] : [[null, null]];
  let match = matchs.find(p => p[0]) || null;

  for (const p of (global.cmdsExecute ?? [])) {
    if (p.type !== 'before') continue;
    try {
      if (await p.fn({ msg, sock, match, groupMetadata, participants, isAdmins, isBotAdmins, isOwner, __dirname: p.dirname })) continue;
    } catch (e) {
      console.error(chalk.gray(`[ ✿ ] Error before-plugin ${p.key}: ${e.message}`));
    }
  }

  if (!match) return;
  if (msg.isCommands) return;
  let usedPrefix = (match[0] || [])[0] || '';
  let args = msg.text.slice(usedPrefix.length).trim().split(" ");
  let command = customCmd ?? (args.shift() || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (!usedPrefix && allowBare && !customCmd && !global.comandos.has(command)) return;
  let text = args.join(' ');
  if (!command) return;

  const chatData = global.db.data.chats[from];
  const consolePrimary = chatData.primaryBot;
  if (!consolePrimary || consolePrimary === botJid) {
    const gLugar = msg.isGroup ? '│' + chalk.bold.green(' Grupo') + ': ' + gradient('green', 'lime')(groupName) : '│' + chalk.bold.green(' Privado') + ': ' + gradient('pink', 'magenta')('Chat Privado');
    const gId = '│' + chalk.bold.magenta(' ID') + ': ' + gradient('violet', 'midnightblue')(msg.isGroup ? from : 'Chat Privado');
    console.log(chalk.bold.blue(`╭────────────────────────────···\n│ ${chalk.cyan('Bot')}: ${gradient('lime', 'green')(botJid)}\n│ ${chalk.bold.yellow('Fecha')}: ${gradient('orange', 'yellow')(moment().format('DD/MM/YY HH:mm:ss'))}\n│ ${chalk.bold.blueBright('Usuario')}: ${gradient('cyan', 'blue')(pushname)}\n│ ${chalk.bold.magentaBright('Remitente')}: ${gradient('deepskyblue', 'darkorchid')(sender)}\n${gLugar}\n${gId}\n│ ${chalk.bold.cyanBright('Comando usado')}: ${chalk.gray(command ? command : 'No Command')}\n╰────────────────────────────···\n`));
  }

  const hasPrefix = allowBare ? 1 : activePrefixes.some(p => msg.text?.startsWith(p));
  const botprimaryId = chat?.primaryBot;
  if (botprimaryId && botprimaryId !== botJid) {
    if (hasPrefix) {
      const groupJids = participants.map(p => p.id);
      function getAllSessionBots() {
        const bots = [];
        for (const dir of ['./Sessions/Subs']) {
          try {
            for (const sub of fs.readdirSync(path.resolve(dir))) {
              if (fs.existsSync(path.resolve(dir, sub, 'creds.json')))
                bots.push(sub + '@s.whatsapp.net');
            }
          } catch {}
        }
        try {
          if (fs.existsSync(path.resolve('./Sessions/Owner/creds.json'))) {
            const ownerId = global.sock?.user?.id?.split(':')[0] + '@s.whatsapp.net';
            if (ownerId) bots.push(ownerId);
          }
        } catch {}
        return bots;
      }
      const sessionBots = getAllSessionBots();
      const primaryInGroup = groupJids.includes(botprimaryId);
      const isPrimarySelf = botprimaryId === botJid;
      const primaryInSessions = sessionBots.includes(botprimaryId);
      if (!primaryInSessions || !primaryInGroup) return;
      if ((primaryInSessions && primaryInGroup) || isPrimarySelf) return;
    }
  }

  if (!isROwner && settings.self) return;
  if (msg.chat && !msg.chat.endsWith('g.us')) {
    const cmds = ['allmenu', 'help', 'menu', 'infobot', 'botinfo', 'invite', 'invitar', 'ping', 'speed', 'p', 'status', 'estado', 'report', 'reporte', 'sug', 'suggest', 'token', 'join', 'unir', 'logout', 'reload', 'self', 'setbanner', 'setbotbanner', 'setchannel', 'setbotchannel', 'setbotcurrency', 'setcurrency', 'seticon', 'setboticon', 'setlink', 'setbotlink', 'setbotname', 'setname', 'setbotowner', 'setowner', 'setimage', 'setpfp', 'setprefix', 'setbotprefix', 'delprefix', 'setstatus', 'setusername', 'code', 'qr', 'codepremium', 'qrpremium', 'codemod', 'qrmod'];
    if (!isOwner && !cmds.includes(command)) return;
  }
  if (chat?.isBanned && !(command === 'bot' && text === 'on') && !isOwner) {
    await msg.reply(`ꕥ El bot *${settings.botname || 'GAWR GURA'}* está desactivado en este grupo.\n\n> ✎ Un *administrador* puede activarlo con el comando:\n> » *${usedPrefix}bot on*`);
    return;
  }

  if (!users.stats) users.stats = {};
  if (!users.stats[today]) users.stats[today] = { msgs: 0, cmds: 0 };
  if (chat.adminonly && !isAdmins) return;
  const cmdData = global.comandos.get(command);
  if (!cmdData) {
    if (settings.prefix === 1) return;
    await sock.readMessages([msg.key]);
    return msg.reply(`ꕤ El comando *${command}* no existe.\n✎ Usa *${usedPrefix}help* para ver la lista de comandos disponibles.`);
  }
  if (cmdData.isOwner && !isOwner) {
    if (settings.prefix === 1) return;
    return msg.reply(`ꕤ El comando *${command}* no existe.\n✎ Usa *${usedPrefix}help* para ver la lista de comandos disponibles.`);
  }
  if (cmdData.isAdmin && !isAdmins) return sock.reply(msg.chat, '《✧》 Este comando solo puede ser ejecutado por los Administradores del Grupo.', msg);
  if (cmdData.botAdmin && !isBotAdmins) return sock.reply(msg.chat, '《✧》 Este comando solo puede ser ejecutado si el Socket es Administrador del Grupo.', msg);
  try {
    await sock.readMessages([msg.key]);
    user.usedcommands = (user.usedcommands || 0) + 1;
    user.exp = (user.exp || 0) + Math.floor(Math.random() * 100);
    user.name = msg.pushName;
    global.db.data.users[sender].usedcommands = user.usedcommands;
    global.db.data.users[sender].exp = user.exp;
    global.db.data.users[sender].name = user.name;
    users.usedTime = new Date();
    users.lastCmd = Date.now();
    users.stats[today].cmds++;
    global.db.data.chats[msg.chat].users[sender].usedTime = users.usedTime;
    global.db.data.chats[msg.chat].users[sender].lastCmd = users.lastCmd;
    global.db.data.chats[msg.chat].users[sender].stats = users.stats;
    settings.commandsejecut = (settings.commandsejecut || 0) + 1;
    global.db.data.settings[botJid].commandsejecut = settings.commandsejecut;
    await cmdData.run({ msg, sock, args, usedPrefix, command, text, groupMetadata, participants, isAdmins, isBotAdmins, isOwner, __dirname: global.plugins[cmdData.pluginKey]?.dirname });
  } catch (error) {
    await sock.sendMessage(msg.chat, { text: `《✧》 Error al ejecutar el comando ${command}.\n\n${error}` }, { quoted: msg });
  }
};
