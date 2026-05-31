export default {
  command: ['warn'],
  category: 'group',
  description: 'Darle una advertencia a un miembro del grupo.',
  isAdmin: true,
  run: async ({ msg, sock, args, usedPrefix, command }) => {
    (global.db.data.chats[msg.chat].warnLimit ??= 3);
    (global.db.data.chats[msg.chat].expulsar ??= 0);
    let chat = global.db.data.chats[msg.chat];
    const targetId = msg.mentionedJid?.[0] || msg.quoted?.sender || null;
    const reason = msg.mentionedJid?.length > 0 ? args.slice(1).join(' ') || 'Sin razón.' : args.slice(0).join(' ') || 'Sin razón.';
    try {
      if (!targetId) {
        return msg.reply('《✧》 Debes mencionar o responder al usuario que deseas advertir.');
      }
      (global.db.data.chats[msg.chat]?.users?.[targetId] && (global.db.data.chats[msg.chat].users[targetId].warnings ??= []));
      let user = global.db.data.chats[msg.chat]?.users?.[targetId];
      let warnings = user.warnings;
      if (typeof warnings === 'string') {
        try { warnings = JSON.parse(warnings); } catch { warnings = []; }
      }
      const now = new Date();
      const timestamp = now.toLocaleString('es-CO', { timeZone: 'America/Bogota', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
      warnings.unshift({ reason, timestamp, by: msg.sender });
      global.db.data.chats[msg.chat].users[targetId].warnings = warnings;
      const total = warnings.length;
      const userGlobal = global.db.data.users[targetId];
      const name = userGlobal?.name || 'Usuario';
      const warningList = warnings.map((w, i) => {
        const index = total - i;
        return `\`#${index}\` » ${w.reason}\n> » Fecha: ${w.timestamp}`;
      }).join('\n');
      let message = `✐ Se ha añadido una advertencia a @${targetId.split('@')[0]}.\n✿ Advertencias totales \`(${total})\`:\n\n${warningList}`;
      const warnLimit = chat.warnLimit || 3;
      const expulsar = chat.expulsar === 1;
      if (total >= warnLimit && expulsar) {
        try {
          await sock.groupParticipantsUpdate(msg.chat, [targetId], 'remove');
          global.db.data.chats[msg.chat].users[targetId].warnings = [];
          message += `\n\n> ❖ El usuario ha alcanzado el límite de advertencias y fue expulsado del grupo.`;
        } catch {
          message += `\n\n> ❖ El usuario alcanzó el límite, pero no se pudo expulsar automáticamente.`;
        }
      } else if (total >= warnLimit && !expulsar) {
        message += `\n\n> ❖ El usuario ha alcanzado el límite de advertencias.`;
      }
      await sock.reply(msg.chat, message, msg, { mentions: [targetId] });
    } catch (e) {
      return msg.reply(`> An unexpected error occurred while executing command *${usedPrefix + command}*. Please try again or contact support if the issue persists.\n> [Error: *${e.message}*]`);
    }
  },
};
