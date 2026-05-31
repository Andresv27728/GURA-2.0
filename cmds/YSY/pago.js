export default {
  command: ['pago', 'payment'],
  category: 'tools',
  run: async ({ msg, sock }) => {
    await sock.sendMessage(msg.chat, {
      requestPaymentMessage: {
        amount: 15000,
        currency: 'USD',
        note: 'Pago por orden #123',
        from: '573133374132@s.whatsapp.net'
      }
    }, { quoted: msg })
  }
}
