const express = require("express");
const bp = require("body-parser");
const sd = require("express-slow-down");
const fetch = require("node-fetch");
const { createRestAPIClient } = require("masto");

require("dotenv").config();

const app = express();
const masto = createRestAPIClient({
    url: process.env.URL,
    accessToken: process.env.TOKEN,
});

app.enable("trust proxy");
app.use(bp.urlencoded({ extended: true }));
app.use(bp.json());

app.get("/dotmoe", (req, res) => {
    res.redirect("https://sakurajima.moe/@dotmoe");
});
app.get("/dotmoe/ping", (req, res) => {
    res.status(200).send("Pong!");
});

/* THE MAIN */
const slowdown = sd({
    windowMs: 15 * 60 * 1000,
    delayMs: 15 * 60 * 1000, // Every 15 minutes
    delayAfter: 1,
    keyGenerator: () => {
        return 69420; // Hehe.
    }
});

app.post("/dotmoe", slowdown, async (req, res) => {
    if (req.headers.authorization !== process.env.AUTH) {
        res.status(401).send("Unauthorized");
        return;
    }
    
    const body = req.body;
    console.log("[.MOE] New post from " + body.author);
    res.status(200).send("OK");
    
    console.log("[.MOE] Publishing...");
    
    // Upload the image first
    const img = await fetch(body.image).then(resp => resp.blob());
    const attachment = await masto.v2.media.create({
        file: img
    });
    
    // Now create the message
    const fbID = body.id.split("_")[0]; // Facebook Page ID
    const link = getURL(body.message); // The source URL
    
    let msg = (link) ? body.message.replace(link, `[${link}](${link})`) : body.message; // Need to replace the URL to MD URL
    msg += "\n\n";
    msg += `Posted by: [${body.author}](https://facebook.com/${fbID})`;
    msg += "\n\n";
    // Hastags~
    msg += "#cute #moe #anime";
    
    // Then, publish it!
    const status = await masto.v1.statuses.create({
        status: msg,
        visibility: "public",
        mediaIds: [attachment.id]
    });
    
    console.log(`[.MOE] Published with id ${status.id}!`)
});
/* THE END */

app.listen(process.env.PORT || 8080, () => {
    console.log("[.MOE] Listening!");
});

// Functions
function getURL(string) {
    // https://uibakery.io/regex-library/url
    const regex = /https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&\/=]*)/g;
    const match = string.match(regex);
    
    if (match) return match[0];
    else return null;
}