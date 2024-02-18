#!/usr/bin/env bun

/**
 * A cli for setting up dotMOE.
 * Must be run for the first time or if you want to add a new token key.
 * 
 * @file
 * @author AozoraDev
 */

import readline from "node:readline/promises";
import { setToken } from "utils/db";
import type { Me } from "handlers/facebook";

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Use Graph Explorer to get page access token (long-lived version).
// Following permission must be added:
// [public_profile, pages_manage_metadata, pages_read_engagement, pages_show_list]
// After that, open (Access Token Debugger)[https://developers.facebook.com/tools/debug/access_token], enter your access token page, click "Debug"
// and then click "Extend Access Token".
// New long-lived access token should be appear below the button.
const token = await rl.question("Facebook Page's access token: ");
rl.close();

if (!token) {
    console.error("Input is empty. Exitting...");
    process.exit(1);
}

console.log("Verifying access token...");
const me = await fetch("https://graph.facebook.com/v18.0/me?access_token=" + token)
    .then(res => res.json())
    .catch(console.error) as (Me | undefined);

// Exit if token is invalid or error
if (!me || me.error) {
    console.error("Token is not valid or there's a problem with your request. Exiting...");
    process.exit(1);
}

// Verified. Save the id and the token to the database
console.log(`Verified as ${me.name} with id ${me.id}. Saving token...`);
setToken(me.id, token);
console.log("Token is saved to the database");

// Exit
process.exit(0);