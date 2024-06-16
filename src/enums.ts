import path from "path";

// WebP
export const WebP = {
    QUALITY: 80,
    VERSION: "1.4.0",

    DOWNLOADED_PATH: path.join(process.cwd(), "webp-bin"),
    LOCAL_CWEBP_PATH: path.join(process.cwd(), "webp", "bin", "cwebp")
}

// .MOE
export const dotMOE = {
    INSTANCE_URL: "https://sakurajima.moe",
    TAGS: "#cute #moe #anime #artwork #mastoart #dotmoe"
}