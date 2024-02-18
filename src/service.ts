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

import { publishPost } from "utils/masto";
import { getFirstPost } from "utils/db";
import "utils/console";

(async function main() {
    /** Current post from the database that gonna be posted. */
    let post = getFirstPost();
    // If post is empty, just exit already
    if (!post) process.exit(0);

    try {
        console.log(`Publishing post from ${post.author}...`);
        const status = await publishPost(post);
        console.log(`Published with id ${status.id}!`);
    } catch (err) {
        console.error(err);
        console.error("Publishing failed. Will skipping this one and try with another post.");
        return main();
    }

    // Exit if published
    process.exit(0);
})();