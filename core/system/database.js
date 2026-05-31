import path from 'path'
import fs from 'fs'
import _ from 'lodash'

const dbFile = path.join(process.cwd(), 'core', 'database.json')
const isNumber = (x) => typeof x === 'number' && !isNaN(x)

export function initDB(m, sock) {
  const jid = sock.user.id.split(':')[0] + '@s.whatsapp.net'
  const settings = global.db.data.settings[jid] ||= {}
  settings.self ??= false
  settings.prefix ??= ['/', '!', '.', '#']
  settings.commandsejecut ??= isNumber(settings.commandsejecut) ? settings.commandsejecut : 0
  settings.newsletter_id ??= '120363401404146384@newsletter'
  settings.nameid ??= 'ೃ࿔ ყµҡเ ωαɓσƭร - σƒƒเ૮เαℓ ૮ɦαɳɳεℓ .ೃ࿐'
  settings.type ??= 'Owner'
  settings.link ??= 'https://api.yuki-wabot.my.id'
  settings.banner ??= 'https://cdn.yuki-wabot.my.id/files/tCVD.jpeg'
  settings.icon ??= 'https://cdn.yuki-wabot.my.id/files/4U5V.jpeg'
  settings.currency ??= 'Yenes'
  settings.namebot ??= 'Yuki'
  settings.botname ??= 'Yuki Suou'
  settings.owner ??= ''
  const user = global.db.data.users[m.sender] ||= {}
  user.name ??= m.pushName
  user.exp = isNumber(user.exp) ? user.exp : 0
  user.level = isNumber(user.level) ? user.level : 0
  user.usedcommands = isNumber(user.usedcommands) ? user.usedcommands : 0
  user.pasatiempo ??= ''
  user.description ??= ''
  user.marry ??= ''
  user.genre ??= ''
  user.birth ??= ''
  user.metadatos ??= null
  user.metadatos2 ??= null
  const chat = global.db.data.chats[m.chat] ||= {}
  chat.users ||= {}
  chat.isBanned ??= false
  chat.welcome ??= false
  chat.goodbye ??= false
  chat.sWelcome ??= ''
  chat.sGoodbye ??= ''
  chat.nsfw ??= false
  chat.alerts ??= true
  chat.gacha ??= true
  chat.economy ??= true
  chat.adminonly ??= false
  chat.primaryBot ??= null
  chat.antilinks ??= true
  chat.antistatus ??= false
  chat.rolls ??= {}
  chat.users[m.sender] ||= {}
  chat.users[m.sender].stats ||= {}
  chat.users[m.sender].usedTime ??= null
  chat.users[m.sender].lastCmd = isNumber(chat.users[m.sender].lastCmd) ? chat.users[m.sender].lastCmd : 0
  chat.users[m.sender].coins = isNumber(chat.users[m.sender].coins) ? chat.users[m.sender].coins : 0
  chat.users[m.sender].bank = isNumber(chat.users[m.sender].bank) ? chat.users[m.sender].bank : 0
  chat.users[m.sender].afk = isNumber(chat.users[m.sender].afk) ? chat.users[m.sender].afk : -1
  chat.users[m.sender].afkReason ??= ''
  chat.users[m.sender].health = isNumber(chat.users[m.sender].health) ? chat.users[m.sender].health : 100
  chat.users[m.sender].stamina = isNumber(chat.users[m.sender].stamina) ? chat.users[m.sender].stamina : 100
  chat.users[m.sender].magic = isNumber(chat.users[m.sender].magic) ? chat.users[m.sender].magic : 100
  chat.users[m.sender].characters = Array.isArray(chat.users[m.sender].characters) ? chat.users[m.sender].characters : []
}

global.db = {
  data: {
    users: {},
    chats: {},
    settings: {},
    characters: {},
    stickerspack: {},
    tokens: {}
  },
  chain: null,
  READ: false,
  _snapshot: '{}'
}
global.DATABASE = global.db

global.loadDatabase = function loadDatabase() {
  if (global.db.READ) return global.db.data
  global.db.READ = true
  if (fs.existsSync(dbFile)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(dbFile, 'utf8'))
      global.db.data = Object.assign(global.db.data, parsed)
    } catch {}
  }
  global.db.chain = _.chain(global.db.data)
  global.db.READ = false
  global.db._snapshot = JSON.stringify(global.db.data)
  return global.db.data
}

function hasPendingChanges() {
  return global.db._snapshot !== JSON.stringify(global.db.data)
}

global.saveDatabase = function saveDatabase() {
  if (!hasPendingChanges()) return
  fs.writeFileSync(dbFile, JSON.stringify(global.db.data, null, 2))
  global.db._snapshot = JSON.stringify(global.db.data)
}

let lastSave = Date.now()
setInterval(() => {
  const now = Date.now()
  if (now - lastSave >= 1000 && hasPendingChanges()) {
    global.saveDatabase()
    lastSave = now
  }
}, 500)

export default global.db