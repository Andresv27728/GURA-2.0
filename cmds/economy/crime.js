export default {
  command: ['crime', 'crimen'],
  category: 'economy',
  description: 'Ganar coins rápido.',
  run: async ({ msg, sock, usedPrefix, command }) => {

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
      const chat = global.db.data.chats[msg.chat];
      if (chat.adminonly || !chat.economy) {
        return sendInteractive(`ꕥ Los comandos de *Economía* están desactivados en este grupo.\n\nUn *administrador* puede activarlos con el comando:\n» *${usedPrefix}economy on*`);
      }
      const botId = sock.user.id.split(':')[0] + '@s.whatsapp.net';
      const monedas = (global.db.data.settings[botId]).currency;
      (global.db.data.chats[msg.chat]?.users?.[msg.sender] && (global.db.data.chats[msg.chat].users[msg.sender].lastcrime ??= 0));
      const user = global.db.data.chats[msg.chat]?.users?.[msg.sender];
      const remainingTime = user.lastcrime - Date.now();
      if (remainingTime > 0) {
        return sendInteractive(`ꕥ Debes esperar *${msToTime(remainingTime)}* antes de intentar nuevamente.`);
      }

      const éxito = Math.random() < 0.4;
      const saldoAnterior = user.coins || 0;
      let cantidad;
      let saldoFinal;

      if (éxito) {
        cantidad = Math.floor(Math.random() * (7500 - 5500 + 1)) + 5500;
        saldoFinal = saldoAnterior + cantidad;
        global.db.data.chats[msg.chat].users[msg.sender].coins = saldoFinal;
      } else {
        cantidad = Math.floor(Math.random() * (6000 - 4000 + 1)) + 4000;
        const total = (user.coins || 0) + (user.bank || 0);
        if (total >= cantidad) {
          if (user.coins >= cantidad) {
            saldoFinal = saldoAnterior - cantidad;
            global.db.data.chats[msg.chat].users[msg.sender].coins = saldoFinal;
          } else {
            const restante = cantidad - saldoAnterior;
            global.db.data.chats[msg.chat].users[msg.sender].coins = 0;
            global.db.data.chats[msg.chat].users[msg.sender].bank = (user.bank || 0) - restante;
            saldoFinal = 0;
          }
        } else {
          cantidad = total;
          global.db.data.chats[msg.chat].users[msg.sender].coins = 0;
          global.db.data.chats[msg.chat].users[msg.sender].bank = 0;
          saldoFinal = 0;
        }
      }

      global.db.data.chats[msg.chat].users[msg.sender].lastcrime = Date.now() + 7 * 60 * 1000;

      const successMessages = [
        `Hackeaste un cajero automático usando un exploit del sistema y retiraste efectivo sin alertas.`,
        `Te infiltraste como técnico en una mansión y robaste joyas mientras inspeccionabas la red.`,
        `Simulaste una transferencia bancaria falsa y obtuviste fondos antes de que cancelaran la operación.`,
        `Interceptaste un paquete de lujo en una recepción corporativa y lo revendiste.`,
        `Vaciaste una cartera olvidada en un restaurante sin que nadie lo notara.`,
        `Accediste al servidor de una tienda digital y aplicaste descuentos fraudulentos para obtener productos gratis.`,
        `Te hiciste pasar por repartidor y sustrajiste un paquete de colección sin levantar sospechas.`,
        `Copiaste la llave maestra de una galería de arte y vendiste una escultura sin registro.`,
        `Creaste un sitio falso de caridad y lograste que cientos de personas donaran.`,
        `Manipulaste un lector de tarjetas en una tienda local y vaciaste cuentas privadas.`,
        `Falsificaste entradas VIP para un evento y accediste a un área con objetos exclusivos.`,
        `Engañaste a un coleccionista vendiéndole una réplica como pieza original.`,
        `Capturaste la contraseña de un empresario en un café y transferiste fondos a tu cuenta.`,
        `Convenciste a un anciano de participar en una inversión falsa y retiraste sus ahorros.`
      ];
      const failMessages = [
        `Intentaste vender un reloj falso, pero el comprador notó el engaño y te denunció.`,
        `Hackeaste una cuenta bancaria, pero olvidaste ocultar tu IP y fuiste rastreado.`,
        `Robaste una mochila en un evento, pero una cámara oculta capturó todo el acto.`,
        `Te infiltraste en una tienda de lujo, pero el sistema silencioso activó la alarma.`,
        `Simulaste ser técnico en una mansión, pero el dueño te reconoció y llamó a seguridad.`,
        `Intentaste vender documentos secretos, pero eran falsos y nadie quiso comprarlos.`,
        `Planeaste un robo en una joyería, pero el guardia nocturno te descubrió.`,
        `Hackeaste un servidor corporativo, pero tu conexión se cayó y rastrearon tu ubicación.`,
        `Intentaste robar un coche de lujo, pero el GPS alertó a la policía.`,
        `Engañaste a un cliente con un contrato falso, pero lo revisó y te demandó.`,
        `Trataste de escapar con mercancía robada, pero tropezaste y te atraparon.`,
        `Hackeaste una tarjeta de crédito, pero el banco bloqueó la transacción.`
      ];

      const story = éxito ? pickRandom(successMessages) : pickRandom(failMessages);

      await sock.sendMessage(msg.chat, {
        pollResultMessage: {
          name: `${éxito ? '🦹 Crimen exitoso' : '🚨 Crimen fallido'} › ${story}`,
          pollVotes: [
            { optionName: `${éxito ? '📈 Ganaste' : '📉 Perdiste'} › ¥${cantidad.toLocaleString()} ${monedas}`, optionVoteCount: cantidad },
            { optionName: `⛀ Saldo anterior › ¥${saldoAnterior.toLocaleString()} ${monedas}`, optionVoteCount: saldoAnterior },
            { optionName: `⛁ Saldo actual › ¥${saldoFinal.toLocaleString()} ${monedas}`, optionVoteCount: saldoFinal }
          ]
        }
      }, { quoted: msg });

    } catch (e) {
      return sendInteractive(`> Ocurrió un error al ejecutar el comando *${usedPrefix + command}*.\n> [Error: *${e.message}*]`);
    }
  }
};

function msToTime(duration) {
  const seconds = Math.floor((duration / 1000) % 60);
  const minutes = Math.floor((duration / (1000 * 60)) % 60);
  const min = minutes < 10 ? '0' + minutes : minutes;
  const sec = seconds < 10 ? '0' + seconds : seconds;
  return min === '00' ? `${sec} segundo${sec > 1 ? 's' : ''}` : `${min} minuto${min > 1 ? 's' : ''}, ${sec} segundo${sec > 1 ? 's' : ''}`;
}

function pickRandom(list) {
  return list[Math.floor(Math.random() * list.length)];
}
