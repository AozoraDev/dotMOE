const express = require("express");
const fs = require("fs");
const masto = require("./utils/masto");

// Middlewares
const check = require("./middlewares/check");
const nudeParser = require("body-parser");

// And stuff
require("dotenv").config();
const app = express();
const path = "./delayed.json";

// Global variable
global.lastPostID = 0;

app.enable("trust proxy");
app.use(nudeParser.urlencoded({ extended: true }));
app.use(nudeParser.json({
    verify: (req, res, buf) => {
        req.rawBody = buf;
    }
}));

// Main service
app.get("/", (req, res) => res.sendStatus(200));

app.post("/", check.authorization, check.validation, (req, res) => {
    const data = req.body.entry[0].changes[0].value;
    
    try {
        console.log("[.MOE (Service)]", `New post from ${data.from.name}`);
        
        const arr = JSON.parse(fs.readFileSync(path, { encoding: "utf8" }));
        arr.push(data);
        fs.writeFileSync(path, JSON.stringify(arr, null, 2));
        
        global.lastPostID = data.post_id; // Prevent duplication
        masto.updateDelayedPostsField(arr.length);
    } catch (err) {
        console.error("[.MOE (Service)]", err);
    }
    
    res.sendStatus(200);
});

process.on("uncaughtException", err => {
    console.error("[.MOE (Service)] UncaughtException:", err);
});

// Alwaysdata Service only accept IPv6
app.listen(process.env.PORT || 8300, "::", () => {
    console.log("[.MOE (Service)] Listening!")
});

// Delay postting every 15 minutes.
setInterval(async () => {
    const path = "./delayed.json";
    
    try {
        // Get the first delayed post
        let parsed = JSON.parse(fs.readFileSync(path, { encoding: "utf8" }));
        const data = parsed[0];
        if (!data) return; // If data is null
        
        // Check if the post still available
        if (!(await masto.isPostAvailable(data.post_id))) {
            console.log("[.MOE (Service)]", "Post is not available. Skipping.");
            return updateDelayed(parsed);
        }
        
        const main = {
            author: data.from.name,
            author_id: data.from.id,
            author_link: "https://facebook.com/" + data.from.id,
            message: data.message,
            attachments: await masto.resolveImages(data)
        }
        
        console.log(`[.MOE (Service)]`, `Publishing post from ${data.from.name}...`);
        const status = await masto.publishPost(main);
        console.log(`[.MOE (Service)]`, `Published with id ${status.id}!`);
        
        updateDelayed(parsed)
    } catch (err) {
        console.error("[.MOE (Service)]", err);
    }
}, 30 * 60 * 1000);

// Functions
function updateDelayed(parsed) {
    const path = "./delayed.json";
    
    parsed.shift(); // Remove the first in array.
    fs.writeFileSync(path, JSON.stringify(parsed, null, 2));
    masto.updateDelayedPostsField(parsed.length);
}