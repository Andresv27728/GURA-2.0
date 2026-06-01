export default {
  command: ['enc', 'encuesta', 'poll'],
  category: 'tools',
  run: async ({ msg, sock }) => {
    await sock.sendMessage(msg.chat, {
      poll: {
        name: "Favorite Color?",
        values: ["Red", "Blue", "Green"],
        selectableCount: 1
      }
    }, { quoted: msg })
  }
}
