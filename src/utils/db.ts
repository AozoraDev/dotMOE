/**
 * A module for handling database (SQLite).
 * The database file saved as database.db in root of the project
 * 
 * @file
 * @author AozoraDev
 */

import path from "path";
import { readdirSync } from "node:fs";
import { Database } from "bun:sqlite";
import type { Post } from "types";

const db = new Database("database.db");

// Some initiation stuff if the databasse is empty //
// The SQL code below is version 1 but migration code will take care of new database format //

// Version
db.run(
    `CREATE TABLE IF NOT EXISTS Version (
        id INTEGER PRIMARY KEY,
        version INTEGER
    );
    INSERT OR IGNORE INTO Version (id, version) VALUES (1, 1)`
);
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

// Check migration before starting everything
const migFiles = readdirSync(path.join(__dirname, "migrations"));
migFiles.sort((a, b) => parseInt(a.split(".")[0]) - parseInt(b.split(".")[0])); // Sort it
const lastestMig = parseInt(migFiles.at(-1) as string); // Will always have value

if (getDBVersion() < lastestMig) {
    console.warn(`Database version is obselete (${getDBVersion()}). Will start migration now!`);

    // TODO:
    // Should be read the range between current db version and the latest migration file.
    // But since the migration file here is just one, i don't need to think about it for now.
    for (const mig of migFiles) {
        console.log(`Executing ${mig}...`);

        const update = await import(path.join(__dirname, "migrations", mig));
        update.default();
    }

    console.log(`Database updated to version ${getDBVersion()}!`);
}

/**
 * Get database version
 */
function getDBVersion() {
    const version = db.query(
        `SELECT version FROM Version`
    ).get() as { version: number };

    return version.version;
}

/**
 * Update database version
 * 
 * @param version - New database version
 */
export function updateDBVersion(version: number) {
    db.prepare(
        `UPDATE Version SET version=? WHERE id=1`
    ).run(version);
}

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
    if (data) db.prepare(`DELETE FROM DelayedPosts WHERE id = ?`)
        .run(data.id);

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