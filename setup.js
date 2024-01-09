/**
 * For adding/updating saved access token inside database.
 * See line 22 - 27 for tutorial getting access token.
 * 
 * @file
 * @author AozoraDev
 */

const db = require("./utils/db");
const readline = require("readline/promises");
const fs = require("fs");
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

(async () => {
    // Exit if not run directly.
    // Who the frick gonna do that? This is not labeled as module tho.
    if (require.main != module) process.exit(1);
    
    // Use Graph Explorer to get page access token (long-lived version).
    // Following permission must be added:
    // [public_profile, pages_manage_metadata, pages_read_engagement, pages_show_list]
    // After that, open (Access Token Debugger)[https://developers.facebook.com/tools/debug/access_token], enter your access token page, click "Debug"
    // and then click "Extend Access Token".
    // New long-lived access token should be appear below the button.
    const token = await rl.question("Facebook Page's access token: ");
    rl.close();
    
    console.log("Verifying access token...");
    const me = await fetch("https://graph.facebook.com/v18.0/me?fields=id%2Cname&access_token=" + token)
        .then(res => res.json());
    
    // Exit if token is not valid or error.
    if (me.error) {
        console.error("Token is not valid. Exiting...");
        process.exit(1);
    }
    
    // Verified. Save the id and token to the database.db
    console.log(`Verified as ${me.name} with id ${me.id}. Saving token...`);
    db.setToken(me.id, token);
    console.log("Token saved to the database!")
})();