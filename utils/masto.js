const { createRestAPIClient } = require("masto");
const { getURLsFromString, toMarkdown } = require("./url.js");
const fetch = require("node-fetch");
require("dotenv").config();

// Initiate client
const client = createRestAPIClient({
    url: "https://sakurajima.moe",
    accessToken: process.env.TOKEN,
});

// For debug?
const visibility = "public";

async function updateDelayedPostsField(value) {
    // Get all the fields
    const fields = await client.v1.accounts.verify_credentials()
    .then(res => res.fields);
    
    // Create new entries with some configuration
    const entries = fields.map((field, index) => {
        const obj = {};
        obj.name = field.name;
        
        // The delayed posts field should be in second place
        if (index === 1) {
            obj.name = `Delayed Posts (${new Date().toUTCString()})`;
            obj.value = String(value);
        } else {
            // URL Field is kind of broken, so uhm...
            const URL = getURLsFromString(field.value)[0];
            obj.value = (URL) ? URL : field.value;
        }
        
        return [index, obj];
    });
    
    // Now create the object from entries
    const obj = Object.fromEntries(entries);
    
    client.v1.accounts.update_credentials({
        fields_attributes: obj
    }).catch(console.error);
}

async function uploadAttachments(arr) {
    const attachments = [];
    
    for (const media of arr) {
        const attachment = await fetch(media).then(resp => resp.blob());
        const uploaded = await client.v2.media.create({
            file: attachment
        });
        
        attachments.push(uploaded.id);
    }
    
    // Return array of uploaded attachments id
    return attachments;
}

async function publishPost(obj) {
    const attachments = await uploadAttachments(obj.attachments);
    
    let message = toMarkdown(obj.message);
    message += "\n\n";
    message += `Posted by: [${obj.author}](${obj.author_link})`;
    message += "\n\n";
    message += "#cute #moe #anime";
    
    const status = await client.v1.statuses.create({
        status: message,
        visibility: visibility,
        mediaIds: attachments
    });
    
    return status;
}

// Note: body param should be req.body.entry[0].changes[0].value;
// This will handle photo(s) for (hopefully) getting the higher quality photo(s).
// TODO: Resolve video too.
async function resolveImages(body) {
    const resolved = [];
    
    // Multiple photos
    if (body.item == "status" && body.photos) {
        // Get all the attachments first.
        const result = await fetch(`https://graph.facebook.com/v18.0/${body.post_id}?fields=attachments&access_token=${process.env.MOE_TOKEN}`)
        .then(res => res.json())
        .catch(console.error);
        
        if (!result || result.error) throw new Error("Failed to do request with Meta API");
        const attachments = result.attachments.data[0].subattachments.data;
        
        // Loop the attachments to do request again.
        for (const attachment of attachments) {
            const photo = await fetch(`https://graph.facebook.com/v18.0/${attachment.target.id}?fields=images&access_token=${process.env.MOE_TOKEN}`)
            .then(resp => resp.json())
            .catch(console.error);
            
            // Now push the first photo to resolved
            if (photo && !photo.error) resolved.push(photo.images[0].source);
        }
    }
    // Singe photo post
    else if (body.item == "photo" && body.photo_id) {
        const photo = await fetch(`https://graph.facebook.com/v18.0/${body.photo_id}?fields=images&access_token=${process.env.MOE_TOKEN}`)
        .then(resp => resp.json())
        .catch(console.error);
        
        if (photo && !photo.error) resolved.push(photo.images[0].source);
    }
    
    return resolved;
}

module.exports = {
    updateDelayedPostsField,
    publishPost,
    uploadAttachments,
    resolveImages
}