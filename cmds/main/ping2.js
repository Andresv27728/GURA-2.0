export default {
  command: ['ping2', 'speed2', 'p2', 'latency2', 'sys2', 'status2'],
  category: 'main',
  run: async ({ msg, sock }) => {

    await sock.sendMessage(msg.chat, { react: { text: '🕐', key: msg.key } })

    const { performance } = await import('perf_hooks')
    const os = await import('os')
    const { execSync } = await import('child_process')

    const execStart = performance.now()

    const fmtSize = (b) => {
      if (!b || b === 0) return '0 B'
      const u = ['B', 'KB', 'MB', 'GB', 'TB']
      const i = Math.floor(Math.log(b) / Math.log(1024))
      return (b / Math.pow(1024, i)).toFixed(1) + ' ' + u[i]
    }

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

    const getNetwork = () => {
      try {
        const ifaces = os.networkInterfaces()
        let active = 'N/A'
        for (const [name, addrs] of Object.entries(ifaces)) {
          if (name.toLowerCase().includes('lo')) continue
          for (const a of addrs) {
            if (a.family === 'IPv4' && !a.internal) {
              active = name
              break
            }
          }
        }
        return { iface: active }
      } catch {
        return { iface: 'N/A' }
      }
    }

    const t0 = msg?.messageTimestamp ? msg.messageTimestamp * 1000 : Date.now()
    const waRoundtrip = Math.max(1, Date.now() - t0)

    const cpus = os.cpus()
    const totalMem = os.totalmem()
    const freeMem = os.freemem()
    const cpuPct = Math.max(1, Math.min(100, (os.loadavg()[0] / cpus.length) * 100)).toFixed(1)

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

    const heap = process.memoryUsage()
    const net = getNetwork()
    const totalExec = Math.round(performance.now() - execStart)

    const botId = sock.user?.id?.split(':')[0] + '@s.whatsapp.net'
    const namebot = global.db?.data?.settings?.[botId]?.namebot || 'Hory'

    const tableData = [
      ['WA Roundtrip', `${waRoundtrip} ms`],
      ['Velocidad de respuesta del bot', `${totalExec} ms`],
      ['Estado', 'En línea'],
      ['Hostname', os.hostname()],
      ['Plataforma', `${os.platform()} ${os.arch()}`],
      ['Node', process.version],
      ['CPU', `${cpus[0]?.model?.slice(0, 25)}`],
      ['Núcleos', `${cpus.length}`],
      ['Carga CPU', `${cpuPct}%`],
      ['RAM', `${fmtSize(totalMem - freeMem)} / ${fmtSize(totalMem)}`],
      ['Heap', `${fmtSize(heap.heapUsed)} / ${fmtSize(heap.heapTotal)}`],
      ['Disco', `${fmtSize(diskUsed)} / ${fmtSize(diskTotal)}`],
      ['Red', net.iface],
      ['Uptime Bot', fmtUp(process.uptime())],
      ['Uptime Servidor', fmtUp(os.uptime())],
    ]

    await sock.sendTable(msg.chat, '⚡ Rendimiento del sistema', ['Métrica', 'Valor'], tableData, msg, {
      headerText: `${namebot} *ESTADO*\n\n- 🎄 Abajo están las estadísticas de nuestro bot`,
      footer: '🍃 Monitoreo en tiempo real',
    })

    await sock.sendMessage(msg.chat, { react: { text: '✅', key: msg.key } })

  }
}
