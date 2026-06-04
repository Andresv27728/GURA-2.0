import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const modulesToTest = [
  { file: '../cmds/diversion/dog.js', args: [] },
  { file: '../cmds/busquedas/wikipedia.js', args: ['Lionel', 'Messi'] },
  { file: '../cmds/busquedas/ytsearch.js', args: ['rick', 'astley'] },
  { file: '../cmds/main/8ball.js', args: ['¿seré', 'rico?'] },
  { file: '../cmds/main/ping.js', args: [] },
];

function makeSock() {
  return {
    user: { id: '1234567890:1' },
    sendMessage: async (jid, content, opts) => {
      // Simplified logger for important payloads
      const k = Object.keys(content || {}).join(',');
      console.log(`[mock sendMessage] to=${jid} types=${k}`);
      if (content && content.text) console.log('  text:', content.text?.slice?.(0, 200));
      return true;
    },
    sendTable: async (jid, title, headers, rows, msg, opts) => {
      console.log(`[mock sendTable] to=${jid} title=${title}`);
    },
    waUploadToServer: async () => ({}),
    sendText: async (jid, text) => ({ jid, text }),
  };
}

function makeMsg() {
  return {
    chat: 'test@c.us',
    key: { id: '1', remoteJid: 'test@c.us' },
    sender: 'user@s.whatsapp.net',
    messageTimestamp: Math.floor(Date.now() / 1000),
    reply: async (t) => console.log('[mock reply]', t?.slice?.(0,200)),
  };
}

async function run() {
  const results = [];
  for (const modInfo of modulesToTest) {
      const full = path.join(__dirname, modInfo.file);
      const fileUrl = pathToFileURL(full).href;
      try {
      const mod = (await import(fileUrl)).default;
      const sock = makeSock();
      const msg = makeMsg();
      const args = modInfo.args || [];
      console.log('\n=== Testing', modInfo.file, 'commands=', mod.command || mod.name || '-')
      if (typeof mod.run !== 'function') {
        console.log('  SKIP: no run() exported');
        results.push({ file: modInfo.file, ok: false, reason: 'no run()' });
        continue;
      }
      try {
        await mod.run({ msg, sock, args, usedPrefix: '.', command: (mod.command && mod.command[0]) || '' });
        console.log('  OK');
        results.push({ file: modInfo.file, ok: true });
      } catch (e) {
        console.error('  ERROR running:', e && e.message);
        results.push({ file: modInfo.file, ok: false, reason: e && e.message });
      }
    } catch (e) {
      console.error('  ERROR importing:', e && e.message);
      results.push({ file: modInfo.file, ok: false, reason: e && e.message });
    }
  }

  console.log('\nTest summary:');
  for (const r of results) console.log('-', r.file, r.ok ? 'OK' : 'FAILED', r.reason ? `(${r.reason})` : '');
}

run().catch(e=>{ console.error('Test runner failed:', e); process.exit(1); });
