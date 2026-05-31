export default {
  command: ['delclaimmsg', 'resetclaimmsg'],
  category: 'gacha',
  description: 'Restablecer el mensaje al reclamar un personaje.',
  run: async ({ msg, usedPrefix, command }) => {
    try {
      const chat = global.db.data.chats[msg.chat];
      if (chat.adminonly || !chat.gacha) {
        return msg.reply(`ꕥ Los comandos de *Gacha* están desactivados en este grupo.\n\nUn *administrador* puede activarlos con el comando:\n» *${usedPrefix}gacha on*`);
      }
      const user = global.db.data.users[msg.sender];
      if (user.claimMessage) {
        global.db.data.users[msg.sender].claimMessage = '';
      }      
      msg.reply('❀ Mensaje de reclamación restablecido.');      
    } catch (e) {
      await msg.reply(`> An unexpected error occurred while executing command *${usedPrefix + command}*. Please try again or contact support if the issue persists.\n> [Error: *${e.message}*]`);
    }
  },
};