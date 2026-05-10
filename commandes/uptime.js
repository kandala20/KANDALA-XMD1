const { zokou } = require(__dirname + "/../framework/zokou");
const moment = require("moment-timezone");
const os = require("os");
const set = require(__dirname + "/../set");

moment.tz.setDefault("" + set.TZ);

zokou(
  {
    nomCom: "uptime",
    categorie: "General",
    reaction: "⏱️"
  },
  async (origineMessage, zk, commandOptions) => {
    const { ms } = commandOptions;

    // Calculate bot uptime
    const uptimeSeconds = process.uptime();
    const days = Math.floor(uptimeSeconds / 86400);
    const hours = Math.floor((uptimeSeconds % 86400) / 3600);
    const minutes = Math.floor((uptimeSeconds % 3600) / 60);
    const seconds = Math.floor(uptimeSeconds % 60);

    // Current date and time
    const now = moment();
    const date = now.format("DD/MM/YYYY");
    const time = now.format("HH:mm:ss");

    // System info
    const totalMemory = (os.totalmem() / (1024 ** 3)).toFixed(2);
    const freeMemory = (os.freemem() / (1024 ** 3)).toFixed(2);
    const cpuCores = os.cpus().length;

    const uptimeText = `╭━━━〔 *UPTIME INFO* 〕━━━┈
┃ ⏱️ *Bot Uptime:* ${days}d ${hours}h ${minutes}m ${seconds}s
┃ 📅 *Date:* ${date}
┃ ⏰ *Time:* ${time}
┃ 💻 *Platform:* ${os.platform()} ${os.arch()}
┃ 🧠 *CPU Cores:* ${cpuCores}
┃ 💾 *RAM:* ${freeMemory}GB / ${totalMemory}GB
┃ 🤖 *Node Version:* ${process.version}
╰━━━━━━━━━━━┈

✅ *Bot is running smoothly!*`;

    try {
      await zk.sendMessage(origineMessage, {
        text: uptimeText,
        contextInfo: {
          isForwarded: true,
          forwardingScore: 999,
          externalAdReply: {
            title: "📊 BOT UPTIME",
            body: `Active for ${days}d ${hours}h ${minutes}m`,
            thumbnailUrl: "https://raw.githubusercontent.com/kandala20/KANDALA-XMD1/main/media/kandala.jpg",
            mediaType: 1,
            renderSmallThumbnail: true
          }
        }
      }, { quoted: ms });
    } catch (error) {
      console.log("Uptime command error:", error);
      await zk.sendMessage(origineMessage, { text: "❌ Uptime command error!" }, { quoted: ms });
    }
  }
);
