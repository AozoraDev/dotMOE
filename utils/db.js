/**
 * A module for handling database (SQLite).
 * The database file saved as database.db
 * 
 * @file
 * @author AozoraDev
 */
 /** @module utils/db */

const db = require("better-sqlite3")(process.cwd() + "/database.db");
db.prepare("CREATE TABLE IF NOT EXISTS Token (id VARCHAR(20) PRIMARY KEY, token VARCHAR(255))").run();

/**
 * Get saved access token from page ID
 * 
 * @param {string} id - Facebook Page ID
 * @returns {string} Access token
 */
function getToken(id) {
    const res = db.prepare("SELECT token FROM Token WHERE id = ?")
        .get(id);
    
    return res?.token;
}

/**
 * Insert/update token from page ID 
 * 
 * @param {string} id - Facebook Page ID
 * @param {string} token - Access Token
 * @returns {void}
 */
function setToken(id, token) {
    db.prepare(`INSERT OR REPLACE INTO Token (id, token) VALUES ('${id}', '${token}')`)
        .run();
}

module.exports = {
    getToken,
    setToken
}