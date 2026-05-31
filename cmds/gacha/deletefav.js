import { promises as fs } from 'fs';

const charactersFilePath = './core/characters.json';

async function loadCharacters() {
  const data = await fs.readFile(charactersFilePath, 'utf-8');
  return JSON.parse(data);
}

function flattenCharacters(structure) {
  return Object.values(structure).flatMap(s => Array.isArray(s.characters) ? s.characters : []);
}

export default {
  command: ['deletefav', 'delfav'],
  category: 'gacha',
  description: 'Borrar tu claim favorito.',
  run: async ({ msg, usedPrefix, command }) => {
    const chat = global.db.data.chats[msg.chat];
    if (chat.adminonly || !chat.gacha) {
      return msg.reply(`ꕥ Los comandos de *Gacha* están desactivados en este grupo.\n\nUn *administrador* puede activarlos con el comando:\n» *${usedPrefix}gacha on*`);
    }
    (global.db.data.chats[msg.chat]?.users?.[msg.sender] && (global.db.data.chats[msg.chat].users[msg.sender].favorite ??= ''));
    let user = global.db.data.chats[msg.chat]?.users?.[msg.sender];    
    if (!user.favorite) {
      return msg.reply('❀ No tienes ningún personaje marcado como favorito.');
    }    
    const id = user.favorite;
    let name = '';    
    try {
      const character = global.global.db.data.characters[id];
      name = character?.name || '';      
      if (!name) {
        const structure = await loadCharacters();
        const all = flattenCharacters(structure);
        const original = all.find(c => c.id === id);
        name = original?.name || 'personaje desconocido';
      }
      global.db.data.chats[msg.chat].users[msg.sender].favorite = '';
      global.db.data.users[msg.sender].favorite = '';
      msg.reply(`✎ *${name}* ha dejado de ser tu personaje favorito.`);      
    } catch (e) {
      await msg.reply(`> An unexpected error occurred while executing command *${usedPrefix + command}*. Please try again or contact support if the issue persists.\n> [Error: *${e.message}*]`);
    }
  },
};