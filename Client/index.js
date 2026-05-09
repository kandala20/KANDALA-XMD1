const {
  default: feeConnect,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeInMemoryStore,
  downloadContentFromMessage,
  jidDecode,
  proto,
  getContentType,
  makeCacheableSignalKeyStore,
  Browsers,
  generateWAMessageContent,
  generateWAMessageFromContent
} = require("@whiskeysockets/baileys");

const pino = require("pino");
const { Boom } = require("@hapi/boom");
const fs = require("fs");
const FileType = require("file-type");
const { exec, spawn, execSync } = require("child_process");
const axios = require("axios");
const chalk = require("chalk");
const figlet = require("figlet");
const express = require("express");
const app = express();
const port = process.env.PORT || 10000;
const _ = require("lodash");
const PhoneNumber = require("awesome-phonenumber");
const { imageToWebp, videoToWebp, writeExifImg, writeExifVid } = require('../lib/exif');
const { isUrl, generateMessageTag, getBuffer, getSizeMedia, fetchJson, await, sleep } = require('../lib/botFunctions');
const store = makeInMemoryStore({ logger: pino().child({ level: "silent", stream: "store" }) });

const authenticationn = require('../Auth/auth.js');
const { smsg } = require('../Handler/smsg');
const { getSettings, getBannedUsers, banUser } = require("../Database/config");

const { botname } = require('../Env/settings');
const { DateTime } = require('luxon');
const { commands, totalCommands } = require('../Handler/commandHandler');
authenticationn();

const path = require('path');

const sessionName = path.join(__dirname, '..', 'Session');

const groupEvents = require("../Handler/eventHandler");
const groupEvents2 = require("../Handler/eventHandler");
const connectionHandler = require('../Handler/connectionHandler');
const antidelete = require('../Functions/antidelete');
const antilink = require('../Functions/antilink');
const antistatusmention = require('../Functions/antistatusmention');

//const initializeScheduler = require('../Handler/gautoscheduler');
// client.on('ready', () => initializeScheduler(client));

function cleanupSessionFiles() {
    try {
        if (!fs.existsSync(sessionName)) return;

        const files = fs.readdirSync(sessionName);
        const keepFiles = ['creds.json', 'app-state-sync-version.json', 'pre-key-', 'session-', 'sender-key-', 'app-state-sync-key-'];

        files.forEach(file => {
            const filePath = path.join(sessionName, file);
            const stats = fs.statSync(filePath);

            const shouldKeep = keepFiles.some(pattern => {
                if (pattern.endsWith('-')) return file.startsWith(pattern);
                return file === pattern;
            });

            if (!shouldKeep) {
                const fileAge = Date.now() - stats.mtimeMs;
                const hoursOld = fileAge / (1000 * 60 * 60);

                if (hoursOld > 24) {
                    fs.unlinkSync(filePath);
                    console.log(`🗑️ Cleaned up old file: ${file}`);
                }
            }
        });
    } catch (error) {
        console.error('❌ Session cleanup error:', error.message);
    }
}

async function startFee() {
  setInterval(cleanupSessionFiles, 24 * 60 * 60 * 1000);
  cleanupSessionFiles();

  let settingss = await getSettings();
  if (!settingss) {
    console.log(`❌ FEE-XMD FAILED TO CONNECT - Settings not found`);
    return;
  }

  const { autobio, mode, anticall } = settingss;
  const { version } = await fetchLatestBaileysVersion();

  const { saveCreds, state } = await useMultiFileAuthState(sessionName);

  const client = feeConnect({
    printQRInTerminal: false,
    syncFullHistory: true,
    markOnlineOnConnect: false,
    connectTimeoutMs: 60000,
    defaultQueryTimeoutMs: 0,
    keepAliveIntervalMs: 10000,
    generateHighQualityLinkPreview: true,
    patchMessageBeforeSending: (message) => {
      const requiresPatch = !!(
        message.buttonsMessage ||
        message.templateMessage ||
        message.listMessage
      );
      if (requiresPatch) {
        message = {
          viewOnceMessage: {
            message: {
              messageContextInfo: {
                deviceListMetadataVersion: 2,
                deviceListMetadata: {},
              },
              ...message,
            },
          },
        };
      }
      return message;
    },
    version: (await (await fetch('https://raw.githubusercontent.com/WhiskeySockets/Baileys/master/src/Defaults/baileys-version.json')).json()).version,
    browser: ["Ubuntu", 'Chrome', "20.0.04"],
    logger: pino({ level: 'silent' }),
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, pino().child({ level: "silent", stream: 'store' }))
    }
  });

  store.bind(client.ev);

  setInterval(() => {
    store.writeToFile("store.json");
  }, 3000);

  if (autobio) {
    setInterval(() => {
      const date = new Date();
      client.updateProfileStatus(
        `${botname} 𝐢𝐬 𝐚𝐜𝐭𝐢𝐯𝐞 𝟐𝟒/𝟕\n\n${date.toLocaleString('en-US', { timeZone: 'Africa/Nairobi' })} 𝐈𝐭'𝐬 𝐚 ${date.toLocaleString('en-US', { weekday: 'long', timeZone: 'Africa/Nairobi' })}.`
      );
    }, 10 * 1000);
  }

  const processedCalls = new Set();

  client.ws.on('CB:call', async (json) => {
    const settingszs = await getSettings();
    if (!settingszs?.anticall) return;

    const callId = json.content[0].attrs['call-id'];
    const callerJid = json.content[0].attrs['call-creator'];

    const isGroupCall = callerJid.endsWith('@g.us');
    if (isGroupCall) return;

    const callerNumber = callerJid.replace(/[@.a-z]/g, "");

    if (processedCalls.has(callId)) {
      return;
    }
    processedCalls.add(callId);

    const fakeQuoted = {
      key: {
        participant: '0@s.whatsapp.net',
        remoteJid: '0@s.whatsapp.net',
        id: callId
      },
      message: {
        conversation: "Verified"
      },
      contextInfo: {
        mentionedJid: [callerJid],
        forwardingScore: 999,
        isForwarded: true
      }
    };

    await client.rejectCall(callId, callerJid);
    await client.sendMessage(callerJid, {
      text: "> Calling without permission is highly prohibited ⚠️!"
    }, { quoted: fakeQuoted });

    const bannedUsers = await getBannedUsers();
    if (!bannedUsers.includes(callerNumber)) {
      await banUser(callerNumber);
    }
  });

  const processedStatusMessages = new Set();

  client.ev.on("messages.upsert", async ({ messages, type }) => {
    if (type !== "notify") return;

    let settings = await getSettings();
    if (!settings) return;

    const { autoread, autolike, autoview, presence, autolikeemoji } = settings;

    let mek = messages[0];
    if (!mek || !mek.key) return;

    const remoteJid = mek.key.remoteJid;
    const sender = client.decodeJid(mek.key.participant || mek.key.remoteJid);

    if (remoteJid === "status@broadcast") {
      if (autolike && mek.key) {
        try {
          let reactEmoji = autolikeemoji || 'random';

          if (reactEmoji === 'random') {
            const emojis = ['❤️', '👍', '🔥', '😍', '👏', '🎉', '🤩', '💯', '✨', '🌟'];
            reactEmoji = emojis[Math.floor(Math.random() * emojis.length)];
          }

          const nickk = client.decodeJid(client.user.id);

          await client.sendMessage(mek.key.remoteJid, { 
            react: { 
              text: reactEmoji, 
              key: mek.key 
            } 
          }, { statusJidList: [mek.key.participant, nickk] });
        } catch (sendError) {
          try {
            await client.sendMessage(mek.key.remoteJid, { 
              react: { 
                text: reactEmoji, 
                key: mek.key 
              } 
            });
          } catch (error2) {
            console.error('❌ [AUTOLIKE] Failed to react:', error2.message);
          }
        }
      }
      
      
// Add near the top with other requires
//const { getAllGroupsWithAutoSettings } = require('./Database/config');

// Add after bot is ready
//client.on('ready', async () => {
 //   console.log('🤖 Bot is ready!');
    
    // Start all group schedulers
  /*  const groups = await getAllGroupsWithAutoSettings();
    groups.forEach(group => {
        if (group.autoEnabled) {
            // Start scheduler for each group
            startGroupScheduler(client, group.jid);
        }
    });
    
    console.log(`⏰ Started schedulers for ${groups.length} groups`);
});

// Helper function to start scheduler for a group
const groupTimers = global.groupTimers || new Map();
global.groupTimers = groupTimers;

function startGroupScheduler(client, groupId) {
    // Clear existing timer
    if (groupTimers.has(groupId)) {
        clearInterval(groupTimers.get(groupId));
    }
    
    // Start new timer for this group
    const timer = setInterval(async () => {
        try {
            const { getGroupTime } = require('./Database/config');
            const timeData = await getGroupTime(groupId, 'all');
            if (!timeData) return;
            
            const now = new Date();
            const currentHour = now.getHours();
            const currentMinute = now.getMinutes();
            
            // Check open time
            if (timeData.openEnabled && timeData.openTime) {
                const [hours, minutes] = timeData.openTime.split(':').map(Number);
                if (currentHour === hours && currentMinute === minutes) {
                    await client.groupSettingUpdate(groupId, 'not_announcement');
                    await client.sendMessage(groupId, {
                        text: `❥┈┈┈┈┈┈┈┈┈┈┈┈┈┈➤\n✿ 🔓 Group opened automatically\n✿ ⏰ Time: ${timeData.openTime}\n✿ 🤖 Powered by FEE-XMD\n❥┈┈┈┈┈┈┈┈┈┈┈┈┈┈➤`
                    });
                    console.log(`✅ Opened group ${groupId} at ${timeData.openTime}`);
                }
            }
            
            // Check close time
            if (timeData.closeEnabled && timeData.closeTime) {
                const [hours, minutes] = timeData.closeTime.split(':').map(Number);
                if (currentHour === hours && currentMinute === minutes) {
                    await client.groupSettingUpdate(groupId, 'announcement');
                    await client.sendMessage(groupId, {
                        text: `❥┈┈┈┈┈┈┈┈┈┈┈┈┈┈➤\n✿ 🔒 Group closed automatically\n✿ ⏰ Time: ${timeData.closeTime}\n✿ 🤖 Powered by FEE-XMD\n❥┈┈┈┈┈┈┈┈┈┈┈┈┈┈➤`
                    });
                    console.log(`✅ Closed group ${groupId} at ${timeData.closeTime}`);
                }
            }
        } catch (error) {
            console.error(`Error in scheduler for ${groupId}:`, error.message);
        }
    }, 60000); // Check every minute
    
    groupTimers.set(groupId, timer);
}
    */  
      

      if (autoview) {
        try {
          await client.readMessages([mek.key]);

          setTimeout(async () => {
            try {
              await client.readMessages([mek.key]);
            } catch (error) {}
          }, 500);
        } catch (error) {
          console.error('❌ [AUTOVIEW] Failed to view:', error.message);
        }
      }

      return;
    }

    if (!mek.message) return;

    mek.message = Object.keys(mek.message)[0] === "ephemeralMessage" ? mek.message.ephemeralMessage.message : mek.message;

    await antilink(client, mek, store);

    if (autoread && remoteJid.endsWith('@s.whatsapp.net')) {
      try {
        await client.readMessages([mek.key]);
      } catch (error) {}
    }

    if (remoteJid.endsWith('@s.whatsapp.net')) {
      const Chat = remoteJid;
      if (presence === 'online') {
        try {
          await client.sendPresenceUpdate("available", Chat);
        } catch (error) {}
      } else if (presence === 'typing') {
        try {
          await client.sendPresenceUpdate("composing", Chat);
        } catch (error) {}
      } else if (presence === 'recording') {
        try {
          await client.sendPresenceUpdate("recording", Chat);
        } catch (error) {}
      } else {
        try {
          await client.sendPresenceUpdate("unavailable", Chat);
        } catch (error) {}
      }
    }

    if (!client.public && !mek.key.fromMe) return;

    try {
      m = smsg(client, mek, store);
      require("./kandala")(client, m, { type: "notify" }, store);
    } catch (error) {
      console.error('❌ [MESSAGE HANDLER] Error:', error.message);
    }
  });

  client.ev.on("messages.upsert", async ({ messages }) => {
    const msg = messages[0];
    if (!msg.message) return;

    if (msg.message.listResponseMessage) {
      const selectedCmd = msg.message.listResponseMessage.singleSelectReply.selectedRowId;

      const settings = await getSettings();
      const effectivePrefix = settings?.prefix || '.';

      let command = selectedCmd.startsWith(effectivePrefix)
        ? selectedCmd.slice(effectivePrefix.length).toLowerCase()
        : selectedCmd.toLowerCase();

      const m = {
        ...msg,
        body: selectedCmd,
        text: selectedCmd,
        command: command,
        prefix: effectivePrefix,
        sender: msg.key.remoteJid,
        from: msg.key.remoteJid,
        chat: msg.key.remoteJid,
        isGroup: msg.key.remoteJid.endsWith('@g.us')
      };

      try {
        require("./kandala")(client, m, { type: "notify" }, store);
      } catch (error) {
        console.error('❌ [LIST SELECTION] Error:', error.message);
      }
    }
  });

  client.ev.on("messages.update", async (updates) => {
    for (const update of updates) {
      if (update.key && update.key.remoteJid === "status@broadcast" && update.update.messageStubType === 1) {
        const settings = await getSettings();
        if (settings.autoview) {
          try {
            const mek = {
              key: update.key,
              message: {}
            };
            await client.readMessages([mek.key]);
          } catch (error) {}
        }
      }
    }
  });

  process.on("unhandledRejection", (reason, promise) => {
    console.error('❌ [UNHANDLED ERROR] Unhandled Rejection:', reason.message?.substring(0, 200) || reason);
  });

  client.decodeJid = (jid) => {
    if (!jid) return jid;
    if (/:\d+@/gi.test(jid)) {
      let decode = jidDecode(jid) || {};
      return (decode.user && decode.server && decode.user + "@" + decode.server) || jid;
    } else return jid;
  };

  client.getName = (jid, withoutContact = false) => {
    id = client.decodeJid(jid);
    withoutContact = client.withoutContact || withoutContact;
    let v;
    if (id.endsWith("@g.us"))
      return new Promise(async (resolve) => {
        v = store.contacts[id] || {};
        if (!(v.name || v.subject)) v = client.groupMetadata(id) || {};
        resolve(v.name || v.subject || PhoneNumber("+" + id.replace("@s.whatsapp.net", "")).getNumber("international"));
      });
    else
      v = id === "0@s.whatsapp.net"
        ? { id, name: "WhatsApp" }
        : id === client.decodeJid(client.user.id)
          ? client.user
          : store.contacts[id] || {};
    return (withoutContact ? "" : v.name) || v.subject || v.verifiedName || PhoneNumber("+" + jid.replace("@s.whatsapp.net", "")).getNumber("international");
  };

  client.public = true;

  client.serializeM = (m) => smsg(client, m, store);

  client.ev.on("group-participants.update", async (m) => {
    try {
      groupEvents(client, m);
      groupEvents2(client, m);
    } catch (error) {
      console.error('❌ [GROUP EVENT] Error:', error.message);
    }
  });

  let reconnectAttempts = 0;
  const maxReconnectAttempts = 5;
  const baseReconnectDelay = 5000;

  client.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect } = update;
    const reason = lastDisconnect?.error ? new Boom(lastDisconnect.error).output.statusCode : null;

    if (connection === "open") {
      reconnectAttempts = 0;
      console.log(`✅ [CONNECTION] Connected to WhatsApp successfully!`);
    }

    if (connection === "close") {
      if (reason === DisconnectReason.loggedOut || reason === 401) {
        await fs.rmSync(sessionName, { recursive: true, force: true });
        return startFee();
      }

      if (reconnectAttempts < maxReconnectAttempts) {
        const delay = baseReconnectDelay * Math.pow(2, reconnectAttempts);
        reconnectAttempts++;
        setTimeout(() => startFee(), delay);
      }
    }

    await connectionHandler(client, update, startFee);
  });

  client.ev.on("creds.update", saveCreds);

  client.sendText = (jid, text, quoted = "", options) => client.sendMessage(jid, { text: text, ...options }, { quoted });

  client.downloadMediaMessage = async (message) => {
    let mime = (message.msg || message).mimetype || '';
    let messageType = message.mtype ? message.mtype.replace(/Message/gi, '') : mime.split('/')[0];
    const stream = await downloadContentFromMessage(message, messageType);
    let buffer = Buffer.from([]);
    for await (const chunk of stream) {
      buffer = Buffer.concat([buffer, chunk]);
    }
    return buffer;
  };

  client.downloadAndSaveMediaMessage = async (message, filename, attachExtension = true) => {
    let quoted = message.msg ? message.msg : message;
    let mime = (message.msg || message).mimetype || '';
    let messageType = message.mtype ? message.mtype.replace(/Message/gi, '') : mime.split('/')[0];
    const stream = await downloadContentFromMessage(quoted, messageType);
    let buffer = Buffer.from([]);
    for await (const chunk of stream) {
      buffer = Buffer.concat([buffer, chunk]);
    }
    let type = await FileType.fromBuffer(buffer);
    const trueFileName = attachExtension ? (filename + '.' + type.ext) : filename;
    await fs.writeFileSync(trueFileName, buffer);
    return trueFileName;
  };

  console.log(`🚀 Kandala-Xmd started successfully!`);
  console.log(`📊 Current settings:`);
  console.log(`   • Autolike: ${settingss.autolike ? '✅ ON' : '❌ OFF'}`);
  console.log(`   • Autoview: ${settingss.autoview ? '✅ ON' : '❌ OFF'}`);
  console.log(`   • Autoread: ${settingss.autoread ? '✅ ON' : '❌ OFF'}`);
  console.log(`   • Reaction Emoji: ${settingss.autolikeemoji || 'random'}`);
}

app.use(express.static('public'));

app.get("/", (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

app.listen(port, () => console.log(`Server listening on port http://localhost:${port}`));

startFee();

module.exports = startFee;

let file = require.resolve(__filename);
fs.watchFile(file, () => {
  fs.unwatchFile(file);
  console.log(chalk.redBright(`Update ${__filename}`));
  delete require.cache[file];
  require(file);
});