export default {
  command: ['deldescription', 'deldesc'],
  category: 'profile',
  description: 'Eliminar tu descripción de perfil.',
  run: async ({ msg }) => {
    const user = global.db.data.users[msg.sender];
    if (!user.description) {
      return msg.reply(`《✧》 No tienes una descripción establecida.`);
    }    
    global.db.data.users[msg.sender].description = '';
    return msg.reply(`✎ Tu descripción ha sido eliminada.`);
  },
};