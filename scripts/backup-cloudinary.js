// RealEstate CRM — Backup Cloudinary Assets
// node scripts/backup-cloudinary.js
const fs = require('fs')
const path = require('path')
const cloudinary = require('cloudinary').v2

// Resolver paths relativos al script
const scriptDir = __dirname
const projectRoot = path.resolve(scriptDir, '..')
const backupDir = path.join(projectRoot, 'backups')

// Cargar .env del backend
const envPath = path.join(projectRoot, 'backend', '.env')
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8')
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIdx = trimmed.indexOf('=')
    if (eqIdx === -1) continue
    const key = trimmed.slice(0, eqIdx).trim()
    let value = trimmed.slice(eqIdx + 1).trim()
    // Sacar comillas si existen
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    process.env[key] = value
  }
}

// Verificar config de Cloudinary
const cloudName = process.env.CLOUDINARY_CLOUD_NAME
const apiKey = process.env.CLOUDINARY_API_KEY
const apiSecret = process.env.CLOUDINARY_API_SECRET

if (!cloudName || !apiKey || !apiSecret) {
  console.error('❌ Cloudinary no configurado. Verificá CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY y CLOUDINARY_API_SECRET en backend/.env')
  process.exit(1)
}

cloudinary.config({
  cloud_name: cloudName,
  api_key: apiKey,
  api_secret: apiSecret
})

// Crear carpeta backups si no existe
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true })
  console.log(`📁 Created backups directory: ${backupDir}`)
}

async function listAllAssets() {
  const assets = []
  let nextCursor = null

  do {
    const result = await cloudinary.api.resources({
      max_results: 500,
      next_cursor: nextCursor,
      resource_type: 'image'
    })

    for (const asset of result.resources) {
      assets.push({
        public_id: asset.public_id,
        url: asset.secure_url,
        format: asset.format,
        tags: asset.tags || [],
        created_at: asset.created_at,
        bytes: asset.bytes
      })
    }

    console.log(`  Listed ${assets.length} assets so far...`)
    nextCursor = result.next_cursor
  } while (nextCursor)

  return assets
}

async function main() {
  console.log('☁️ Iniciando backup de Cloudinary...')

  try {
    const assets = await listAllAssets()

    const timestamp = new Date().toISOString().split('T')[0]
    const outputFile = path.join(backupDir, `cloudinary_backup_${timestamp}.json`)

    fs.writeFileSync(outputFile, JSON.stringify(assets, null, 2), 'utf-8')

    const sizeKB = (fs.statSync(outputFile).size / 1024).toFixed(1)
    console.log(`✅ Backup completado: ${assets.length} assets`)
    console.log(`  Path: ${outputFile}`)
    console.log(`  Size: ${sizeKB} KB`)
  } catch (error) {
    console.error('❌ Error durante el backup de Cloudinary:', error.message)
    process.exit(1)
  }
}

main()
