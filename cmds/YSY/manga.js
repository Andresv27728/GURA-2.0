import fetch from 'node-fetch'

export default {
  command: ['manga'],
  category: 'utils',
  description: 'Listar archivos de una carpeta de MediaFire o descargar un archivo de MediaFire. Ej: manga <folder-url>  OR manga <file-url>',
  run: async ({ msg, sock, args }) => {
    try {
      if (!args || !args[0]) return msg.reply('Envía el enlace de carpeta o archivo de MediaFire.');
      const url = args[0].trim();
      // Detectar carpeta vs archivo
      const isFolder = /mediafire\.com\/(?:folder|folders)\//i.test(url) || /mediafire\.com\/(?:user)\//i.test(url);
      const isFile = /mediafire\.com\/(?:file)\//i.test(url);

      if (isFolder) {
        // Obtener lista de archivos en la carpeta
        const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        const html = await res.text();
        // Buscar enlaces a archivos. Intentamos capturar href a /file/ y el nombre visible
        const re = /href="(https?:\/\/www\.mediafire\.com\/file\/[^"]+)"[^>]*>([^<]+?)<\/a>/gi;
        let m;
        const items = [];
        while ((m = re.exec(html)) !== null) {
          const link = m[1];
          // nombre puede contener etiquetas; limpiamos
          const name = m[2].replace(/<[^>]*>/g, '').trim();
          if (link && name) items.push({ name, link });
        }
        if (!items.length) return msg.reply('No pude detectar archivos en esa carpeta o la carpeta está vacía.');
        // Construir mensaje con lista enumerada
        let out = `Archivos detectados: \n\n`;
        for (let i = 0; i < items.length; i++) {
          out += `${i + 1}. ${items[i].name}\n${items[i].link}\n\n`;
          if (out.length > 3000) { // dividir si es muy largo
            await msg.reply(out);
            out = '';
          }
        }
        if (out) await msg.reply(out);
        return;
      } else if (isFile) {
        // Descargar archivo directo: necesitamos obtener el enlace de descarga final
        const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        const html = await res.text();
        // Buscar enlace de descarga: botón con id downloadButton o links a download.mediafire
        let dl = null;
        // 1) download button
        const m1 = html.match(/id="downloadButton"[^>]*href="([^"]+)"/i);
        if (m1 && m1[1]) dl = m1[1];
        // 2) enlaces directos a download.mediafire.com
        if (!dl) {
          const m2 = html.match(/https?:\/\/download[^'"\s>]+/i) || html.match(/https?:\/\/download\.mediafire\.com\/[^"]+/i);
          if (m2) dl = m2[0];
        }
        // 3) meta refresh
        if (!dl) {
          const m3 = html.match(/<meta http-equiv="refresh" content="\d+;url=([^"]+)"/i);
          if (m3 && m3[1]) dl = m3[1];
        }

        if (!dl) return msg.reply('No pude obtener el enlace de descarga directo desde la página. Intenta enviar el enlace de archivo (https://www.mediafire.com/file/...).');

        // Si el enlace es relativo o contiene &amp; limpiar
        dl = dl.replace(/&amp;/g, '&');

        // Intentar enviar el archivo usando sendFile helper (serializers definen sock.sendFile)
        await msg.reply('Preparando descarga, por favor espera...');
        try {
          // sock.sendFile soporta URL y enviará el archivo
          await sock.sendFile(msg.chat, dl, null, '', msg);
        } catch (e) {
          // Como fallback, intentamos descargar a buffer y enviar como documento
          try {
            const fileRes = await fetch(dl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
            const buf = await fileRes.buffer();
            const disposition = fileRes.headers.get('content-disposition') || '';
            let filename = 'file';
            const fnMatch = disposition.match(/filename\*=UTF-8''([^;\n\r]+)/) || disposition.match(/filename="?([^";\n\r]+)"?/);
            if (fnMatch) filename = decodeURIComponent(fnMatch[1]);
            else {
              const urlParts = dl.split('/');
              filename = decodeURIComponent(urlParts[urlParts.length - 1].split('?')[0]) || filename;
            }
            await sock.sendFile(msg.chat, buf, filename, '', msg);
          } catch (err) {
            return msg.reply('Error al descargar o enviar el archivo: ' + err.message);
          }
        }
        return;
      } else {
        return msg.reply('Enlace no reconocido. Pasa un enlace de carpeta de MediaFire (mediafire.com/folder/...) o un enlace de archivo (mediafire.com/file/...).');
      }
    } catch (err) {
      console.error(err);
      return msg.reply('Ocurrió un error: ' + (err.message || err));
    }
  }
}
