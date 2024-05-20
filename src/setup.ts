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

// https://developers.facebook.com/docs/facebook-login/guides/access-tokens/get-long-lived/
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