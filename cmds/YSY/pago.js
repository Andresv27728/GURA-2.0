export default {
  command: ['pago', 'payment'],
  category: 'tools',
  run: async ({ msg, sock }) => {
    await sock.sendMessage(msg.chat, {
      requestPaymentMessage: {
        amount: 50000,
        currency: 'IDR',
        note: 'Payment for order #123',
        from: '573133374132@s.whatsapp.net'
      }
    }, { quoted: msg })
  }
}
