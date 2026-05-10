const { zokou } = require("../framework/zokou");

zokou({
    nomCom: "repo",
    categorie: "General",
    reaction: "📁",
    desc: "Get bot repository link"
}, async (dest, zk, commandeOptions) => {
    const { repondre, ms } = commandeOptions;
    
    const repoMessage = `╭━━ *KANDALA-XMD REPO* ━━╮
┃ 
┃ 📁 *REPOSITORY INFORMATION*
┃ 
┃ 🔗 *GitHub Repository:*
┃    https://github.com/kandala20/KANDALA-XMD1
┃ 
┃ ⭐ *Star this repo* ⭐
┃    Show your support by starring
┃ 
┃ 🔄 *Fork this repo* 🔄
┃    Create your own version
┃ 
┃ 📦 *Deploy to Heroku:*
┃    Click the button below
┃ 
┃ 💬 *Report Issues:*
┃    Open an issue on GitHub
┃    Or contact owner
┃ 
┣━━━━━━━━━━━━━━━━━━━━
┃ 📢 *JOIN OUR CHANNEL*
┃    Get latest updates & news
┃ 🔗 https://chat.whatsapp.com/Foy4FSXyTk8GmazVXQMhHM
┃ 
┃ 💬 *CONTACT OWNER*
┃ 🔗 https://wa.me/255672752355
╰━━━━━━━━━━━━━━━━━━━━

_© KANDALA-XMD - Made with kandala tech_
_Thank you for using KANDALA-XMD!_`;

    await repondre(repoMessage);
});
