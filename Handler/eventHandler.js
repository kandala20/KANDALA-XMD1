const { getGroupSettings, getSudoUsers } = require("../Database/config");

const Events = async (client, event, pict) => {
    const botJid = await client.decodeJid(client.user.id);

    try {
        const metadata = await client.groupMetadata(event.id);
        const participants = event.participants;
        const desc = metadata.desc || "Some boring group, I guess.";
        const groupSettings = await getGroupSetting(event.id);
        const eventsEnabled = groupSettings?.events === true;
        const antidemote = groupSettings?.antidemote === true;
        const antipromote = groupSettings?.antipromote === true;
        const sudoUsers = await getSudoUsers();
        const currentDevs = Array.isArray(sudoUsers)
            ? sudoUsers.map(v => v.replace(/[^0-9]/g, "") + "@s.whatsapp.net")
            : [];

        for (const participant of participants) {
            let dpUrl = pict;
            try {
                dpUrl = await client.profilePictureUrl(participant, "image");
            } catch {
                dpUrl = pict; // Fallback to default pic if user has no DP
            }

            if (eventsEnabled && event.action === "add") {
                try {
                    const userName = participant.split("@")[0];
                    const welcomeText = 
`╭┈┈➤「 🔥 Kandala-Xmd Welcome 🔥 」
┋ 😈 *Yo, @${userName}, welcome to the chaos!*  
┋
┋ 🤖 *Bot*: Kandala-Xmd
┋ 🦁 *Group*: ${metadata.subject}
┋ 📜 *Desc*: ${desc}
┋
┋ 😼 *Try not to get roasted too hard, newbie!*
╰┈┈➤「 🔥 𝒑𝒐𝒘𝒆𝒓𝒆𝒅 𝒃𝒚 Kandala-Xmd  🔥 」`;

                    await client.sendMessage(event.id, {
                        image: { url: dpUrl },
                        caption: welcomeText,
                        mentions: [participant]
                    });
                } catch {
                    // Keep it chill, no error spam
                }
            } else if (eventsEnabled && event.action === "remove") {
                try {
                    const userName = participant.split("@")[0];
                    const leaveText = 
`╭┈┈➤「 🚪 Kandala-Xmd exit 🚪 」
┋ 😎 *Later, @${userName}! Couldn’t handle the heat?*  
┋
┋ 🤖 *Bot*: Kandala-Xmd
┋ 🦁 *Group*: ${metadata.subject}
┋
┋ 😜 *Don’t cry, we’ll survive without ya!*
╰┈┈➤「 🔥 𝒑𝒐𝒘𝒆𝒓𝒆𝒅 𝒃𝒚 Kandala-Xmd 🔥 」`;

                    await client.sendMessage(event.id, {
                        image: { url: dpUrl },
                        caption: leaveText,
                        mentions: [participant]
                    });
                } catch {
                    // No whining about errors
                }
            }

            if (event.action === "demote" && antidemote) {
                try {
                    if (
                        event.author === metadata.owner ||
                        event.author === botJid ||
                        event.author === participant ||
                        currentDevs.includes(event.author)
                    ) {
                        await client.sendMessage(event.id, {
                            text: 
`╭┈┈➤「 🔽 Kandala-Xmd Demotion 🔽 」
┋ 😤 *Big shot @${participant.split("@")[0]} got knocked down!*  
┋
┋ 🤖 *Bot*: Kandala-Xmd 
┋ 🦁 *Group*: ${metadata.subject}
╰┈┈➤「 🔥 𝒑𝒐𝒘𝒆𝒓𝒆𝒅 𝒃𝒚 Kandala-Xmd 🔥 」`,
                            mentions: [participant]
                        });
                        return;
                    }

                    await client.groupParticipantsUpdate(event.id, [event.author], "demote");
                    await client.groupParticipantsUpdate(event.id, [participant], "promote");

                    await client.sendMessage(event.id, {
                        text: 
`╭┈┈➤「 🔽 Kandala-Xmd Antidemote 🔽 」
┋ 😏 *Nice try, @${event.author.split("@")[0]}! Demoted for messing with @${participant.split("@")[0]}!*  
┋
┋ 🤖 *Bot*: Kandala-Xmd 
┋ 🦁 *Group*: ${metadata.subject}
┋ 📜 *Rule*: Antidemote’s on, loser. Only the big dogs can demote!
╰┈┈➤「 🔥 𝒑𝒐𝒘𝒆𝒓𝒆𝒅 𝒃𝒚 Kandala-Xmd 🔥 」`,
                        mentions: [event.author, participant]
                    });
                } catch {
                    // Errors? Pfft, we don’t care
                }
            } else if (event.action === "promote" && antipromote) {
                try {
                    if (
                        event.author === metadata.owner ||
                        event.author === botJid ||
                        event.author === participant ||
                        currentDevs.includes(event.author)
                    ) {
                        await client.sendMessage(event.id, {
                            text: 
`╭┈┈➤「 🔼 Kandala-Xmd Promotion 🔼 」
┋ 😎 *Big dog @${participant.split("@")[0]} just leveled up!*  
┋
┋ 🤖 *Bot*: Kandala-Xmd 
┋ 🦁 *Group*: ${metadata.subject}
╰┈┈➤「 🔥 𝒑𝒐𝒘𝒆𝒓𝒆𝒅 𝒃𝒚 Kandala-Xmd 🔥 」`,
                            mentions: [participant]
                        });
                        return;
                    }

                    await client.groupParticipantsUpdate(event.id, [event.author, participant], "demote");

                    await client.sendMessage(event.id, {
                        text: 
`╭┈┈➤「 🔼 Kandala-Xmd Antipromote 🔼 」
┋ 😆 *Oof, @${event.author.split("@")[0]}! Demoted for trying to boost @${participant.split("@")[0]}!*  
┋
┋ 🤖 *Bot*: Kandala-Xmd 
┋ 🦁 *Group*: ${metadata.subject}
┋ 📜 *Rule*: @${participant.split("@")[0]} got yeeted too. Antipromote’s on, only the elite can promote!
╰┈┈➤「 🔥 𝒑𝒐𝒘𝒆𝒓𝒆𝒅 𝒃𝒚 Kandala-Xmd 🔥 」`,
                        mentions: [event.author, participant]
                    });
                } catch {
                    // Errors are for the weak
                }
            }
        }
    } catch {
        try {
            await client.sendMessage(event.id, {
                text: 
`╭┈┈➤「 ⚠️ Kandala-Xmd Error ⚠️ 」
┋ 😬 *Yikes, something broke. Blame the group vibes!*  
┋
┋ 🤖 *Bot*: Kandala-Xmd 
┋ 🦁 *Group*: ${metadata.subject}
╰┈┈➤「 🔥 𝒑𝒐𝒘𝒆𝒓𝒆𝒅 𝒃𝒚 Kandala-Xmd 🔥 」`
            });
        } catch {
            // If this fails, we’re just cursed
        }
    }
};

module.exports = Events;