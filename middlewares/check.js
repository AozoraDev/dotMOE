const crypto = require("crypto");
require("dotenv").config();

/*
Why sending status 200?
What i read in the documentation, the webhook only accept response 200.
*/

function authorization(req, res, next) {
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

function validation (req, res, next) {
    const data = (req.body.entry[0].changes)
    ? req.body.entry[0].changes[0].value
    : {};
    
    if ((data.field !== "feed" && data.verb !== "add")
    // TODO: Validate if its really a post ID
    || (global.lastPostID === data.post_id)) { // Prevent duplication
        return res.sendStatus(200);
    }
    
    next();
}

module.exports = { authorization, validation };