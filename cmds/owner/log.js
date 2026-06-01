import { writeFile, unlink } from 'fs/promises';

export default {
  command: ['log', 'logs'],
  category: 'owner',
  description: 'Ver los logs guardados en la RAM.',
  isOwner: true,
  run: async ({ msg, sock, args }) => {
    if (args?.includes('|') && args?.includes('clear')) {
      global.rawLogsRAM = '';
      return msg.reply('《✧》 Logs de la RAM limpiados.');
    }

    if (!global.rawLogsRAM || global.rawLogsRAM.length === 0) {
      return msg.reply('《✧》 No hay logs registrados en la RAM todavía.');
    }

    const cleanLogs = Array.isArray(global.rawLogsRAM)
  ? global.rawLogsRAM.join('\n')
  : String(global.rawLogsRAM)
      .replace(/,/g, '')
      .replace(/\\n/g, '\n');
    const filePath = './tmp/logs.txt';

    await writeFile(filePath, cleanLogs);

    await sock.sendMessage(
      msg.chat,
      {
        document: { url: filePath },
        mimetype: 'text/plain',
        fileName: 'logs.txt'
      },
      { quoted: msg }
    );

    await unlink(filePath).catch(() => {});
  }
};
