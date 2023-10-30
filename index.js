const express = require("express");
const fetch = require("node-fetch");
const bp = require("body-parser");
const { authorization } = require("./middlewares/check");

require("dotenv").config(); // Read .env file
const app = express(); // Init the express

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
app.post("/dotmoe", authorization, (req, res) => {
    fetch(process.env.MOE_SERVICE, {
        method: "POST",
        headers: { ...req.headers, "Content-Type": "application/json" },
        body: req.rawBody,
    })
    .catch(console.error);
    
    // Facebook Webhook only accept 200
    res.sendStatus(200);
});

app.listen(process.env.PORT || 8080, () => {
    console.log("[.MOE]", "Listening!");
});