#!/usr/bin/env bun

/**
 * This script works as a receiver of webhook data.
 * Any data that is received and passes the check will be stored in the "delayed.json" file for use by service.ts.
 * 
 * @file
 * @author AozoraDev
 */

import express from "express";
import cors from "cors";
import crypto from "node:crypto";
import { resolveImages, postValidation } from "handlers/facebook";
import { isFacebookPostExist, savePost } from "utils/db";
import "utils/console";

import type { WebhookFeed, WebhookChanges } from "types";

const app = express();
app.enable("trust proxy");
app.use(cors());
app.use(express.urlencoded({ extended: true }));

/** The endpoint used by the receiver where the webhook sends data. */
const endpoint = Bun.env["ENDPOINT"] || "/dotmoe";

// See [https://developers.facebook.com/docs/graph-api/webhooks/getting-started#configure-webhooks-product] for more information
app.get(endpoint, (req, res) => {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];
    
    if (mode && token) {
        // AUTH_TOKEN env is your random numbers for authenticating webhook
        if (mode === "subscribe" && token === Bun.env["AUTH_TOKEN"]) {
            console.log("Webhook registered!");
            res.status(200).send(challenge);
        } else {
            res.sendStatus(401);
        }
    } else {
        res.redirect("https://sakurajima.moe/@dotmoe");
    }
});

// Webhook receiver
app.post(endpoint,
    express.json({ verify: (req, _res, buf) => {
        const hmac = crypto.createHmac("sha256", Bun.env["APP_TOKEN"] || "0")
            .update(buf)
            .digest("hex");
        
        /** Body signature for validating */
        const signature = req.headers["x-hub-signature-256"];
        const expectedSignature = "sha256=" + hmac;

        // Throw error if signature not match
        if (signature !== expectedSignature) throw new Error("Signature not match");
    } }),
    async (req, res) => {
        // Gotta tell the webhook first that we receive the post
        res.sendStatus(200);
        
        /** The body of received post */
        const body: WebhookFeed = req.body;
        // Throw error if body is empty or body doesn't have entry and object property or the value of object property is not page
        if (!body || !(body.entry && body.object) || body.object !== "page") {
            throw new Error("Received data is empty or not from webhook.");
        }

        /** The received data */
        const data: WebhookChanges = body.entry[0].changes[0];
        // Stop if the current post ID is already exist
        if (isFacebookPostExist(data.value.post_id)) return;

        // Save post to the database if passed validation
        if (postValidation(data)) {
            console.log(`New post from ${data.value.from.name}`);
            savePost({
                post_id: data.value.post_id,
                author: data.value.from.name,
                author_link: "https://facebook.com/" + data.value.from.id,
                message: data.value.message as string, // It will always string because postValidation will check it
                attachments: (await resolveImages(data)).join("|") // Since sqlite doesn't support array type, we need to serialize it to string
            });
        }
    }
);

app.listen(Bun.env["PORT"] || 8080, () => {
    console.log("Listening!");
});

process.on("uncaughtException", err => {
    console.error(err);
});