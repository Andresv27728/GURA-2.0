export default {
  command: ['8ball', 'bola8', 'magic8'],
  category: 'main',
  description: 'Pregúntale a la bola 8 mágica. Uso: 8ball <pregunta>',
  run: async ({ msg, sock, args }) => {
    const responses = [
      // --- Afirmativas ---
      "Es cierto.",
      "Sin duda.",
      "Sí, definitivamente.",
      "Puedes contar con ello.",
      "Como yo lo veo, sí.",
      "Lo más probable.",
      "Las perspectivas son buenas.",
      "Sí.",
      "Las señales apuntan a que sí.",
      "Por supuesto que sí.",
      "Absolutamente.",
      "Ni lo dudes.",
      "100% seguro.",
      "Claro que sí.",
      "Sin ninguna duda.",
      "Es un rotundo sí.",
      "La suerte está de tu lado.",
      "El universo dice que sí.",
      "Esa es la verdad.",
      "Confirmado por los astros.",

      // --- Negativas ---
      "No cuentes con ello.",
      "Mi respuesta es no.",
      "Mis fuentes dicen que no.",
      "Las perspectivas no son tan buenas.",
      "Muy dudoso.",
      "Definitivamente no.",
      "Ni en tus sueños.",
      "Eso no va a pasar.",
      "No hay forma.",
      "No lo creo.",
      "No lo veo posible.",
      "Ni lo intentes.",
      "El destino dice que no.",
      "Me temo que no.",
      "Imposible.",
      "No, simplemente no.",
      "Lo siento, pero no.",
      "Tal vez en otra vida.",
      "No es tu día.",
      "Eso jamás ocurrirá.",

      // --- Neutras ---
      "Respuesta confusa, intenta de nuevo.",
      "Vuelve a preguntar más tarde.",
      "Mejor no decírtelo ahora.",
      "No se puede predecir ahora.",
      "Concéntrate y vuelve a preguntar.",
      "El futuro es incierto.",
      "Podría ser… o no.",
      "Depende del clima.",
      "Aún no lo sé.",
      "No estoy seguro.",
      "El destino aún no ha decidido.",
      "Quizás sí, quizás no.",
      "Pregunta de nuevo cuando estés listo.",
      "No tengo una respuesta clara.",
      "Mi bola está nublada.",
      "Tal vez, pero no apuestes por ello.",
      "No sabría decirte.",
      "Eso depende de ti.",
      "No tengo suficiente energía para responder.",
      "Pide una señal del universo.",

      // --- Graciosas ---
      "JAJA no.",
      "¿Estás bromeando? No.",
      "Eso ni tú te lo crees.",
      "Pregunta seria, respuesta seria: no.",
      "El oráculo está durmiendo, intenta más tarde.",
      "¿Otra vez tú con eso?",
      "No hasta que termines tus tareas.",
      "Mis algoritmos dicen 'meh'.",
      "Sí, pero solo si bailas primero.",
      "La respuesta está en tu nevera.",
      "No mientras Mercurio esté retrógrado.",
      "Eso requeriría un milagro.",
      "Sí, si me invitas pizza.",
      "Claro... en un universo alternativo.",
      "Hazme otra pregunta, esa está aburrida.",
      "Sí, pero no te emociones mucho.",
      "Hmm... pregunta interesante, pero no.",
      "Sí, pero solo si lo dices con fe.",
      "Depende del humor de los gatos hoy.",

      // --- Inspiradoras ---
      "El poder está dentro de ti.",
      "Tu destino lo decides tú.",
      "El futuro se escribe con tus acciones.",
      "Nada está escrito todavía.",
      "Todo es posible si lo intentas.",
      "Lo sabrás en el momento indicado.",
      "Escucha tu corazón, no mi bola.",
      "La paciencia traerá respuestas.",
      "No es un sí ni un no, es un 'veremos'.",
      "Tal vez no ahora, pero pronto.",
      "El tiempo lo dirá.",
      "No preguntes, actúa.",
      "Las respuestas están en tu interior.",
      "Solo el universo sabe la verdad.",
      "No temas al resultado.",
      "A veces, no saber es parte del viaje.",
      "La duda es el inicio del conocimiento.",
      "Esa pregunta cambiará tu destino.",
      "Confía en el proceso.",
      "Haz la pregunta correcta, y obtendrás la respuesta correcta.",

      // --- Místicas ---
      "Los espíritus dicen que sí.",
      "El cosmos sonríe ante tu pregunta.",
      "Las estrellas se alinean a tu favor.",
      "Veo un futuro brillante.",
      "Las energías son positivas.",
      "Siento una vibración de 'sí'.",
      "Los planetas dicen que no.",
      "El aura dice que esperes.",
      "Escucha el viento... él sabe la respuesta.",
      "Mi bola se ilumina: eso es un sí.",
      "Tu destino cambia mientras hablamos.",
      "El universo se ríe de esa pregunta.",
      "Los números dicen 42, ¿te dice algo?",
      "Tu camino se abre hacia la verdad.",
      "He consultado los dioses: aprueban.",
      "La magia responde afirmativamente.",
      "El oráculo sonríe.",
      "El equilibrio se mantiene, aún no hay respuesta.",
      "Tu energía atrae un sí.",
      "Los astros aún discuten tu destino."
    ];

    const borders = [
      "╭━━━⊱  🎱  ⊰━━━╮",
      "╔═══ஓ๑♡๑ஓ═══╗",
      "✦••┈┈┈┈┈┈┈••✦",
      "▁ ▂ ▄ ▅ ▆ ▇ █ 🎱 █ ▇ ▆ ▅ ▄ ▂ ▁",
      "╓╌╌╌╌╌╌╌╌╌╌╌╌╌╌╖"
    ];

    const emojis = ["💫", "🌌", "🔮", "✨", "🌙", "🌠", "⭐", "☁️", "🌟", "⚡"];

    if (!args || args.length === 0) {
      return await sock.sendMessage(msg.chat, { text: '🎱 Debes hacerme una pregunta para que pueda responder.' }, { quoted: msg });
    }

    const randomResponse = responses[Math.floor(Math.random() * responses.length)];
    const border = borders[Math.floor(Math.random() * borders.length)];
    const emoji = emojis[Math.floor(Math.random() * emojis.length)];

    // Determinar tipo de respuesta
    let reaction = "🤔";
    const positiveWords = ["sí", "cierto", "definitivamente", "probable", "seguro", "favor", "afirmativo", "bueno"];
    const negativeWords = ["no", "dudoso", "imposible", "negativo", "malo"];
    const responseLower = randomResponse.toLowerCase();

    if (positiveWords.some(word => responseLower.includes(word))) reaction = "😄";
    else if (negativeWords.some(word => responseLower.includes(word))) reaction = "😬";

    const message = `\n${border}\n🎱 *BOLA 8 MÁGICA* ${emoji}\n${border}\n\n*Tu pregunta:*  \n> _${args.join(" ")}_\n\n*Respuesta:*  \n🎱 ${randomResponse}\n\n${border}\n${emoji} *La sabiduría del universo ha hablado...* ${emoji}`;

    // Reacción automática
    await sock.sendMessage(msg.chat, { react: { text: reaction, key: msg.key } });

    // Enviar mensaje decorado
    await sock.sendMessage(msg.chat, { text: message.trim() }, { quoted: msg });
  }
};
