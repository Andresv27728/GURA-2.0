import GraphemeSplitter from 'grapheme-splitter';

const splitter = new GraphemeSplitter();
const escapeReplyPrefix = (value) => value ? `\`${value}\`` : '`sin prefijo`';

export default {
  command: ['setprefix', 'setbotprefix'],
  category: 'socket',
  description: 'Configura el prefijo del bot por grupo o el modo global.',
  run: async ({ msg, sock, args, usedPrefix, command, isAdmins, isOwner }) => {
    const idBot = sock.user.id.split(':')[0] + '@s.whatsapp.net';
    const config = global.db.data.settings[idBot] || {};
    const canUse = isOwner || (msg.isGroup && isAdmins);
    if (!canUse) return sock.reply(msg.chat, global.mess.socket, msg);

    const value = args.join(' ').trim();
    if (!value) {
      return msg.reply(
        `❀ Uso de prefijos:\n\n` +
        `> *• Global* » *${usedPrefix + command} global*\n` +
        `> *• Grupo* » *${usedPrefix + command} !*\n` +
        `> *• Volver a sin prefijo en grupo* » *${usedPrefix}delprefix*\n\n` +
        `ꕥ Prefijo global actual: ${escapeReplyPrefix(config.prefix === 1 ? '' : (Array.isArray(config.prefix) ? config.prefix.join(' ') : config.prefix))}`
      );
    }

    if (value.toLowerCase() === 'global') {
      global.db.data.settings[idBot].prefix = ['.', '#', '/', '!'];
      return msg.reply('❀ El bot ahora responde sin prefijo y tambien con los prefijos *./#/*! de forma global.');
    }

    if (value.toLowerCase() === 'default' || value.toLowerCase() === 'reset') {
      global.db.data.settings[idBot].prefix = 1;
      return msg.reply('❀ El bot global volvió a modo sin prefijo.');
    }

    if (!msg.isGroup) {
      return msg.reply(`✐ El prefijo por grupo solo puede configurarse dentro de un grupo.\n> Para modo global usa *${usedPrefix + command} global*`);
    }

    const symbols = splitter.splitGraphemes(value).filter(g => g && !/^[a-zA-Z0-9\s]+$/.test(g));
    const prefix = symbols[0];
    if (!prefix || /^\s+$/.test(prefix)) return msg.reply('✎ Debes escribir un prefijo valido.');
    if (prefix.toLowerCase() === 'global') return msg.reply(`✎ Usa *${usedPrefix + command} global* para el modo global.`);

    global.db.data.chats[msg.chat].prefix = prefix;
    return msg.reply(`❀ Se configuró el prefijo del grupo a *${prefix}* correctamente.`);
  },
};
