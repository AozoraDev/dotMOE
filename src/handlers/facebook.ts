/**
 * This is a module for handling Facebook, containing utilities and shits.
 * 
 * @file
 * @author AozoraDev
 */
import * as db from "utils/db";
import type { WebhookChanges, PostAttachments, PostImages } from "types";

/**
 * Resolve Facebook images to get (hopefully) high-quality images.
 * 
 * @param post - Post object from webhook
 * @returns URLs of resolved images
 */
export async function resolveImages(post: WebhookChanges) {
    /** Contains URLs of high quality versions of the resolved images. */
    const resolved: string[] = [];

    // Multiple photos
    if (post.value.item == "status" && post.value.photos) {
        // Get all attachments from the post
        const result = await fetch(`https://graph.facebook.com/v18.0/${post.value.post_id}/attachments?access_token=${db.getToken(post.value.from.id)}`)
            .then(res => res.json() as Promise<PostAttachments>)
            .catch(console.error);
        if (!result || result.error) throw new Error(result?.error?.message || "Failed to fetch image.");

        /** All attachments in a post, limited to 4. */
        const attachments = result.data[0]
            .subattachments?.data
            .slice(0, 4);
        
        // Looping for getting (hopefully) higher quality images
        if (attachments) for (const attachment of attachments) {
            const photo = await fetch(`https://graph.facebook.com/v18.0/${attachment.target.id}?fields=images&access_token=${db.getToken(post.value.from.id)}`)
                .then(res => res.json() as Promise<PostImages>)
                .catch(console.error);
            // Jump to the next image if the next request is error
            if (!photo || photo.error) continue;

            resolved.push(photo.images[0].source);
        }
    }

    // Single photo
    else if (post.value.item == "photo" && post.value.photo_id) {
        const photo = await fetch(`https://graph.facebook.com/v18.0/${post.value.photo_id}?fields=images&access_token=${db.getToken(post.value.from.id)}`)
            .then(res => res.json() as Promise<PostImages>)
            .catch(console.error);
        
        if (photo && !photo.error) resolved.push(photo.images[0].source);
    }

    return resolved;
}

/**
 * Validate which post parameters must be present before saving to the database.
 * 
 * @param post - Post object from webhook
 * @returns `true` if post object is passed validation, `false` if otherwise.
 */
export function postValidation(post: WebhookChanges) {
    /** A regex for checking if a URL is exist */
    const regex = /https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&\/=]*)/g;

    /** The data must be of type post */
    const isValidField: boolean = post.field === "feed" || !!post.value.post_id;
    /** The message must have url in it*/
    const isValidMessage: boolean = !!String(post.value.message).match(regex);
    const isValidAttachments: boolean = !!(post.value.photos || post.value.photo_id);

    return isValidField && isValidMessage && isValidAttachments;
}