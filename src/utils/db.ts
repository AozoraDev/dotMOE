/**
 * A module for handling database (SQLite).
 * The database file saved as database.db in root of the project
 * 
 * @file
 * @author AozoraDev
 */

import { Database } from "bun:sqlite";
import type { Post } from "types";
const db = new Database("database.db");

// Some initiation stuff if the databasse is empty
// Token table //
db.query(
    `CREATE TABLE IF NOT EXISTS Token (
        id VARCHAR(20) PRIMARY KEY,
        token VARCHAR(255)
    )`
).run();
// Delayed Posts table //
db.query(
    `CREATE TABLE IF NOT EXISTS DelayedPosts (
        post_id VARCHAR(50) PRIMARY KEY,
        author VARCHAR(50),
        author_link TEXT,
        message TEXT,
        attachments TEXT
    )`
).run();

/**
 * Get saved access token from page ID
 * 
 * @param id - Facebook Page ID
 * @returns Facebook Page access token
 */
export function getToken(id: string) {
    const res = db.query("SELECT token FROM Token WHERE id = ?")
        .get(id) as Record<string, string>;
    
    return res?.["token"] as (string | null);
}

/**
 * Insert or update access token from Page ID
 * 
 * @param id - Facebook Page ID
 * @param token - Access token
 */
export function setToken(id: string, token: string) {
    db.prepare("INSERT OR REPLACE INTO Token (id, token) VALUES (?, ?)")
        .run(id, token);
}

/**
 * Save a post to the database
 * 
 * @param post - Post data object
 */
export function savePost(post: Post) {
    db.prepare(
        `INSERT OR IGNORE INTO DelayedPosts
        (post_id, author, author_link, message, attachments)
        VALUES (?, ?, ?, ?, ?)`
    ).run(
        post.post_id,
        post.author,
        post.author_link,
        post.message,
        post.attachments
    );
}

/**
 * Get the first post from the database.
 * After fetching, the data will be deleted.
 * 
 * @return The first post from the table, `null` if not found
 */
export function getFirstPost() {
    const data = db.prepare("SELECT * FROM DelayedPosts")
        .get() as (Post | null);
    
    // Delete the data after fetching
    if (data) db.prepare(`DELETE FROM DelayedPosts WHERE post_id = ?`)
        .run(data.post_id);

    return data;
}

/**
 * Check if the facebook post already exist in datababse
 * 
 * @param postID - The post id
 * @return `true` if the post already exists in the database, `false` if not.
 */
export function isFacebookPostExist(postID: string) {
    const post = db.prepare(
        `SELECT post_id FROM DelayedPosts WHERE post_id = ?`
    ).get(postID) as (string | null);

    return (post) ? true : false;
}