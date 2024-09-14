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
import type { Post, PostSQLite } from "types";

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
db.run(
    `CREATE TABLE IF NOT EXISTS Token (
        id VARCHAR(20) PRIMARY KEY,
        token VARCHAR(255)
    )`
);
// Delayed Posts table //
db.run(
    `CREATE TABLE IF NOT EXISTS DelayedPosts (
        post_id VARCHAR(50) PRIMARY KEY,
        author VARCHAR(50),
        author_link TEXT,
        message TEXT,
        attachments TEXT
    )`
);

// Check migration before starting everything
const migrationsPath = path.join(process.cwd(), "db-migrations"); 
const migrationsFiles = readdirSync(migrationsPath);
migrationsFiles.sort();

const latestMigration = parseInt(migrationsFiles.at(-1) || "1");
if (getDBVersion() < latestMigration) {
    console.warn(`Database version is obselete (${getDBVersion()}). Will start migration now!`);

    // TODO:
    // Should be read the range between current db version and the latest migration file.
    // But since the migration file here is just one, i don't need to think about it for now.
    for (const migration of migrationsFiles) {
        console.log(`Executing ${migration}...`);

        const update = await import(path.join(migrationsPath, migration));
        update.default();
    }

    console.log(`Database updated to version ${getDBVersion()}!`);
}

/**
 * Get database version
 */
function getDBVersion() {
    const version = db.query("SELECT version FROM Version")
        .get() as { version: number }; // Will always have value

    return version.version;
}

/**
 * Update database version
 * 
 * @param version - New database version
 */
export function updateDBVersion(version: number) {
    db.prepare("UPDATE Version SET version=? WHERE id=1")
        .run(version);
}

/**
 * Save a post to the database
 * 
 * @param post - Post data object
 */
export function savePost(post: Post) {
    db.prepare(
        `INSERT OR IGNORE INTO DelayedPosts
        (post_id, author, author_link, message, attachments, provider)
        VALUES (?, ?, ?, ?, ?, ?)`
    ).run(
        post.post_id,
        post.author,
        post.author_link,
        post.message,
        JSON.stringify(post.attachments),
        post.provider
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
        .get() as (PostSQLite & { id: number } | null);

    return data;
}

/**
 * Remove post from database
 * 
 * @param id - Post ID on database
 */
export function removePost(id: number) {
    db.prepare(`DELETE FROM DelayedPosts WHERE id = ?`)
        .run(id);
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

    return !!post;
}