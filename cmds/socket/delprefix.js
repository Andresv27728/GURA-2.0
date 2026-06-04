export default {
  command: ['delprefix'],
  category: 'socket',
  description: 'Quita el prefijo personalizado del grupo y vuelve al modo sin prefijo.',
  run: async ({ msg, sock, usedPrefix, command, isAdmins, isOwner }) => {
    const canUse = isOwner || (msg.isGroup && isAdmins);
    if (!canUse) return sock.reply(msg.chat, global.mess.socket, msg);
    if (!msg.isGroup) return msg.reply(`✎ *${usedPrefix + command}* solo se usa dentro de un grupo.`);

    global.db.data.chats[msg.chat].prefix = 1;
    return msg.reply('❀ El grupo volvió a responder solo sin prefijos.');
  },
};
