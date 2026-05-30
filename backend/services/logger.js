// Logger Estructurado — Pino
// JSON en producción, pretty-print en desarrollo
const pino = require('pino')

const isDev = process.env.NODE_ENV !== 'production'

const logger = pino({
  level: process.env.LOG_LEVEL || (isDev ? 'debug' : 'info'),
  ...(isDev
    ? {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:yyyy-mm-dd HH:MM:ss',
            ignore: 'pid,hostname'
          }
        }
      }
    : {}),
  timestamp: pino.stdTimeFunctions.isoTime,
  base: { env: process.env.NODE_ENV || 'development' }
})

module.exports = logger
