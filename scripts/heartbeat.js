// Heartbeat — Monitoreo periódico de health check
//
// Uso:
//   node scripts/heartbeat.js                          # cada 5 min
//   node scripts/heartbeat.js --interval 30000          # cada 30s
//   HEARTBEAT_URL=http://prod:3001/api/health node scripts/heartbeat.js
//
// Log exitoso → stdout, log fallido → stderr

const http = require('http')
const https = require('https')

const INTERVAL = parseInt(
  process.argv.find(a => a.startsWith('--interval='))?.split('=')[1] ||
  process.argv[process.argv.indexOf('--interval') + 1] ||
  300000,
  10
)

const TARGET = process.env.HEARTBEAT_URL || 'http://localhost:3001/api/health'

function timestamp() {
  return new Date().toISOString()
}

function tick() {
  const start = Date.now()

  const requester = TARGET.startsWith('https') ? https : http

  requester.get(TARGET, (res) => {
    let data = ''
    res.on('data', chunk => { data += chunk })
    res.on('end', () => {
      const elapsed = Date.now() - start
      try {
        const health = JSON.parse(data)
        if (health.status === 'ok') {
          console.log(`[${timestamp()}] Heartbeat OK (${elapsed}ms)`)
        } else {
          console.error(`[${timestamp()}] Heartbeat DEGRADED:`, JSON.stringify(health))
        }
      } catch {
        console.error(`[${timestamp()}] Heartbeat FAIL - invalid response (${elapsed}ms)`)
      }
    })
  }).on('error', (err) => {
    console.error(`[${timestamp()}] Heartbeat FAIL - ${err.message}`)
  })
}

console.log(`[${timestamp()}] Heartbeat started — interval: ${INTERVAL}ms, target: ${TARGET}`)
tick()
setInterval(tick, INTERVAL)
