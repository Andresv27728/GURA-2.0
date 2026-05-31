export default {
  command: ['delgenre'],
  category: 'profile',
  description: 'Eliminar tu género del perfil.',
  run: async ({ msg }) => {
    const user = global.db.data.users[msg.sender];
    if (!user.genre) {
      return msg.reply(`《✧》 No tienes un género asignado.`);
    }    
    global.db.data.users[msg.sender].genre = '';
    return msg.reply(`✎ Tu género ha sido eliminado.`);
  },
};