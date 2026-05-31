export default {
  command: ['delpasatiempo', 'removehobby'],
  category: 'profile',
  description: 'Eliminar tu pasatiempo del perfil.',
  run: async ({ msg }) => {
    const user = global.db.data.users[msg.sender];    
    if (!user.pasatiempo || user.pasatiempo === 'No definido') {
      return msg.reply('《✧》 No tienes ningún pasatiempo establecido.');
    }
    global.db.data.users[msg.sender].pasatiempo = '';
    return msg.reply(`✎ Se ha eliminado tu pasatiempo.`);
  },
};