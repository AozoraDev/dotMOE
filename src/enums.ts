import path from "path";
import type { iRealCUGAN } from "types";

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

// Real-CUGAN
export const RealCUGAN: iRealCUGAN = {
    MAGIC_NUMBERS: {
        jpeg: "FFD8FFEE",
        jpg: "FFD8FFE0",
        png: "89504E47",
        webp: "52494646"
    },
    USE_CUGAN: ["Facebook"]
}