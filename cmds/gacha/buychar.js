export default {
  command: ['buyc', 'buycharacter', 'buychar'],
  category: 'gacha',
  description: 'Comprar un personaje en venta.',
  run: async ({ msg, sock, args, usedPrefix, command }) => {
    const chatId = msg.chat;
    const userId = msg.sender;
    (global.db.data.chats[chatId].sales ??= {});
    let chat = global.db.data.chats[chatId];
    if (chat.adminonly || !chat.gacha) {
      return msg.reply(`ꕥ Los comandos de *Gacha* están desactivados en este grupo.\n\nUn *administrador* puede activarlos con:\n» *${usedPrefix}gacha on*`);
    }
    if (chat.sales && typeof chat.sales === 'string') {
      try { chat.sales = JSON.parse(chat.sales); } catch { chat.sales = {}; }
    }    
    try {
      if (!args.length) {
        return msg.reply(`❀ Debes especificar un personaje para comprar.\n> Ejemplo » *${usedPrefix + command} Yuki Suou*`);
      }      
      const queryBuy = args.join(' ').toLowerCase();
      const idBuy = Object.keys(chat.sales).find(id => (chat.sales[id]?.name || '').toLowerCase() === queryBuy);
      if (!idBuy) return msg.reply(`ꕥ No se ha encontrado al personaje *${args.join(' ')}* en venta.`);     
      const venta = chat.sales[idBuy];
      if (venta.user === userId) return msg.reply(`ꕥ No puedes comprar tu propio personaje.`);     
      const ahora = Date.now();
      if (ahora - venta.time >= 3 * 864e5) {
        delete chat.sales[idBuy];
        global.db.data.chats[chatId].sales = chat.sales;
        return msg.reply(`ꕥ La venta de *${venta.name}* ha expirado.`);
      }
      let buyer = global.db.data.chats[chatId]?.users?.[userId];
      const saldo = buyer.coins || 0;
      const botId = sock.user.id.split(':')[0] + '@s.whatsapp.net';
      const settings = global.db.data.settings[botId];
      const currency = settings?.currency;
      if (saldo < venta.price) {
        return msg.reply(`ꕥ No tienes suficientes *${currency}* para comprar a *${venta.name}*.\n> Necesitas *¥${venta.price.toLocaleString()} ${currency}*`);
      }
      (global.db.data.chats[chatId]?.users?.[venta.user] && (global.db.data.chats[chatId].users[venta.user].favorite ??= ''));
      let seller = global.db.data.chats[chatId]?.users?.[venta.user];
      buyer.coins -= venta.price;
      seller.coins += venta.price;
      global.db.data.chats[chatId].users[userId].coins = buyer.coins;
      global.db.data.chats[chatId].users[venta.user].coins = seller.coins;
      const buyKey = chatId + '__' + idBuy;
      (global.db.data.characters[buyKey] ||= {}, global.db.data.characters[buyKey].name ??= venta.name, global.db.data.characters[buyKey]);
      let character = global.global.db.data.characters[buyKey];
      if (!character) character = { name: venta.name, value: 0, votes: 0 };
      character.user = userId;
      character.claimedAt = ahora;
      global.global.db.data.characters[buyKey] = character;
      if (!buyer.characters.includes(idBuy)) {
        buyer.characters.push(idBuy);
        global.db.data.chats[chatId].users[userId].characters = buyer.characters;
      }
      seller.characters = seller.characters.filter(id => id !== idBuy);
      global.db.data.chats[chatId].users[venta.user].characters = seller.characters;
      if (seller.favorite === idBuy) {
        global.db.data.chats[chatId].users[venta.user].favorite = '';
        global.db.data.users[venta.user].favorite = '';
      }
      delete chat.sales[idBuy];
      global.db.data.chats[chatId].sales = chat.sales;
      const vendedorGlobal = global.db.data.users[venta.user];
      const compradorGlobal = global.db.data.users[userId];
      let vendedorNombre = vendedorGlobal?.name?.trim() || venta.user.split('@')[0];
      let compradorNombre = compradorGlobal?.name?.trim() || userId.split('@')[0];
      msg.reply(`❀ *${venta.name}* ha sido comprado por *${compradorNombre}*!\n> Se han transferido *¥${venta.price.toLocaleString()} ${currency}* a *${vendedorNombre}*`);
    } catch (e) {
      await msg.reply(`> An unexpected error occurred while executing command *${usedPrefix + command}*. Please try again or contact support if the issue persists.\n> [Error: *${e.message}*]`);
    }
  },
};