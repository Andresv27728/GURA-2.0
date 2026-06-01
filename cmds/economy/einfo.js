const formatTime = (ms) => {
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const parts = [];
  if (days > 0) parts.push(`${days} d`);
  if (hours > 0) parts.push(`${hours} h`);
  if (minutes > 0) parts.push(`${minutes} m`);
  if (seconds > 0) parts.push(`${seconds} s`);
  return parts.length ? parts.join(', ') : 'Ahora.';
};

export default {
  command: ['infoeconomy', 'cooldowns', 'economyinfo', 'einfo'],
  category: 'economy',
  description: 'Ver tu información de economía y cooldowns.',
  run: async ({ msg, sock, usedPrefix }) => {

    async function sendInteractive(text) {
      const baileys = await import('baileys');
      const msg2 = baileys.generateWAMessageFromContent(
        msg.chat,
        baileys.proto.Message.fromObject({
          interactiveMessage: {
            header: { title: ": ̗̀「𝐈𝐬𝐨𝐥𝐚𝐭𝐞𝐝𝐋𝐚𝐛𝐬」" },
            body: { text },
            nativeFlowMessage: {
              buttons: [{ name: "inapp_signup", buttonParamsJson: "https://yosoyyo-api-ofc.onrender.com" }]
            }
          }
        }),
        {}
      );
      await sock.relayMessage(msg.chat, msg2.message, { messageId: msg2.key.id });
    }

    try {
      const chatId = msg.chat;
      const botId = sock.user.id.split(':')[0] + "@s.whatsapp.net";
      const chatData = global.db.data.chats[chatId];
      if (chatData.adminonly || !chatData.economy) {
        return sendInteractive(`ꕥ Los comandos de *Economía* están desactivados en este grupo.\n\nUn *administrador* puede activarlos con el comando:\n» *${usedPrefix}economy on*`);
      }
      (global.db.data.chats[chatId]?.users?.[msg.sender] && (global.db.data.chats[chatId].users[msg.sender].lastcrime ??= 0));
      (global.db.data.chats[chatId]?.users?.[msg.sender] && (global.db.data.chats[chatId].users[msg.sender].lastmine ??= 0));
      (global.db.data.chats[chatId]?.users?.[msg.sender] && (global.db.data.chats[chatId].users[msg.sender].lastinvoke ??= 0));
      (global.db.data.chats[chatId]?.users?.[msg.sender] && (global.db.data.chats[chatId].users[msg.sender].lastwork ??= 0));
      (global.db.data.chats[chatId]?.users?.[msg.sender] && (global.db.data.chats[chatId].users[msg.sender].lastslut ??= 0));
      (global.db.data.chats[chatId]?.users?.[msg.sender] && (global.db.data.chats[chatId].users[msg.sender].laststeal ??= 0));
      (global.db.data.chats[chatId]?.users?.[msg.sender] && (global.db.data.chats[chatId].users[msg.sender].lasthunt ??= 0));
      (global.db.data.chats[chatId]?.users?.[msg.sender] && (global.db.data.chats[chatId].users[msg.sender].lastfish ??= 0));
      (global.db.data.chats[chatId]?.users?.[msg.sender] && (global.db.data.chats[chatId].users[msg.sender].lastcoffer ??= 0));
      (global.db.data.chats[chatId]?.users?.[msg.sender] && (global.db.data.chats[chatId].users[msg.sender].lastdungeon ??= 0));
      (global.db.data.chats[chatId]?.users?.[msg.sender] && (global.db.data.chats[chatId].users[msg.sender].lastadventure ??= 0));
      (global.db.data.chats[chatId]?.users?.[msg.sender] && (global.db.data.chats[chatId].users[msg.sender].lastdaily ??= 0));
      (global.db.data.chats[chatId]?.users?.[msg.sender] && (global.db.data.chats[chatId].users[msg.sender].lastweekly ??= 0));
      (global.db.data.chats[chatId]?.users?.[msg.sender] && (global.db.data.chats[chatId].users[msg.sender].lastmonthly ??= 0));
      const user = global.db.data.chats[chatId]?.users?.[msg.sender];
      const users = global.db.data.users[msg.sender];
      const settings = global.db.data.settings[botId];
      const now = Date.now();
      const cooldowns = {
        crime: Math.max(0, (user.lastcrime || 0) - now),
        mine: Math.max(0, (user.lastmine || 0) - now),
        ritual: Math.max(0, (user.lastinvoke || 0) - now),
        work: Math.max(0, (user.lastwork || 0) - now),
        slut: Math.max(0, (user.lastslut || 0) - now),
        steal: Math.max(0, (user.laststeal || 0) - now),
        hunt: Math.max(0, (user.lasthunt || 0) - now),
        fish: Math.max(0, (user.lastfish || 0) - now),
        coffer: Math.max(0, (user.lastcoffer || 0) - now),
        dungeon: Math.max(0, (user.lastdungeon || 0) - now),
        adventure: Math.max(0, (user.lastadventure || 0) - now),
        daily: Math.max(0, (user.lastdaily || 0) - now),
        weekly: Math.max(0, (user.lastweekly || 0) - now),
        monthly: Math.max(0, (user.lastmonthly || 0) - now)
      };
      const coins = user.coins || 0;
      const name = users?.name || msg.sender.split('@')[0];

      const tableData = [
        ['ⴵ Work', formatTime(cooldowns.work)],
        ['ⴵ Slut', formatTime(cooldowns.slut)],
        ['ⴵ Crime', formatTime(cooldowns.crime)],
        ['ⴵ Mine', formatTime(cooldowns.mine)],
        ['ⴵ Ritual', formatTime(cooldowns.ritual)],
        ['ⴵ Fish', formatTime(cooldowns.fish)],
        ['ⴵ Hunt', formatTime(cooldowns.hunt)],
        ['ⴵ Dungeon', formatTime(cooldowns.dungeon)],
        ['ⴵ Adventure', formatTime(cooldowns.adventure)],
        ['ⴵ Steal', formatTime(cooldowns.steal)],
        ['ⴵ Daily', formatTime(cooldowns.daily)],
        ['ⴵ Coffer', formatTime(cooldowns.coffer)],
        ['ⴵ Weekly', formatTime(cooldowns.weekly)],
        ['ⴵ Monthly', formatTime(cooldowns.monthly)],
        ['⛁ Coins totales', `¥${coins.toLocaleString()} ${settings.currency}`]
      ];

      await sock.sendTable(
        chatId,
        '⏳ Cooldowns de Economía',
        ['Comando', 'Tiempo restante'],
        tableData,
        msg,
        {
          headerText: `✿ Usuario *${name}*\n\n- 🎄 Abajo están tus cooldowns de economía`,
          footer: '🍃 IsolatedLabs Economy'
        }
      );

    } catch (e) {
      return sendInteractive(`> Ocurrió un error al ejecutar el comando.\n> [Error: *${e.message}*]`);
    }
  }
};
