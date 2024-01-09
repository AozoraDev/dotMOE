/**
 * A module for handling Mastodon account and stuff.
 * "TOKEN" must be added in env with value Mastodon account secret key.
 * 
 * @file
 * @author AozoraDev
 */
 /** @module utils/masto */

const { createRestAPIClient } = require("masto");
const fs = require("fs");
const db = require("./db");
require("dotenv").config();

// Mastodon client
const client = createRestAPIClient({
    url: "https://sakurajima.moe",
    accessToken: process.env.TOKEN,
});

/** @const {string} visibility - Post visibility for Mastodon post. Can be "public", "private", "direct", or "unlisted" */
const visibility = "public";

/**
 * Upload attachment(s) to the Mastodon instance
 * 
 * @async
 * @param {Array} urls - Array of attachment URLs
 * @returns {Promise<Array>} Array of uploaded attachment's IDs
 */
async function uploadAttachments(urls) {
    const attachments = [];
    
    for (const url of urls) {
        // Fetch the attachment's blob
        const attachment = await fetch(url)
            .then(res => res.blob())
            .catch(console.error);
        
        if (attachment) {
            // Upload it to Mastodon instance if attachment's blob exists
            const uploaded = await client.v2.media.create({
                file: attachment
            })
            .catch(console.error);
            
            // Yet, push the uploaded attachment's ID to array if uploading is successfully
            if (uploaded) attachments.push(uploaded.id);
        }
    }
    
    return attachments;
}

/**
 * Publish post to the Mastodon account
 * 
 * @async
 * @param {Object} obj - Data of the Facebook post inside delayed.json
 * @returns {Promise<Object>} Object of published post
 * @throws {Error} If attachments not available or post failed to get published to Mastodon
 */
async function publishPost(obj) {
    const attachments = await uploadAttachments(obj.attachments);
    if (!attachments.length) throw new Error("Post attachments is not available");
    
    let caption = obj.message;
    caption += "\n\n";
    caption += `Posted by: [${obj.author}](${obj.author_link})`;
    caption += "\n\n";
    caption += "#cute #moe #anime #artwork #mastoart #dotmoe";
    
    try {
        const status = await client.v1.statuses.create({
            status: caption,
            visibility: visibility,
            mediaIds: attachments
        });
        
        return status;
    } catch (err) {
        throw err;
    }
}

/**
 * Resolve Facebook post's attachments to be able posted in Mastodon
 * 
 * @async
 * @param {Object} req - Received request from Facebook webhook
 * @returns {Promise<Array>} URLs of resolved attachments
 */
async function resolveAttachments(req) {
    /** @const {?Object} body - Object data of received post */
    const body = req.body.entry?.[0].changes?.[0].value;
    /** @const {Array} resolved - URLs of resolved attachments */
    const resolved = [];
    
    // Facebook: Multiple photos
    if (body.item == "status" && body.photos) {
        // Get all the attachments
        const result = await fetch(`https://graph.facebook.com/v18.0/${body.post_id}?fields=attachments&access_token=${db.getToken(body.from.id)}`)
            .then(res => res.json())
            .catch(console.error);
        // Just return the empty array if error happends
        if (!result || result.error) return resolved;
        
        /** @const {Array} attachments - First 4 attachments from current Facebook post */
        const attachments = result.attachments.data[0]
            .subattachments.data
            .slice(0, 4);
        
        // Looping for getting the (hopefully) higher quality photos
        for (const attachment of attachments) {
            const photo = await fetch(`https://graph.facebook.com/v18.0/${attachment.target.id}?fields=images&access_token=${db.getToken(body.from.id)}`)
                .then(res => res.json())
                .catch(console.error);
            // Jump to the next image if request is error
            if (!photo || photo.error) continue;
            
            // Push the first photo to resolved variable
            resolved.push(photo.images[0].source);
        }
    }
    
    // Facebook: Single Photo
    else if (body.item == "photo" && body.photo_id) {
        const photo = await fetch(`https://graph.facebook.com/v18.0/${body.photo_id}?fields=images&access_token=${db.getToken(body.from.id)}`)
            .then(res => res.json())
            .catch(console.error);
        
        if (photo && !photo.error) resolved.push(photo.images[0].source);
    }
    
    return resolved;
}

module.exports = {
    publishPost,
    uploadAttachments,
    resolveAttachments
}