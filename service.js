const express = require("express");
const fetch = require("node-fetch");
const { createRestAPIClient } = require("masto");

// Middlewares
const checkAuthorization = require("./middlewares/checkAuthorization");
const nudeParser = require("body-parser");
const calmDown = require("express-slow-down");

// And stuff
require("dotenv").config();
const app = express();

// Global variable
global.lastPostID = global.delayedPosts = 0;

// Initiate middlewares
app.enable("trust proxy");
app.use(nudeParser.urlencoded({ extended: true }));
app.use(nudeParser.json({
    verify: (req, res, buf) => {
        req.rawBody = buf;
    }
}));
const slowDown = calmDown({
    windowMs: 20 * 60 * 1000,
    delayMs: 20 * 60 * 1000, // Every 20 minutes
    delayAfter: 1,
    keyGenerator: () => { return 69420; }
});

// Initiate Mastodon
const masto = createRestAPIClient({
    url: "https://sakurajima.moe",
    accessToken: process.env.TOKEN,
});

// Main service
app.get("/", (req, res) => res.sendStatus(200));
app.post("/", checkAuthorization, slowDown, async (req, res) => {
    const data = req.body.entry[0].changes[0].value;
    console.log(`[.MOE (Service)] Publishing post from ${data.from.name}...`);
    
    // Some needed values
    const main = {
        author: data.from.name,
        author_link: "https://facebook.com/" + data.from.id,
        message: data.message,
        attachments: []
    }
    
    // Process the attachments
    // TODO: Support video and multiple attachment
    if (data.item == "photo") {
        const hqImage = await fetch(`https://graph.facebook.com/v18.0/${data.photo_id}?fields=images&access_token=${process.env.MOE_TOKEN}`).then(resp => resp.json());
        if (!hqImage.error) main.attachments.push(hqImage.images[0].source);
    }
    
    // Check if all needed stuff exist
    if (main.message && main.attachments.length) {
        // Upload the attachments first
        const attachments = [];
        
        // TODO: See line 52
        for (const media of main.attachments) {
            const attachment = await fetch(media).then(resp => resp.blob());
            const uploaded = await masto.v2.media.create({
                file: attachment
            });
            
            attachments.push(uploaded.id);
        }
        
        // Now create the message
        const link = getURL(main.message); // The source URL
        let msg = (link) ? main.message.replace(link, `[${link}](${link})`) : main.message; // Need to replace the URL to MD URL
        msg += "\n\n";
        msg += `Posted by: [${main.author}](${main.author_link})`;
        msg += "\n\n";
        // Hastags~
        msg += "#cute #moe #anime";
        
        // Then, publish it!
        const status = await masto.v1.statuses.create({
            status: msg,
            visibility: "public",
            mediaIds: attachments
        });
        
        console.log(`[.MOE (Service)] Published with id ${status.id}!`);
        res.sendStatus(200);
    } else {
        console.error("[.MOE (Service)] Publishing failed!");
        res.sendStatus(400);
    }
    
    global.delayedPosts--;
});

process.on("uncaughtException", err => {
    console.error("[.MOE (Service)] UncaughtException:", err);
});

// Alwaysdata Service only accept IPv6
app.listen(process.env.PORT || 8300, "::", () => {
    console.log("[.MOE (Service)] Listening!")
});

// Update delayed posts field every 10 mins
setInterval(async () => {
    const obj = {};
    const oldFields = await masto.v1.accounts.verify_credentials().then(res => res.fields);
    
    if (!oldFields) return; // Just in case...
    oldFields.forEach((f, i) => {
        obj[i] = {};
        obj[i].name = f.name;
        
        // The delayed posts field should be in second place
        if (i === 1) {
            obj[i].name = `Delayed Posts (${new Date().toUTCString()})`;
            obj[i].value = String(global.delayedPosts);
        } else {
            // URL Field is kind of broken, so uhm...
            const URL = getURL(f.value);
            obj[i].value = (URL) ? URL : f.value;
        }
    });
    
    masto.v1.accounts.update_credentials({
        fields_attributes: obj
    }).catch(err => console.error("[.MOE] Updating field failed!"))
}, 10 * 60 * 1000);

// Functions
function getURL(string) {
    // https://uibakery.io/regex-library/url
    const regex = /https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&\/=]*)/g;
    const match = string.match(regex);
    
    if (match) return match[0];
    else return null;
}