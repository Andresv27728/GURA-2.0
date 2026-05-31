export default {
  command: ['dep', 'deposit', 'd', 'depositar'],
  category: 'economy',
  description: 'Depositar tus coins en el banco.',
  run: async ({ msg, sock, args, usedPrefix }) => {
    const chatData = global.db.data.chats[msg.chat];
    if (chatData.adminonly || !chatData.economy) {
      return msg.reply(`ꕥ Los comandos de *Economía* están desactivados en este grupo.\n\nUn *administrador* puede activarlos con el comando:\n» *${usedPrefix}economy on*`);
    }    
    const idBot = sock.user.id.split(':')[0] + '@s.whatsapp.net';
    const settings = global.db.data.settings[idBot];
    const monedas = settings.currency;
    const user = global.db.data.chats[msg.chat]?.users?.[msg.sender];
    if (!args[0]) {
      return msg.reply(`《✧》 Ingresa la cantidad de *${monedas}* que quieras *depositar*.`);
    }
    if (args[0] < 1 && args[0].toLowerCase() !== 'all') {
      return msg.reply('✎ Ingresa una cantidad *válida* para depositar');
    }
    if (args[0].toLowerCase() === 'all') {
      if (user.coins <= 0) return msg.reply(`✎ No tienes *${monedas}* para depositar en tu *banco*`);
      const count = user.coins;
      global.db.data.chats[msg.chat].users[msg.sender].coins = 0;
      global.db.data.chats[msg.chat].users[msg.sender].bank = (user.bank || 0 + count);
      await msg.reply(`ꕥ Has depositado *¥${count.toLocaleString()} ${monedas}* en tu Banco`);
      return true;
    }        
    if (!Number(args[0]) || parseInt(args[0]) < 1) {
      return msg.reply('《✧》 Ingresa una cantidad *válida* para depositar');
    }    
    const count = parseInt(args[0]);        
    if (user.coins <= 0 || user.coins < count) {
      return msg.reply(`❀ No tienes suficientes *${monedas}* para depositar`);
    }        
    global.db.data.chats[msg.chat].users[msg.sender].coins = (user.coins || 0 - count);
    global.db.data.chats[msg.chat].users[msg.sender].bank = (user.bank || 0 + count);    
    await msg.reply(`ꕥ Has depositado *¥${count.toLocaleString()} ${monedas}* en tu Banco`);
  }
};