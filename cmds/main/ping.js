export default {
  command: ['ping', 'statusbot', 'botstatus', 'p'],
  category: 'main',
  run: async ({ msg, sock }) => {

    await sock.sendMessage(msg.chat, { react: { text: '⏳', key: msg.key } })

    const { performance } = await import('perf_hooks')
    const os = await import('os')
    const fs = await import('fs')
    const moment = (await import('moment-timezone')).default
    const axios = (await import('axios')).default

    const startProcess = performance.now()

    // ================= FORMATO DE BYTES =================
    const formatp = (bytes) => {
      if (bytes >= 1073741824) return (bytes / 1073741824).toFixed(2) + ' GB'
      if (bytes >= 1048576) return (bytes / 1048576).toFixed(2) + ' MB'
      if (bytes >= 1024) return (bytes / 1024).toFixed(2) + ' KB'
      return bytes + ' B'
    }

    // ================= INTERNET PING =================
    const getRealPing = async () => {
      const start = performance.now()
      try {
        await axios.get('https://www.google.com', { timeout: 5000 })
        return performance.now() - start
      } catch {
        return null
      }
    }
    const realPing = await getRealPing()

    // ================= LATENCIA =================
    const getLatency = async () => {
      const start = performance.now()
      await new Promise(r => setTimeout(r, 50))
      return performance.now() - start
    }
    const latency = await getLatency()

    // ================= OS INFO =================
    let osName = 'Unknown OS'
    try {
      if (process.platform === 'linux' && fs.existsSync('/etc/os-release')) {
        const osInfo = fs.readFileSync('/etc/os-release', 'utf8')
        const name = osInfo.match(/^NAME="?(.+?)"?$/m)?.[1] || ''
        const ver = osInfo.match(/^VERSION="?(.+?)"?$/m)?.[1] || ''
        osName = `${name} ${ver}`.trim()
      } else if (process.platform === 'win32') osName = 'Windows'
      else if (process.platform === 'darwin') osName = 'macOS'
      else osName = os.type()
    } catch {
      osName = os.type()
    }

    // ================= UPTIME =================
    const runtimeFormat = (seconds) => {
      const d = Math.floor(seconds / 86400)
      const h = Math.floor(seconds % 86400 / 3600)
      const m = Math.floor(seconds % 3600 / 60)
      const s = Math.floor(seconds % 60)
      return `${d}d ${h}h ${m}m ${s}s`
    }

    // ================= CPU =================
    const getCpuUsage = async (delay = 800) => {
      const start = os.cpus()
      await new Promise(r => setTimeout(r, delay))
      const end = os.cpus()
      let idle = 0, total = 0
      for (let i = 0; i < start.length; i++) {
        for (let t in start[i].times) {
          total += end[i].times[t] - start[i].times[t]
        }
        idle += end[i].times.idle - start[i].times.idle
      }
      return 100 - Math.round((idle / total) * 100)
    }
    const cpuUsagePercent = await getCpuUsage()

    const cpus = os.cpus()
    const cpuModel = cpus[0]?.model || 'Unknown CPU'
    const cpuCore = cpus.length
    const avgSpeed = cpus.reduce((a, c) => a + c.speed, 0) / cpuCore

    // ================= MEMORIA =================
    const mem = os.totalmem()
    const free = os.freemem()

    let swapTotal = 0, swapFree = 0
    if (fs.existsSync('/proc/meminfo')) {
      const info = fs.readFileSync('/proc/meminfo', 'utf8')
      swapTotal = parseInt(info.match(/^SwapTotal:\s+(\d+)/m)?.[1] || 0) * 1024
      swapFree = parseInt(info.match(/^SwapFree:\s+(\d+)/m)?.[1] || 0) * 1024
    }

    const totalMemAll = mem + swapTotal
    const usedMemAll = (mem - free) + (swapTotal - swapFree)
    const percentUsed = ((usedMemAll / totalMemAll) * 100).toFixed(1)

    const memoryIcon =
      percentUsed >= 85 ? '🔴' :
      percentUsed >= 50 ? '🟡' : '🟢'

    const memoryStatus =
      percentUsed >= 85 ? 'CRITICAL' :
      percentUsed >= 50 ? 'NORMAL' : 'GOOD'

    // ================= TIEMPO =================
    const runtimeText = runtimeFormat(process.uptime())
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
    const waktu = moment().tz(tz).format('HH:mm:ss')
    const tanggal = moment().tz(tz).locale('es').format('dddd, D MMMM YYYY')

    // ================= TIEMPOS DE RESPUESTA =================
    const messageTimestamp = msg?.messageTimestamp || Math.floor(Date.now() / 1000)
    const userToBot = Date.now() - messageTimestamp * 1000
    const botToUser = performance.now() - startProcess
    const totalResponse = userToBot + botToUser

    // ================= CALIDAD DE RED =================
    const pingForQuality = realPing ?? latency
    const pingIcon =
      pingForQuality >= 300 ? '🔴' :
      pingForQuality >= 150 ? '🟡' : '🟢'

    const networkQuality =
      pingForQuality < 150 ? 'EXCELLENT' :
      pingForQuality < 300 ? 'GOOD' :
      pingForQuality < 400 ? 'BAD' : 'CRITICAL'

    const networkStatus = `${pingIcon} ${networkQuality}`

    const cpuLoad =
      cpuUsagePercent < 40 ? 'LOW LOAD' :
      cpuUsagePercent < 70 ? 'NORMAL LOAD' : 'HIGH LOAD'

    // ================= CHART =================
    const pingMs = realPing ? Math.round(realPing) : 0
    const maxPing = 950
    const safePing = Math.min(pingMs, maxPing)

    const imgChart = `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify({
      type: 'gauge',
      data: {
        datasets: [{
          value: safePing,
          data: [150, 300, 500],
          backgroundColor: ['#2ECC71', '#F1C40F', '#E74C3C'],
          borderWidth: 2
        }],
        labels: ['Normal', 'Warning', 'Critical']
      },
      options: {
        responsive: true,
        title: { display: true, text: 'HORY ASISTENTE' },
        needle: {
          radiusPercentage: 2,
          widthPercentage: 3,
          lengthPercentage: 80,
          color: '#000'
        },
        valueLabel: {
          formatter: null,
          color: '#000',
          fontSize: 28,
          backgroundColor: 'transparent',
          bottomMarginPercentage: 10
        },
        plugins: {
          datalabels: {
            display: true,
            color: '#fff',
            font: { size: 14, weight: 'bold' }
          }
        }
      }
    }))}`

    // ================= NOMBRE DEL BOT =================
    const botId = sock.user?.id?.split(':')[0] + '@s.whatsapp.net'
    const namebot = global.db?.data?.settings?.[botId]?.namebot || 'Hory'

    // ================= RESPUESTA =================
    const response = `
*ESTADO DE ${namebot.toUpperCase()}*
*MONITOR DEL SISTEMA*

📡 *ESTADO DE RED*
━━━━━━━━━━━━━━━━━━━━━━
📶 Ping a Internet     : ${realPing ? Math.round(realPing) + ' ms' : 'N/D'}
⏳ Latencia interna    : ${latency.toFixed(2)} ms
⚡ Respuesta total     : ${totalResponse.toFixed(2)} ms
📊 Calidad de red      : ${networkStatus}

⏱️ *TIEMPO ACTIVO*
━━━━━━━━━━━━━━━━━━━━━━
🚀 Uptime              : ${runtimeText}

🖥️ *ENTORNO DEL SERVIDOR*
━━━━━━━━━━━━━━━━━━━━━━
💻 SO                  : ${osName}
🧩 Plataforma          : ${os.platform()}
🏷️ Hostname            : ${os.hostname()}
🌍 Zona horaria        : ${Intl.DateTimeFormat().resolvedOptions().timeZone}

🧠 *RENDIMIENTO CPU*
━━━━━━━━━━━━━━━━━━━━━━
🔧 Modelo              : ${cpuModel}
🧮 Núcleos             : ${cpuCore}
⚙️ Velocidad prom.     : ${avgSpeed.toFixed(0)} MHz
📈 Uso                 : ${cpuUsagePercent} %
🔥 Estado de carga     : ${cpuLoad}

💾 *MEMORIA*
━━━━━━━━━━━━━━━━━━━━━━
📥 Memoria usada       : ${formatp(usedMemAll)}
📦 Memoria total       : ${formatp(totalMemAll)}
📉 Utilización         : ${percentUsed} %
🧠 Estado              : ${memoryIcon} ${memoryStatus}

📅 *FECHA Y HORA*
━━━━━━━━━━━━━━━━━━━━━━
🗓️ Fecha               : ${tanggal}
⏰ Hora                : ${waktu}

━━━━━━━━━━━━━━━━━━━━━━
🩺 *SALUD DEL SISTEMA*
🟢 Estado              : ${pingIcon} OPERATIVO
📡 Monitoreo           : EN TIEMPO REAL
━━━━━━━━━━━━━━━━━━━━━━

© Hory Assistant ✨
`.trim()

    await sock.sendMessage(msg.chat, { react: { text: '✅', key: msg.key } })

    await sock.sendMessage(msg.chat, {
      text: response,
      contextInfo: {
        externalAdReply: {
          title: `${namebot.toUpperCase()} • MONITOR DEL SISTEMA`,
          body: `Ping ${pingMs}ms | CPU ${cpuUsagePercent}% | RAM ${percentUsed}%`,
          thumbnailUrl: imgChart,
          sourceUrl: 'https://whatsapp.com/channel/0029Val9ZCp1SWszvD7jUx1B',
          mediaType: 1,
          renderLargerThumbnail: true
        }
      }
    }, { quoted: msg })

  }
}
