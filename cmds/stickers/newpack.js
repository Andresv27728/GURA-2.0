export default {
  command: ['newpack', 'newstickerpack'],
  category: 'stickers',
  description: 'Crear un nuevo paquete de stickers.',
  run: async ({ msg, sock, args, usedPrefix, command }) => {
    try {
      const settings = global.db.data.settings[sock.user.id.split(':')[0] + '@s.whatsapp.net'] || {}
      const userId = global.db.data.users[msg.sender] || {}
      const dev = userId.name || msg.pushName || 'Desconocido'
      const name = args.join(' ').trim()
      if (!name || name.length < 4 || name.length > 64) {
        return msg.reply('《✧》El nombre del paquete de stickers debe tener entre 4 y 64 caracteres.')
      }
      const stickerPackData = global.db.data.stickerspack[msg.sender]
      const packs = stickerPackData.packs || []
      if (packs.find(p => p.name.toLowerCase() === name.toLowerCase())) {
        return msg.reply('《✧》Ya tienes un paquete con ese nombre.')
      }
      const newPack = { id: Date.now().toString(), lastModified: Date.now().toString(), name, author: 'ʏᴜᴋɪ 🧠 Wᴀʙᴏᴛ', desc: `Paquete de stickers creado por ${dev}`, stickers: [], spackpublic: 0 }
      packs.push(newPack)
      global.db.data.stickerspack[msg.sender].packs = packs
      msg.reply(`《✧》El paquete de stickers \`${name}\` ha sido creado exitosamente!
> Puedes agregar stickers respondiendo a uno usando *${usedPrefix}addsticker ${name}*!`)
    } catch (e) {
      msg.reply(`> An unexpected error occurred while executing command *${usedPrefix + command}*. Please try again or contact support if the issue persists.\n> [Error: *${e.message}*]`);
    }
  }
}
