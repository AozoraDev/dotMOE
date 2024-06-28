#!/usr/bin/env bun

/**
 * This is a script to run the posting function to Mastodon.
 * Each post stored in the database will be posted at a certain interval.
 * Please pay attention to the rules of each instance before determining the posting interval.
 * The script needs to be run using cronjob.
 * 
 * @file
 * @author AozoraDev
 */

import { publishPost } from "mastodon";
import { getFirstPost } from "utils/db";
import type { Post } from "types";
import "utils/console";

(async function main() {
    const post = getFirstPost();
    if (!post) process.exit(0);

    const resolved: Post = {
        ...post,
        attachments: JSON.parse(post.attachments)
    }

    try {
        console.log(`Publishing post from ${post.author}...`);
        const status = await publishPost(resolved);
        console.log(`Published with id ${status.id}!`);
    } catch (err) {
        console.error(err);
        console.error("Publishing failed. Will skipping this one and try with another post.");
        return main();
    }

    // Exit if published
    process.exit(0);
})();