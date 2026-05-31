export default {
  command: ['afk'],
  category: 'profile',
  description: 'Activar el modo ausente (AFK).',
  run: async ({ msg, sock, args }) => {
    global.db.data.chats[msg.chat].users[msg.sender].afk = Date.now();
    global.db.data.chats[msg.chat].users[msg.sender].afkReason = args.join(' ');    
    const userData = global.db.data.users[msg.sender];
    const nombre = userData?.name || 'Usuario';
    const motivo = args.length ? `${args.join(' ')}` : 'Sin Especificar!';    
    return await sock.reply(msg.chat, `ꕥ El Usuario *${nombre}* estará AFK.\n> ○ Motivo » *${motivo}*`, msg);
  }
};