export default {
  command: ['ping2', 'speed2', 'p2', 'latency2', 'sys2', 'status2'],
  category: 'main',
  run: async ({ msg, sock }) => {

    await sock.sendMessage(msg.chat, { react: { text: '🕐', key: msg.key } })

    const { performance } = await import('perf_hooks')
    const os = await import('os')
    const { execSync } = await import('child_process')

    const execStart = performance.now()

    // ================= FORMATO BYTES =================
    const fmtSize = (b) => {
      if (!b || b === 0) return '0 B'
      const u = ['B', 'KB', 'MB', 'GB', 'TB']
      const i = Math.floor(Math.log(b) / Math.log(1024))
      return (b / Math.pow(1024, i)).toFixed(1) + ' ' + u[i]
    }

    // ================= FORMATO UPTIME =================
    const fmtUp = (s) => {
      s = Number(s)
      const d = Math.floor(s / 86400)
      const h = Math.floor((s % 86400) / 3600)
      const m = Math.floor((s % 3600) / 60)
      const sc = Math.floor(s % 60)
      if (d > 0) return `${d}d ${h}h ${m}m`
      if (h > 0) return `${h}h ${m}m ${sc}s`
      return `${m}m ${sc}s`
    }

    // ================= RED =================
    const getNetwork = () => {
      try {
        const ifaces = os.networkInterfaces()
        for (const [name, addrs] of Object.entries(ifaces)) {
          if (name.toLowerCase().includes('lo')) continue
          for (const a of addrs) {
            if (a.family === 'IPv4' && !a.internal) return name
          }
        }
        return 'N/A'
      } catch { return 'N/A' }
    }

    // ================= WA ROUNDTRIP =================
    const t0 = msg?.messageTimestamp ? msg.messageTimestamp * 1000 : Date.now()
    const waRoundtrip = Math.max(1, Date.now() - t0)

    // ================= CPU =================
    const cpus = os.cpus()
    const cpuPct = Math.max(1, Math.min(100, (os.loadavg()[0] / cpus.length) * 100)).toFixed(1)

    // ================= MEMORIA =================
    const totalMem = os.totalmem()
    const freeMem = os.freemem()
    const heap = process.memoryUsage()

    // ================= DISCO =================
    let diskTotal = 0, diskUsed = 0
    try {
      if (process.platform === 'win32') {
        const w = execSync("wmic logicaldisk where \"DeviceID='C:'\" get Size,FreeSpace /format:value", { encoding: 'utf-8' })
        const fm = w.match(/FreeSpace=(\d+)/)
        const sm = w.match(/Size=(\d+)/)
        if (sm && fm) {
          diskTotal = parseInt(sm[1])
          diskUsed = diskTotal - parseInt(fm[1])
        }
      } else {
        const df = execSync('df -k --output=size,used /').toString().trim().split('\n')
        if (df.length > 1) {
          const p = df[1].trim().split(/\s+/).map(Number)
          if (p.length >= 2) {
            diskTotal = p[0] * 1024
            diskUsed = p[1] * 1024
          }
        }
      }
    } catch {}

    const netIface = getNetwork()
    const totalExec = Math.round(performance.now() - execStart)

    // ================= BARRA DE PROGRESO =================
    const bar = (val, max, len = 10) => {
      const filled = Math.round((Math.min(val, max) / max) * len)
      return '[' + '█'.repeat(filled) + '░'.repeat(len - filled) + ']'
    }

    const ramPct = ((totalMem - freeMem) / totalMem * 100).toFixed(1)
    const diskPct = diskTotal > 0 ? (diskUsed / diskTotal * 100).toFixed(1) : 0

    const botId = sock.user?.id?.split(':')[0] + '@s.whatsapp.net'
    const namebot = global.db?.data?.settings?.[botId]?.namebot || 'Hory'

    const response = `
╔══════════════════════════════╗
║   ⚡  ${namebot.toUpperCase()} SYSTEM MONITOR  ⚡   ║
╚══════════════════════════════╝

┌─────────────────────────────┐
│  📡  CONECTIVIDAD            │
└─────────────────────────────┘
 ├─ 🔁 WA Roundtrip  » ${waRoundtrip} ms
 └─ ⚡ Resp. Bot     » ${totalExec} ms

┌─────────────────────────────┐
│  🖥️  SERVIDOR                │
└─────────────────────────────┘
 ├─ ✅ Estado      » En linea
 ├─ 🏷️ Hostname    » ${os.hostname()}
 ├─ 🧩 Plataforma  » ${os.platform()} ${os.arch()}
 └─ 🟢 Node        » ${process.version}

┌─────────────────────────────┐
│  🧠  CPU                     │
└─────────────────────────────┘
 ├─ 🔧 Modelo   » ${cpus[0]?.model?.slice(0, 25)}
 ├─ 🧮 Nucleos  » ${cpus.length} cores
 └─ 📈 Carga    » ${cpuPct}% ${bar(parseFloat(cpuPct), 100)}

┌─────────────────────────────┐
│  💾  MEMORIA                 │
└─────────────────────────────┘
 ├─ 🧠 RAM   » ${fmtSize(totalMem - freeMem)} / ${fmtSize(totalMem)} ${bar(parseFloat(ramPct), 100)}
 └─ 📦 Heap  » ${fmtSize(heap.heapUsed)} / ${fmtSize(heap.heapTotal)}

┌─────────────────────────────┐
│  💿  DISCO                   │
└─────────────────────────────┘
 └─ 🗄️ Uso » ${fmtSize(diskUsed)} / ${fmtSize(diskTotal)} ${bar(parseFloat(diskPct), 100)}

┌─────────────────────────────┐
│  🌐  RED & UPTIME            │
└─────────────────────────────┘
 ├─ 📶 Interfaz        » ${netIface}
 ├─ 🚀 Uptime Bot      » ${fmtUp(process.uptime())}
 └─ 🖥️ Uptime Servidor » ${fmtUp(os.uptime())}

╔══════════════════════════════╗
║  🩺  SALUD DEL SISTEMA       ║
╠══════════════════════════════╣
║  ✅ Estado  » OPERATIVO       ║
║  📡 Monitor » EN TIEMPO REAL  ║
╠══════════════════════════════╣
║     © ${namebot} Assistant ✨          ║
╚══════════════════════════════╝
`.trim()

    await sock.sendMessage(msg.chat, { react: { text: '✅', key: msg.key } })
    await sock.sendMessage(msg.chat, { text: response }, { quoted: msg })

  }
}
