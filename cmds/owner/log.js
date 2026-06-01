export default {
  command: ['log', 'logs'],
  category: 'owner',
  description: 'Ver los logs guardados en la RAM.',
  isOwner: true,
  run: async ({ msg, sock }) => {
    if (!global.rawLogsRAM || global.rawLogsRAM.length === 0) {
      return msg.reply('《✧》 No hay logs registrados en la RAM todavía.');
    }

    const cleanLogs = JSON.stringify(global.rawLogsRAM, null, 2);

    await sock.sendMessage(msg.chat, { 
      text: `\`\`\`\n${cleanLogs}\n\`\`\`` 
    }, { quoted: msg });
  }
};
