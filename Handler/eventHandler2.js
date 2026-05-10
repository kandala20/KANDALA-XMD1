const { getGroupSettings, getSudoUsers } = require("../Database/config");

const Events = async (client, event, pict) => {
    const botJid = await client.decodeJid(client.user.id);

    try {
        const metadata = await client.groupMetadata(event.id);
        const participants = event.participants;
        const desc = metadata.desc || "No group description available.";

        // 📊 GROUP STATS
        const totalMembers = metadata.participants.length;
        const totalAdmins = metadata.participants.filter(
            p => p.admin === "admin" || p.admin === "superadmin"
        ).length;

        const groupSettings = await getGroupSettings(event.id);
        const eventsEnabled = groupSettings?.events === true;
        const antidemote = groupSettings?.antidemote === true;
        const antipromote = groupSettings?.antipromote === true;

        const sudoUsers = await getSudoUsers();
        const currentDevs = Array.isArray(sudoUsers)
            ? sudoUsers.map(v => v.replace(/[^0-9]/g, "") + "@s.whatsapp.net")
            : [];

        const dpPromises = participants.map(async (participant) => {
            try {
                return await client.profilePictureUrl(participant, "image");
            } catch {
                return pict;
            }
        });

        const dpUrls = await Promise.all(dpPromises);

        // ================= WELCOME =================
        if (eventsEnabled && event.action === "add") {
            try {
                for (let i = 0; i < participants.length; i++) {
                    const user = participants[i];
                    const userName = user.split("@")[0];

                    await client.sendMessage(event.id, {
                        image: { url: dpUrls[i] },
                        caption:
`❥┈┈┈┈┈┈┈┈┈┈┈┈┈┈➤
┋ 🤖 Kandala-Xmd WELCOME 
┋
┋ 👋 Welcome @${userName}
┋
┋ 🦁 Group : ${metadata.subject}
┋ 📜 About : ${desc}
┋
┋ 👥 Members : ${totalMembers}
┋ 🛡️ Admins  : ${totalAdmins}
┋
┋ ⚡ Follow rules
┋ ⚡ Respect admins
┋
┋ 🔥 𝒑𝒐𝒘𝒆𝒓𝒆𝒅 𝒃𝒚 Kandala-Xmd
❥┈┈┈┈┈┈┈┈┈┈┈┈┈┈➤`,
                        mentions: [user]
                    });
                }
            } catch {}
        }

        // ================= GOODBYE =================
        else if (eventsEnabled && event.action === "remove") {
            try {
                for (let i = 0; i < participants.length; i++) {
                    const user = participants[i];
                    const userName = user.split("@")[0];

                    await client.sendMessage(event.id, {
                        image: { url: dpUrls[i] },
                        caption:
`❥┈┈┈┈┈┈┈┈┈┈┈┈┈┈➤
┋ 🚪 Kandala-Xmd EXIT NOTICE ┋
┋
┋ 👋 Goodbye @${userName}
┋
┋ 🦁 Group : ${metadata.subject}
┋
┋ 👥 Members Left : ${totalMembers}
┋ 🛡️ Admins      : ${totalAdmins}
┋
┋ 🔥 𝒑𝒐𝒘𝒆𝒓𝒆𝒅 𝒃𝒚 Kandala-Xmd
❥┈┈┈┈┈┈┈┈┈┈┈┈┈┈➤`,
                        mentions: [user]
                    });
                }
            } catch {}
        }

        // ================= ANTIDEMOTE =================
        if (event.action === "demote" && antidemote) {
            try {
                const participant = participants[0];

                if (
                    event.author === metadata.owner ||
                    event.author === botJid ||
                    event.author === participant ||
                    currentDevs.includes(event.author)
                ) {
                    await client.sendMessage(event.id, {
                        text:
`❥┈┈┈┈┈┈┈┈┈┈┈┈┈┈➤
┋ 🔽 Kandala-Xmd NOTICE     ┋
┋
┋ 👤 User : @${participant.split("@")[0]}
┋ 📉 Action : Demoted
┋
┋ 👥 Members : ${totalMembers}
┋ 🛡️ Admins  : ${totalAdmins}
┋
┋ 🔥 𝒑𝒐𝒘𝒆𝒓𝒆𝒅 𝒃𝒚 Kandala-Xmd
❥┈┈┈┈┈┈┈┈┈┈┈┈┈┈➤`,
                        mentions: [participant]
                    });
                    return;
                }

                await client.groupParticipantsUpdate(event.id, [event.author], "demote");
                await client.groupParticipantsUpdate(event.id, [participant], "promote");

                await client.sendMessage(event.id, {
                    text:
`❥┈┈┈┈┈┈┈┈┈┈┈┈┈┈➤
┋ 🛡️ Kandala-Xmd SECURITY   ┋
┋
┋ 🚫 Unauthorized demote
┋
┋ 👤 Attacker : @${event.author.split("@")[0]}
┋ 🛡️ Protected : @${participant.split("@")[0]}
┋
┋ 👥 Members : ${totalMembers}
┋ 🛡️ Admins  : ${totalAdmins}
┋ ⚙️ Antidemote ACTIVE
┋
┋ 🔥 𝒑𝒐𝒘𝒆𝒓𝒆𝒅 𝒃𝒚 Kandala-Xmd
❥┈┈┈┈┈┈┈┈┈┈┈┈┈┈➤`,
                    mentions: [event.author, participant]
                });
            } catch {}
        }

        // ================= ANTIPROMOTE =================
        else if (event.action === "promote" && antipromote) {
            try {
                const participant = participants[0];

                if (
                    event.author === metadata.owner ||
                    event.author === botJid ||
                    event.author === participant ||
                    currentDevs.includes(event.author)
                ) {
                    await client.sendMessage(event.id, {
                        text:
`❥┈┈┈┈┈┈┈┈┈┈┈┈┈┈➤
┋ 🔼 Kandala-Xmd NOTICE     ┋
┋
┋ 👤 User : @${participant.split("@")[0]}
┋ 📈 Action : Promoted
┋
┋ 👥 Members : ${totalMembers}
┋ 🛡️ Admins  : ${totalAdmins}
┋
┋ 🔥 𝒑𝒐𝒘𝒆𝒓𝒆𝒅 𝒃𝒚 Kandala-Xmd
❥┈┈┈┈┈┈┈┈┈┈┈┈┈┈➤`,
                        mentions: [participant]
                    });
                    return;
                }

                await client.groupParticipantsUpdate(event.id, [event.author, participant], "demote");

                await client.sendMessage(event.id, {
                    text:
`❥┈┈┈┈┈┈┈┈┈┈┈┈┈┈➤
┋ 🚫 Kandala-Xmd SECURITY   ┋
┋
┋ ⚠️ Unauthorized promote
┋
┋ 👤 Actor  : @${event.author.split("@")[0]}
┋ 👤 Target : @${participant.split("@")[0]}
┋
┋ 👥 Members : ${totalMembers}
┋ 🛡️ Admins  : ${totalAdmins}
┋ 🔁 Action reverted
┋ ⚙️ Antipromote ACTIVE
┋
┋ 🔥 𝒑𝒐𝒘𝒆𝒓𝒆𝒅 𝒃𝒚 Kandala-Xmd
❥┈┈┈┈┈┈┈┈┈┈┈┈┈┈➤`,
                    mentions: [event.author, participant]
                });
            } catch {}
        }

    } catch {
        try {
            await client.sendMessage(event.id, {
                text:
`❥┈┈┈┈┈┈┈┈┈┈┈┈┈┈➤
┋ ⚠️ Kandala-Xmd ERROR      
┋
┋ ❌ Event handling failed
┋ 🔧 Try again later
┋
┋ 🔥 𝒑𝒐𝒘𝒆𝒓𝒆𝒅 𝒃𝒚 Kandala-Xmd
❥┈┈┈┈┈┈┈┈┈┈┈┈┈┈➤`
            });
        } catch {}
    }
};

module.exports = Events;