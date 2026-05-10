const { zokou } = require("../framework/zokou");
const conf = require("../set");
const fs = require("fs-extra");

zokou({
    nomCom: "vv",
    categorie: "General",
    reaction: "👁️👁️",
    desc: "Save view once media (sends to owner DM)",
    fromMe: true
}, async (dest, zk, commandeOptions) => {
    const { ms, msgRepondu, repondre, auteurMessage } = commandeOptions;

    // msgRepondu = ms.message.extendedTextMessage?.contextInfo?.quotedMessage
    if (!msgRepondu) {
        return repondre("❌ *Reply to a view once message!*");
    }

    try {
        // Detect media type from quotedMessage
        let type = '';
        let mediaMsg = null;

        if (msgRepondu.imageMessage) {
            type = 'image';
            mediaMsg = msgRepondu.imageMessage;
        } else if (msgRepondu.videoMessage) {
            type = 'video';
            mediaMsg = msgRepondu.videoMessage;
        } else if (msgRepondu.audioMessage) {
            type = 'audio';
            mediaMsg = msgRepondu.audioMessage;
        } else if (msgRepondu.stickerMessage) {
            type = 'sticker';
            mediaMsg = msgRepondu.stickerMessage;
        } else {
            return repondre("❌ *Not a view once message or unsupported type!*");
        }

        await repondre(`⏳ *Downloading ${type}...*`);

        // downloadAndSaveMediaMessage needs mimetype and mtype on the object
        // Add mtype so the function can determine messageType correctly
        mediaMsg.mtype = type + "Message";

        const mediaPath = await zk.downloadAndSaveMediaMessage(mediaMsg, `vv_${Date.now()}`);

        if (!mediaPath || !fs.existsSync(mediaPath)) {
            return repondre("❌ *Download failed!*");
        }

        const stats = fs.statSync(mediaPath);
        const fileSizeMB = (stats.size / 1024 / 1024).toFixed(2);

        // Owner info
        const ownerJid = conf.NUMERO_OWNER + "@s.whatsapp.net";
        const contextInfo = ms.message?.extendedTextMessage?.contextInfo;
        const senderJid = contextInfo?.participant || auteurMessage;
        const sender = senderJid.split('@')[0];
        const caption = `👁️ *VIEW ONCE ${type.toUpperCase()}*\n👤 *From:* @${sender}\n💾 *Size:* ${fileSizeMB} MB`;

        // Send to owner
        if (type === 'image') {
            await zk.sendMessage(ownerJid, {
                image: { url: mediaPath },
                caption,
                mentions: [senderJid]
            });
        } else if (type === 'video') {
            await zk.sendMessage(ownerJid, {
                video: { url: mediaPath },
                caption,
                mentions: [senderJid]
            });
        } else if (type === 'audio') {
            await zk.sendMessage(ownerJid, {
                audio: { url: mediaPath },
                mimetype: mediaMsg.mimetype || 'audio/mpeg',
                ptt: false
            });
            await zk.sendMessage(ownerJid, {
                text: caption,
                mentions: [senderJid]
            });
        } else if (type === 'sticker') {
            await zk.sendMessage(ownerJid, { sticker: { url: mediaPath } });
            await zk.sendMessage(ownerJid, { text: caption, mentions: [senderJid] });
        }

        // Cleanup temp file
        fs.unlinkSync(mediaPath);

        await repondre(`✅ *View once ${type} sent to owner DM!*\n💾 *Size:* ${fileSizeMB} MB`);

    } catch (error) {
        console.error("❌ VV Error:", error);
        await repondre(`❌ *Error:* ${error.message}`);
    }
});
