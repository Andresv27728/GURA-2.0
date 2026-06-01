import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function reloadCommands(dir = path.join(__dirname, '..')) {
  const commandsMap = new Map();
  async function readCommands(folder) {
    const files = fs.readdirSync(folder);
    for (const file of files) {
      const fullPath = path.join(folder, file);
      if (fs.lstatSync(fullPath).isDirectory()) {
        await readCommands(fullPath);
      } else if (file.endsWith('.js')) {
        try {
          const { default: cmd } = await import(fullPath + '?update=' + Date.now());
          if (cmd?.command) {
            cmd.command.forEach((c) => {
              commandsMap.set(c.toLowerCase(), cmd);
            });
          }
        } catch (err) {
          console.error(`Error recargando comando ${file}:`, err);
        }
      }
    }
  }
  await readCommands(dir);
  global.comandos = commandsMap;
}

export default {
  command: ['fix', 'update'],
  category: 'owner',
  description: 'Actualizar y recargar los comandos del bot.',
  isOwner: true,
  run: async ({ msg, sock }) => {
    exec('git pull', async (error, stdout) => {
      try {
        await reloadCommands(path.join(__dirname, '..'));

        const replyText = stdout.includes('Already up to date.')
          ? 'ꕥ *Estado:* Todo está actualizado'
          : `*Actualización completada*\n\n${stdout}`;

        const baileys = await import('baileys');

        const msg2 = baileys.generateWAMessageFromContent(
          msg.chat,
          baileys.proto.Message.fromObject({
            interactiveMessage: {
              header: {
                title: ": ̗̀「𝐈𝐬𝐨𝐥𝐚𝐭𝐞𝐝𝐋𝐚𝐛𝐬」"
              },
              body: {
                text: replyText
              },
              nativeFlowMessage: {
                buttons: [
                  {
                    name: "inapp_signup",
                    buttonParamsJson: "https://yosoyyo-api-ofc.onrender.com"
                  }
                ]
              }
            }
          }),
          {}
        );

        await sock.relayMessage(
          msg.chat,
          msg2.message,
          { messageId: msg2.key.id }
        );

      } catch (e) {
        return msg.reply(`> Ocurrió un error al ejecutar el comando.\n> [Error: *${e.message}*]`);
      }
    });
  }
};
