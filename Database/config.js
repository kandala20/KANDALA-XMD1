/*const { Pool } = require('pg');
const { database } = require('../Env/settings');

const pool = new Pool({
    connectionString: database,
    ssl: { rejectUnauthorized: false }
});

async function initializeDatabase() {
    const client = await pool.connect();
    try {
        await client.query(`
            CREATE TABLE IF NOT EXISTS settings (
                id SERIAL PRIMARY KEY,
                key TEXT UNIQUE NOT NULL,
                value TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS group_settings (
                jid TEXT PRIMARY KEY,
                antidelete BOOLEAN DEFAULT true,
                gcpresence BOOLEAN DEFAULT false,
                events BOOLEAN DEFAULT false,
                antidemote BOOLEAN DEFAULT false,
                antipromote BOOLEAN DEFAULT false
            );
            CREATE TABLE IF NOT EXISTS conversation_history (
                id SERIAL PRIMARY KEY,
                num TEXT NOT NULL,
                role TEXT NOT NULL,
                message TEXT NOT NULL,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS sudo_users (
                num TEXT PRIMARY KEY
            );
            CREATE TABLE IF NOT EXISTS banned_users (
                num TEXT PRIMARY KEY
            );
            CREATE TABLE IF NOT EXISTS users (
                num TEXT PRIMARY KEY
            );
        `);

        const defaultSettings = {
            prefix: '.',
            packname: '𝙁𝙀𝙀-𝙓𝙈𝘿',
            mode: 'public',
            presence: 'online',
            autoview: 'true',
            autolike: 'false',
            autoread: 'false',
            autobio: 'false',
            anticall: 'false',
            chatbotpm: 'false',
            autolikeemoji: '🩷',
            antilink: 'off',
            antidelete: 'false',
            antistatusmention: 'delete',
            startmessage: 'true'
        };

        for (const [key, value] of Object.entries(defaultSettings)) {
            await client.query(`
                INSERT INTO settings (key, value) 
                VALUES ($1, $2)
                ON CONFLICT (key) DO NOTHING;
            `, [key, value]);
        }
    } catch (error) {
        console.error(`❌ Database setup failed: ${error}`);
    } finally {
        client.release();
    }
}

async function getSettings() {
    try {
        const res = await pool.query("SELECT key, value FROM settings");
        const settings = {};
        res.rows.forEach(row => {
            if (row.value === 'true') settings[row.key] = true;
            else if (row.value === 'false') settings[row.key] = false;
            else settings[row.key] = row.value;
        });
        return settings;
    } catch (error) {
        console.error(`❌ Error fetching global settings: ${error}`);
        return {};
    }
}

async function updateSetting(key, value) {
    try {
        const valueToStore = typeof value === 'boolean' ? (value ? 'true' : 'false') : value;
        await pool.query(`
            INSERT INTO settings (key, value) 
            VALUES ($1, $2)
            ON CONFLICT (key) DO UPDATE 
            SET value = EXCLUDED.value;
        `, [key, valueToStore]);
    } catch (error) {
        console.error(`❌ Error updating global setting: ${key}: ${error}`);
    }
}

async function getGroupSettings(jid) {
    try {
        const globalSettings = await getSettings();
        const res = await pool.query('SELECT * FROM group_settings WHERE jid = $1', [jid]);
        if (res.rows.length > 0) {
            return {
                antidelete: res.rows[0].antidelete,
                gcpresence: res.rows[0].gcpresence,
                events: res.rows[0].events,
                antidemote: res.rows[0].antidemote,
                antipromote: res.rows[0].antipromote
            };
        }
        return {
            antidelete: globalSettings.antidelete || true,
            gcpresence: false,
            events: false,
            antidemote: false,
            antipromote: false
        };
    } catch (error) {
        console.error(`❌ Error fetching group settings for ${jid}: ${error}`);
        return {
            antidelete: true,
            gcpresence: false,
            events: false,
            antidemote: false,
            antipromote: false
        };
    }
}

async function updateGroupSetting(jid, key, value) {
    try {
        await pool.query(`
            INSERT INTO group_settings (jid, ${key})
            VALUES ($1, $2)
            ON CONFLICT (jid) DO UPDATE 
            SET ${key} = EXCLUDED.${key};
        `, [jid, value]);
    } catch (error) {
        console.error(`❌ Error updating group setting ${key} for ${jid}: ${error}`);
    }
}

async function banUser(num) {
    try {
        await pool.query(`INSERT INTO banned_users (num) VALUES ($1) ON CONFLICT (num) DO NOTHING;`, [num]);
    } catch (error) {
        console.error(`❌ Error banning user ${num}: ${error}`);
    }
}

async function unbanUser(num) {
    try {
        await pool.query(`DELETE FROM banned_users WHERE num = $1;`, [num]);
    } catch (error) {
        console.error(`❌ Error unbanning user ${num}: ${error}`);
    }
}

async function addSudoUser(num) {
    try {
        await pool.query(`INSERT INTO sudo_users (num) VALUES ($1) ON CONFLICT (num) DO NOTHING;`, [num]);
    } catch (error) {
        console.error(`❌ Error adding sudo user ${num}: ${error}`);
    }
}

async function removeSudoUser(num) {
    try {
        await pool.query(`DELETE FROM sudo_users WHERE num = $1;`, [num]);
    } catch (error) {
        console.error(`❌ Error removing sudo user ${num}: ${error}`);
    }
}

async function getSudoUsers() {
    try {
        const res = await pool.query('SELECT num FROM sudo_users');
        return res.rows.map(row => row.num);
    } catch (error) {
        console.error(`❌ Error fetching sudo users: ${error}`);
        return [];
    }
}

async function saveConversation(num, role, message) {
    try {
        await pool.query(
            'INSERT INTO conversation_history (num, role, message) VALUES ($1, $2, $3)',
            [num, role, message]
        );
    } catch (error) {
        console.error(`❌ Error saving conversation for ${num}: ${error}`);
    }
}

async function getRecentMessages(num) {
    try {
        const res = await pool.query(
            'SELECT role, message FROM conversation_history WHERE num = $1 ORDER BY timestamp ASC',
            [num]
        );
        return res.rows;
    } catch (error) {
        console.error(`❌ Error retrieving conversation history for ${num}: ${error}`);
        return [];
    }
}

async function deleteUserHistory(num) {
    try {
        await pool.query('DELETE FROM conversation_history WHERE num = $1', [num]);
    } catch (error) {
        console.error(`❌ Error deleting conversation history for ${num}: ${error}`);
    }
}

async function getBannedUsers() {
    try {
        const res = await pool.query('SELECT num FROM banned_users');
        return res.rows.map(row => row.num);
    } catch (error) {
        console.error(`❌ Error fetching banned users: ${error}`);
        return [];
    }
}

initializeDatabase().catch(err => console.error(`❌ Database initialization failed: ${err}`));

module.exports = {
    addSudoUser,
    saveConversation,
    getRecentMessages,
    deleteUserHistory,
    getSudoUsers,
    removeSudoUser,
    banUser,
    unbanUser,
    getBannedUsers,
    getSettings,
    updateSetting,
    getGroupSettings,
    updateGroupSetting
};*/



const { Pool } = require('pg');
const { database } = require('../Env/settings');

const pool = new Pool({
    connectionString: database,
    ssl: { rejectUnauthorized: false }
});

async function initializeDatabase() {
    const client = await pool.connect();
    try {
        await client.query(`
            CREATE TABLE IF NOT EXISTS settings (
                id SERIAL PRIMARY KEY,
                key TEXT UNIQUE NOT NULL,
                value TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS group_settings (
                jid TEXT PRIMARY KEY,
                antidelete BOOLEAN DEFAULT true,
                gcpresence BOOLEAN DEFAULT false,
                events BOOLEAN DEFAULT false,
                antidemote BOOLEAN DEFAULT false,
                antipromote BOOLEAN DEFAULT false
            );
            CREATE TABLE IF NOT EXISTS conversation_history (
                id SERIAL PRIMARY KEY,
                num TEXT NOT NULL,
                role TEXT NOT NULL,
                message TEXT NOT NULL,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS sudo_users (
                num TEXT PRIMARY KEY
            );
            CREATE TABLE IF NOT EXISTS banned_users (
                num TEXT PRIMARY KEY
            );
            CREATE TABLE IF NOT EXISTS users (
                num TEXT PRIMARY KEY
            );
        `);

        // Add group_time_settings table
        await client.query(`
            CREATE TABLE IF NOT EXISTS group_time_settings (
                jid TEXT PRIMARY KEY,
                open_time TEXT,
                close_time TEXT,
                open_enabled BOOLEAN DEFAULT false,
                close_enabled BOOLEAN DEFAULT false,
                auto_enabled BOOLEAN DEFAULT false,
                last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (jid) REFERENCES group_settings(jid) ON DELETE CASCADE
            );
        `);

        const defaultSettings = {
            prefix: '.',
            packname: 'KANDALA-MD',
            mode: 'public',
            presence: 'online',
            autoview: 'true',
            autolike: 'false',
            autoread: 'false',
            autobio: 'false',
            anticall: 'false',
            chatbotpm: 'false',
            autolikeemoji: '💕',
            antilink: 'off',
            antidelete: 'false',
            antistatusmention: 'delete',
            startmessage: 'true'
        };

        for (const [key, value] of Object.entries(defaultSettings)) {
            await client.query(`
                INSERT INTO settings (key, value) 
                VALUES ($1, $2)
                ON CONFLICT (key) DO NOTHING;
            `, [key, value]);
        }
    } catch (error) {
        console.error(`❌ Database setup failed: ${error}`);
    } finally {
        client.release();
    }
}

async function getSettings() {
    try {
        const res = await pool.query("SELECT key, value FROM settings");
        const settings = {};
        res.rows.forEach(row => {
            if (row.value === 'true') settings[row.key] = true;
            else if (row.value === 'false') settings[row.key] = false;
            else settings[row.key] = row.value;
        });
        return settings;
    } catch (error) {
        console.error(`❌ Error fetching global settings: ${error}`);
        return {};
    }
}

async function updateSetting(key, value) {
    try {
        const valueToStore = typeof value === 'boolean' ? (value ? 'true' : 'false') : value;
        await pool.query(`
            INSERT INTO settings (key, value) 
            VALUES ($1, $2)
            ON CONFLICT (key) DO UPDATE 
            SET value = EXCLUDED.value;
        `, [key, valueToStore]);
    } catch (error) {
        console.error(`❌ Error updating global setting: ${key}: ${error}`);
    }
}

async function getGroupSettings(jid) {
    try {
        const globalSettings = await getSettings();
        const res = await pool.query('SELECT * FROM group_settings WHERE jid = $1', [jid]);
        if (res.rows.length > 0) {
            return {
                antidelete: res.rows[0].antidelete,
                gcpresence: res.rows[0].gcpresence,
                events: res.rows[0].events,
                antidemote: res.rows[0].antidemote,
                antipromote: res.rows[0].antipromote
            };
        }
        return {
            antidelete: globalSettings.antidelete || true,
            gcpresence: false,
            events: false,
            antidemote: false,
            antipromote: false
        };
    } catch (error) {
        console.error(`❌ Error fetching group settings for ${jid}: ${error}`);
        return {
            antidelete: true,
            gcpresence: false,
            events: false,
            antidemote: false,
            antipromote: false
        };
    }
}

async function updateGroupSetting(jid, key, value) {
    try {
        await pool.query(`
            INSERT INTO group_settings (jid, ${key})
            VALUES ($1, $2)
            ON CONFLICT (jid) DO UPDATE 
            SET ${key} = EXCLUDED.${key};
        `, [jid, value]);
    } catch (error) {
        console.error(`❌ Error updating group setting ${key} for ${jid}: ${error}`);
    }
}

// ==================== TIME SETTINGS FUNCTIONS ====================

async function saveGroupTime(jid, timeType, timeValue, enabled = true) {
    try {
        // First ensure the group exists in group_settings
        await pool.query(`
            INSERT INTO group_settings (jid) 
            VALUES ($1)
            ON CONFLICT (jid) DO NOTHING;
        `, [jid]);

        // Now insert/update time settings
        if (timeType === 'open') {
            await pool.query(`
                INSERT INTO group_time_settings (jid, open_time, open_enabled, last_updated)
                VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
                ON CONFLICT (jid) DO UPDATE 
                SET open_time = EXCLUDED.open_time, 
                    open_enabled = EXCLUDED.open_enabled,
                    last_updated = CURRENT_TIMESTAMP;
            `, [jid, timeValue, enabled]);
        } else if (timeType === 'close') {
            await pool.query(`
                INSERT INTO group_time_settings (jid, close_time, close_enabled, last_updated)
                VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
                ON CONFLICT (jid) DO UPDATE 
                SET close_time = EXCLUDED.close_time, 
                    close_enabled = EXCLUDED.close_enabled,
                    last_updated = CURRENT_TIMESTAMP;
            `, [jid, timeValue, enabled]);
        }
        
        console.log(`✅ Saved ${timeType} time for ${jid}: ${timeValue} (enabled: ${enabled})`);
        return true;
    } catch (error) {
        console.error(`❌ Error saving group time for ${jid}: ${error}`);
        return false;
    }
}

async function getGroupTime(jid, timeType) {
    try {
        const res = await pool.query('SELECT * FROM group_time_settings WHERE jid = $1', [jid]);
        
        if (res.rows.length > 0) {
            const row = res.rows[0];
            
            if (timeType === 'open') {
                if (row.open_time && row.open_enabled) {
                    return {
                        time: row.open_time,
                        enabled: row.open_enabled,
                        lastUpdated: row.last_updated
                    };
                }
            } else if (timeType === 'close') {
                if (row.close_time && row.close_enabled) {
                    return {
                        time: row.close_time,
                        enabled: row.close_enabled,
                        lastUpdated: row.last_updated
                    };
                }
            } else if (timeType === 'all') {
                return {
                    openTime: row.open_time,
                    openEnabled: row.open_enabled,
                    closeTime: row.close_time,
                    closeEnabled: row.close_enabled,
                    autoEnabled: row.auto_enabled,
                    lastUpdated: row.last_updated
                };
            }
        }
        return null;
    } catch (error) {
        console.error(`❌ Error getting group time for ${jid}: ${error}`);
        return null;
    }
}

async function setAutoMode(jid, enabled) {
    try {
        await pool.query(`
            INSERT INTO group_time_settings (jid, auto_enabled, last_updated)
            VALUES ($1, $2, CURRENT_TIMESTAMP)
            ON CONFLICT (jid) DO UPDATE 
            SET auto_enabled = EXCLUDED.auto_enabled,
                last_updated = CURRENT_TIMESTAMP;
        `, [jid, enabled]);
        
        console.log(`✅ Auto mode ${enabled ? 'enabled' : 'disabled'} for ${jid}`);
        return true;
    } catch (error) {
        console.error(`❌ Error setting auto mode for ${jid}: ${error}`);
        return false;
    }
}

async function getAllGroupsWithAutoSettings() {
    try {
        const res = await pool.query(`
            SELECT gts.jid, gts.open_time, gts.close_time, 
                   gts.open_enabled, gts.close_enabled, gts.auto_enabled
            FROM group_time_settings gts
            WHERE gts.auto_enabled = true 
               OR (gts.open_enabled = true OR gts.close_enabled = true)
        `);
        
        return res.rows.map(row => ({
            jid: row.jid,
            openTime: row.open_time,
            closeTime: row.close_time,
            openEnabled: row.open_enabled,
            closeEnabled: row.close_enabled,
            autoEnabled: row.auto_enabled
        }));
    } catch (error) {
        console.error(`❌ Error getting all groups with auto settings: ${error}`);
        return [];
    }
}

async function disableGroupTime(jid, timeType) {
    try {
        if (timeType === 'open') {
            await pool.query(`
                UPDATE group_time_settings 
                SET open_enabled = false, last_updated = CURRENT_TIMESTAMP
                WHERE jid = $1
            `, [jid]);
        } else if (timeType === 'close') {
            await pool.query(`
                UPDATE group_time_settings 
                SET close_enabled = false, last_updated = CURRENT_TIMESTAMP
                WHERE jid = $1
            `, [jid]);
        } else if (timeType === 'all') {
            await pool.query(`
                UPDATE group_time_settings 
                SET open_enabled = false, close_enabled = false, 
                    auto_enabled = false, last_updated = CURRENT_TIMESTAMP
                WHERE jid = $1
            `, [jid]);
        }
        
        console.log(`✅ Disabled ${timeType} time for ${jid}`);
        return true;
    } catch (error) {
        console.error(`❌ Error disabling group time for ${jid}: ${error}`);
        return false;
    }
}

async function getGroupTimeStatus(jid) {
    try {
        const res = await pool.query('SELECT * FROM group_time_settings WHERE jid = $1', [jid]);
        
        if (res.rows.length > 0) {
            const row = res.rows[0];
            return {
                openTime: row.open_time,
                openEnabled: row.open_enabled,
                closeTime: row.close_time,
                closeEnabled: row.close_enabled,
                autoEnabled: row.auto_enabled,
                lastUpdated: row.last_updated
            };
        }
        
        return {
            openTime: null,
            openEnabled: false,
            closeTime: null,
            closeEnabled: false,
            autoEnabled: false,
            lastUpdated: null
        };
    } catch (error) {
        console.error(`❌ Error getting group time status for ${jid}: ${error}`);
        return {
            openTime: null,
            openEnabled: false,
            closeTime: null,
            closeEnabled: false,
            autoEnabled: false,
            lastUpdated: null
        };
    }
}

// ==================== EXISTING FUNCTIONS ====================

async function banUser(num) {
    try {
        await pool.query(`INSERT INTO banned_users (num) VALUES ($1) ON CONFLICT (num) DO NOTHING;`, [num]);
    } catch (error) {
        console.error(`❌ Error banning user ${num}: ${error}`);
    }
}

async function unbanUser(num) {
    try {
        await pool.query(`DELETE FROM banned_users WHERE num = $1;`, [num]);
    } catch (error) {
        console.error(`❌ Error unbanning user ${num}: ${error}`);
    }
}

async function addSudoUser(num) {
    try {
        await pool.query(`INSERT INTO sudo_users (num) VALUES ($1) ON CONFLICT (num) DO NOTHING;`, [num]);
    } catch (error) {
        console.error(`❌ Error adding sudo user ${num}: ${error}`);
    }
}

async function removeSudoUser(num) {
    try {
        await pool.query(`DELETE FROM sudo_users WHERE num = $1;`, [num]);
    } catch (error) {
        console.error(`❌ Error removing sudo user ${num}: ${error}`);
    }
}

async function getSudoUsers() {
    try {
        const res = await pool.query('SELECT num FROM sudo_users');
        return res.rows.map(row => row.num);
    } catch (error) {
        console.error(`❌ Error fetching sudo users: ${error}`);
        return [];
    }
}

async function saveConversation(num, role, message) {
    try {
        await pool.query(
            'INSERT INTO conversation_history (num, role, message) VALUES ($1, $2, $3)',
            [num, role, message]
        );
    } catch (error) {
        console.error(`❌ Error saving conversation for ${num}: ${error}`);
    }
}

async function getRecentMessages(num) {
    try {
        const res = await pool.query(
            'SELECT role, message FROM conversation_history WHERE num = $1 ORDER BY timestamp ASC',
            [num]
        );
        return res.rows;
    } catch (error) {
        console.error(`❌ Error retrieving conversation history for ${num}: ${error}`);
        return [];
    }
}

async function deleteUserHistory(num) {
    try {
        await pool.query('DELETE FROM conversation_history WHERE num = $1', [num]);
    } catch (error) {
        console.error(`❌ Error deleting conversation history for ${num}: ${error}`);
    }
}

async function getBannedUsers() {
    try {
        const res = await pool.query('SELECT num FROM banned_users');
        return res.rows.map(row => row.num);
    } catch (error) {
        console.error(`❌ Error fetching banned users: ${error}`);
        return [];
    }
}

initializeDatabase().catch(err => console.error(`❌ Database initialization failed: ${err}`));

module.exports = {
    addSudoUser,
    saveConversation,
    getRecentMessages,
    deleteUserHistory,
    getSudoUsers,
    removeSudoUser,
    banUser,
    unbanUser,
    getBannedUsers,
    getSettings,
    updateSetting,
    getGroupSettings,
    updateGroupSetting,
    
    // New time functions
    saveGroupTime,
    getGroupTime,
    setAutoMode,
    getAllGroupsWithAutoSettings,
    disableGroupTime,
    getGroupTimeStatus
};