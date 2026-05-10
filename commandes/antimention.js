const { zokou } = require("../framework/zokou");
const { amAjouterOuMettreAJourJid, amMettreAJourAction, amVerifierEtatJid, amRecupererActionJid } = require("../bdd/antimention");

zokou({
    nomCom: "antimention",
    categorie: "Group",
    reaction: "🛡️",
    desc: "Enable/disable anti-mention protection in group"
}, async (dest, zk, commandeOptions) => {
    const { ms, repondre, arg, verifGroupe, verifAdmin, superUser } = commandeOptions;

    if (!verifGroupe) return repondre("❌ *Group only command!*");
    if (!verifAdmin && !superUser) return repondre("❌ *Admins only!*");

    const sub = arg[0]?.toLowerCase();

    if (!sub) {
        const isOn = await amVerifierEtatJid(dest);
        const action = await amRecupererActionJid(dest);
        return repondre(
            `🛡️ *ANTI-MENTION*\n\n` +
            `Status: ${isOn ? '✅ ON' : '❌ OFF'}\n` +
            `Action: *${action}*\n\n` +
            `*Commands:*\n` +
            `▸ .antimention on\n` +
            `▸ .antimention off\n` +
            `▸ .antimention action supp\n` +
            `▸ .antimention action remove\n` +
            `▸ .antimention action warn`
        );
    }

    if (sub === 'on') {
        await amAjouterOuMettreAJourJid(dest, 'oui');
        return repondre("✅ *Anti-mention enabled!*\n🛡️ Mass mentions will be blocked.");
    }

    if (sub === 'off') {
        await amAjouterOuMettreAJourJid(dest, 'non');
        return repondre("❌ *Anti-mention disabled!*");
    }

    if (sub === 'action') {
        const act = arg[1]?.toLowerCase();
        if (!['supp', 'remove', 'warn'].includes(act)) {
            return repondre("❌ *Invalid action!*\nUse: supp | remove | warn");
        }
        await amMettreAJourAction(dest, act);
        return repondre(`✅ *Action set to: ${act}*`);
    }

    return repondre("❌ *Unknown option!*\nUse: on | off | action");
});
