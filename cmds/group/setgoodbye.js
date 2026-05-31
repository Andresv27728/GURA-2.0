export default {
  command: ['setgoodbye'],
  category: 'group',
  description: 'Establecer un mensaje de despedida personalizado.',
  isAdmin: true,
  run: async ({ msg, args, usedPrefix, command }) => {
    const chatId = msg.chat;
    let chat = global.db.data.chats[chatId];
    if (!args.length) {
      return msg.reply(`ꕤ ꨩᰰ𑪐𑂺 ˳ ׄ Set Bye ࣭𑁯ᰍ   ̊ ܃܃

*❒ Variables disponibles:*
𖣣ֶㅤ֯⌗ ✤ ⬭ @user    
> → Mención del usuario que sale

𖣣ֶㅤ֯⌗ ✤ ⬭ @group   
> → Nombre del grupo

𖣣ֶㅤ֯⌗ ✤ ⬭ @desc    
> → Descripción del grupo

𖣣ֶㅤ֯⌗ ✤ ⬭ @members 
> → Número de miembros actuales

𖣣ֶㅤ֯⌗ ✤ ⬭ @time    
> → Fecha y hora

✿ Si ya tienes un mensaje configurado y quieres borrarlo usa: *${usedPrefix + command} clear*`);
    }
    if (args[0] === 'clear') {
      if (!chat.sGoodbye || chat.sGoodbye.trim() === '') {
        return msg.reply('✎ No tienes ningún mensaje de despedida definido.');
      }
      chat.sGoodbye = '';
      global.db.data.chats[chatId].sGoodbye = '';
      return msg.reply('✐ Mensaje de despedida eliminado.');
    }
    const texto = args.join(' ');
    chat.sGoodbye = texto;
    global.db.data.chats[chatId].sGoodbye = texto;
    msg.reply(`ꕥ Has establecido el mensaje de despedida correctamente.`);
  }
};