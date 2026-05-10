const { zokou } = require("../framework/zokou");

zokou({
    nomCom: "vvdebug",
    categorie: "General",
    fromMe: true
}, async (dest, zk, commandeOptions) => {
    const { ms, msgRepondu, repondre } = commandeOptions;

    try {
        const data = {
            "1_ms.message keys": Object.keys(ms?.message || {}),
            "2_msgRepondu keys": Object.keys(msgRepondu || {}),
            "3_msgRepondu.message keys": Object.keys(msgRepondu?.message || {}),
            "4_ms.message (raw)": JSON.stringify(ms?.message || {}).slice(0, 1500),
            "5_msgRepondu (raw)": JSON.stringify(msgRepondu || {}).slice(0, 1500),
        };

        for (const [key, val] of Object.entries(data)) {
            await repondre(`*${key}:*\n${typeof val === 'string' ? val : JSON.stringify(val, null, 2)}`);
        }
    } catch (e) {
        await repondre("❌ Debug error: " + e.message);
    }
});
