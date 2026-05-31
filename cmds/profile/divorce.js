export default {
  command: ['divorce'],
  category: 'profile',
  description: 'Divorciarte de tu pareja.',
  run: async ({ msg }) => {
    const user = global.db.data.users[msg.sender];
    const partnerId = user?.marry;    
    if (!partnerId) {
      return msg.reply(`《✧》 Tú no estás ${user.genre === 'Mujer' ? 'casada' : user.genre === 'Hombre' ? 'casado' : 'casadx'} con nadie.`);
    }    
    const partner = global.db.data.users[partnerId];
    global.db.data.users[msg.sender].marry = '';
    global.db.data.users[partnerId].marry = '';    
    return msg.reply(`✎ *${user?.name || msg.sender.split('@')[0]}* te has divorciado de *${partner?.name || partnerId.split('@')[0]}*.`);
  },
};
