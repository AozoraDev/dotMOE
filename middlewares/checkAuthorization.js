const crypto = require("crypto");
require("dotenv").config();

module.exports = (req, res, next) => {
    // Check 1: Authorization
    const hmac = crypto.createHmac("sha256", process.env.FB_APP_TOKEN)
        .update(req.rawBody)
        .digest("hex");
    const signature = req.headers["x-hub-signature-256"];
    const expectedSignature = `sha256=${hmac}`;
    
    if (!signature || signature !== expectedSignature) {
        return res.sendStatus(401);
    }
    // END //
    
    // Check 2: Post validation //
    const data = (req.body.entry[0].changes)
    ? req.body.entry[0].changes[0].value
    : {};
    
    if ((data.field !== "feed" && data.verb !== "add")
    // TODO: Validate if its really a post ID
    || (global.lastPostID === data.post_id)) { // Prevent duplication
        return res.sendStatus(400);
    }
    // END //
    
    // If authorized, just go ahead
    console.log("[.MOE (Service)]", `New post from ${data.from.name}`);
    if (global.delayedPosts) console.log("[.MOE (Service)]", `Delaying post from ${data.from.name}`);
    global.delayedPosts++;
    global.lastPostID = data.post_id; // Prevent duplication
    
    next();
}