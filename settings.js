import { watchFile, unwatchFile } from "fs";
import chalk from "chalk";
import { fileURLToPath } from "url";

global.botNumber = '';
global.owner = ['573133374132'];

global.dev = "Yo Soy Yo";
global.links = {
  api: 'https://api.yuki-wabot.my.id',
  channel: "https://whatsapp.com/channel/0029Val9ZCp1SWszvD7jUx1B",
  github: "https://github.com/IsolatedLabs",
  gmail: "isolatedlabs.cn@gmail.com"
}
global.my = {
  ch1: '120363399729727124@newsletter'
};

global.APIs = { 
  yuki: { url: "https://api.yuki-wabot.my.id", key: "YukiBot-MD" },
  vreden: { url: "https://api.vreden.web.id", key: null },
  ootaizumi: { url: "https://api.ootaizumi.web.id", key: null },
  delirius: { url: "https://api.delirius.store", key: null },
  zenzxz: { url: "https://api.zenzxz.my.id", key: null },
  siputzx: { url: "https://app.siputzx.my.id", key: null }
};

global.mess = {
  socket: 'ೃ‧₊› Hey, this command is only for the Socket, right?',
  admin: 'ೃ‧₊› What are you doing? Only group administrators can use this command.',
  botAdmin: 'ೃ‧₊› Ah... you expected it to work? First, make the socket administrator.'
};

let file = fileURLToPath(import.meta.url);
watchFile(file, () => {
  unwatchFile(file);
  import(`${file}?update=${Date.now()}`);
});
