/**
 * A webhook server for receiving new posts from Facebook page.
 * Every received post will be saved inside delayed.json file.
 * 
 * @file
 * @author AozoraDev
 */

const fs = require("fs");
const express = require("express");
const check = require("./utils/check");
const masto = require("./utils/masto");
const app = express();

require("./utils/console");
require("dotenv").config();

app.enable("trust proxy"); // Idk
app.use(express.urlencoded({ extended: true })); // Idk too
app.use(express.json({ // This one for get the response body
    verify: (req, res, buf) => {
        // We need the raw body (buffer, actually) to verifying the received post.
        // Received post has sha256 header for checking that the post really from registered webhook.
        // Learn more at [https://developers.facebook.com/docs/graph-api/webhooks/getting-started#validate-payloads]
        req.rawBody = buf;
    }
}));

/** @const {string} path - Path to the list of delayed posts */
const path = "delayed.json";
/** @const {string} endpoint - Endpoint for receiving post from Facebook page webhook */
const endpoint = process.env.ENDPOINT || "/dotmoe";
/** @var {string} lastPostID - Saved last post ID */
let lastPostID = "0";

// See [https://developers.facebook.com/docs/graph-api/webhooks/getting-started#configure-webhooks-product] for more information
app.get(endpoint, (req, res) => {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];
    
    if (mode && token) {
        // AUTH_TOKEN env is your random numbers for authenticating webhook
        if (mode === "subscribe" && token === process.env.AUTH_TOKEN) {
            console.log("Webhook registered!");
            res.status(200).send(challenge);
        } else {
            res.sendStatus(401);
        }
    } else {
        res.redirect("https://sakurajima.moe/@dotmoe");
    }
});

// This endpoint is for receiving new posts from Facebook page webhook.
app.post(endpoint, check.authorization, check.validation, async (req, res) => {
    // Gotta tell the webhook first that we receive the post
    res.sendStatus(200);
    
    /** @const {?Object} data - Object data of received post */
    const data = req.body.entry?.[0].changes?.[0].value;
    
    // Just throw error if received data is empty
    if (!data) throw new Error("Received data is empty");
    
    if (lastPostID == data.post_id) return; // Dont proceed if receiving the same post with the last one or data is null
    console.log(`New post from ${data.from.name}`);
    
    /** @const {Array} arr - The list of delayed posts. It can be empty array if delayed.json not found */
    const arr = (fs.existsSync(path))
        ? JSON.parse(fs.readFileSync(path, { encoding: "utf8" }))
        : [];
    /** @const {Object} main - Needed data for posting the delayed post to Mastodon */
    const main = {
        author: data.from.name,
        author_id: data.from.id,
        author_link: "https://facebook.com/" + data.from.id,
        message: data.message,
        attachments: await masto.resolveAttachments(req)
    }
    
    arr.push(main); // Push the post data to the array
    fs.writeFileSync(path, JSON.stringify(arr, null, 2)); // Then save it as "delayed.json" file
    
    lastPostID = data.post_id; // Prevent duplicate
});

app.listen(process.env.PORT || 8080, () => {
    console.log("Listening!");
});

process.on("uncaughtException", err => {
    console.error(err);
});