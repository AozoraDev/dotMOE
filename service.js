/**
 * This is for posting the delayed post to the Mastodon account.
 * Must be executed using cronjob at a reasonable interval determined by the Mastodon instance.
 * 
 * @file
 * @author AozoraDev
 */

const fs = require("fs");
const masto = require("./utils/masto");
require("./utils/console");

/** @const {string} path - Path to the list of delayed posts */
const path = "./delayed.json";
/** @const {Array} posts - An array of delayed posts. The value will be empty array if the file is not exist */
const posts = (fs.existsSync(path))
    ? JSON.parse(fs.readFileSync(path, { encoding: "utf8" }))
    : [];
/** @const {?Object} data - First delayed post data */
const data = posts[0];

(async () => {
    // Exit the program if data is empty
    if (!data) process.exit(0);
    
    try {
        console.log(`Publishing post from ${data.author}...`);
        const status = await masto.publishPost(data);
        console.log(`Published with id ${status.id}!`);
    } catch (err) {
        console.error("Publishing failed. This post will be skipped.");
    }
    
    const newPosts = posts.slice(1) // Remove the first object in posts array
    fs.writeFileSync(path, JSON.stringify(newPosts, null, 2)); // Save it again as file
    process.exit(0); // Fin
})();