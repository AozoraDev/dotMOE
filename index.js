const express = require("express");
const crypto = require("crypto");
const fetch = require("node-fetch");
const bp = require("body-parser");
const { AbortController } = require("abort-controller");

require("dotenv").config(); // Read .env file
const app = express(); // Init the express
const controller = new AbortController();

// Some stuff again that i didnt know how it works
app.enable("trust proxy");
app.use(bp.urlencoded({ extended: true }));
app.use(bp.json({
    verify: (req, res, buf) => {
        req.rawBody = buf;
    }
}));

app.get("/dotmoe", (req, res) => {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];
    
    if (mode && token) {
        if (mode === "subscribe" && token === process.env.FB_AUTH_TOKEN) {
            console.log("[.MOE] Webhook connected!");
            res.status(200).send(challenge);
        } else {
            res.sendStatus(401);
        }
    } else {
        res.redirect("https://sakurajima.moe/@dotmoe");
    }
});
app.post("/dotmoe", checkAuthorization, (req, res) => {
    const timeout = setTimeout(() => controller.abort(), 30 * 1000);
    
    fetch(process.env.MOE_SERVICE, {
        method: "POST",
        headers: { ...req.headers, "Content-Type": "application/json" },
        body: req.rawBody,
        signal: controller.signal
    })
    .finally(() => clearTimeout(timeout))
    .catch(console.error);
    
    // Facebook Webhook only accept 200
    res.sendStatus(200);
});

process.on("uncaughtException", err => {
    console.error("[.MOE] UncaughtException:", err);
});
app.listen(process.env.PORT || 8080, () => {
    console.log("[.MOE]", "Listening!");
});

// Functions
function checkAuthorization(req, res, next) {
    const hmac = crypto.createHmac("sha256", process.env.FB_APP_TOKEN)
        .update(req.rawBody)
        .digest("hex");
    const signature = req.headers["x-hub-signature-256"];
    const expectedSignature = `sha256=${hmac}`;
    
    if (!signature || signature !== expectedSignature) {
        return res.sendStatus(200);
    }
    
    next();
}