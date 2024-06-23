/**
 * A module to communicate with Mastodon.
 * "TOKEN" should be added to (.)env with the Mastodon token value.
 * 
 * @file
 * @author AozoraDev
 * @todo Due to Bun's lack of compatibility with masto.js regarding Blob,
 *       the temporary solution used was to write the file to temp dir and then create Blob from the file.
 */

import { createRestAPIClient, type mastodon } from "masto";
import CWebP from "utils/cwebp";
import { dotMOE } from "enums";
import type { Post } from "types";

// Mastodon client
const client = createRestAPIClient({
    url: dotMOE.INSTANCE_URL,
    accessToken: Bun.env["TOKEN"]
});

/** Post visibility for Mastodon posts. Can be "public", "private", "direct", or "unlisted". */
const visibility = Bun.env["VISIBILITY"] as (mastodon.v1.StatusVisibility | undefined) || "public";

/**
 * Upload images to the Mastodon instance.
 * 
 * @param urls - An array containing the url to the file. Local file not supported rn.
 * @returns An array containing the IDs of attachments that have been uploaded. Can be empty if all images fetching are failed.
 */
export async function uploadImages(urls: string[]) {
    /** All uploaded images IDs */
    const attachments: string[] = [];
    
    for (const url of urls) {
        console.log(`Fetching ${url}...`);
        const img = await fetch(url)
            .then(res => res.arrayBuffer())
            .catch(console.error);
        
        // Skip current if fetching Blob is failed or temp folder is failed to be created.
        if (!img) {
            console.warn(`Fetching attachment failed for url "${url}". Skipping...`);
            continue;
        }

        const webp = new CWebP(img);
        if (webp.getWidth() > 3840) { // Mastodon has image size limit.
            webp.resize(2000, 0); // Resize the width to 2000 if the image is oversize
        }
        const webpImage = await webp.toBunFile();

        console.log("Uploading image to Mastodon instance...");
        await client.v2.media.create({
            /** @todo Error need to be ignored since Blob in Bun and Node is different */
            // @ts-ignore
            file: new Blob([webpImage])
        }).then(res => {
            console.log("Image uploaded with ID: " + res.id);

            webp.close();
            attachments.push(res.id);
        }).catch(console.error);
    }

    return attachments;
}

/**
 * Publish post to the Mastodon account
 * 
 * @param post - A post object
 * @returns Status object of the uploaded post
 * @throws {Error} The post failed to upload or the saved post has no attachments
 */
export async function publishPost(post: Post) {
    const attachments = await uploadImages(post.attachments.split("|"));
    if (!attachments.length) throw new Error("The post has no attachments.");

    let caption = post.message;
    caption += "\n\n"; // 2 Newline
    caption += `Posted by: [${post.author}](${post.author_link})`;
    caption += "\n\n"; // 2 Newline
    caption += dotMOE.TAGS;

    try {
        console.log("Publishing post....");
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