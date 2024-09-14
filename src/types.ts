// .MOE Post //
export interface Post {
    post_id: string,
    author: string,
    author_link: string,
    provider: string,
    message: string,
    attachments: string[]
}

export interface PostSQLite extends Omit<Post, "attachments"> {
    attachments: string
}

// Real-CUGAN
export interface iRealCUGAN {
    MAGIC_NUMBERS: { [key: string]: string },
    USE_CUGAN: string[]
}

// CwebP //
export interface WebPConfig {
    /** The quality of compression. Default is 80 */
    quality?: number,
    /** cwebp executable path. Default is from $PATH or `webp` in cwd */
    cwebpPath?: string
    /** Additional options */
    options?: string[]
}

// Facebook //
export interface Error {
    error?: {
        message: string,
        type: string,
        code: number,
        fbtrace_id: string
    }
}

export interface PostAttachments extends Error {
    data: {
        description?: string,
        media: {
            height: number,
            src: string,
            width: number
        },
        subattachments?: PostAttachments,
        target: {
            id: string,
            url: string
        },
        title?: string,
        type: "photo" | "album", // Only accepting album and photo only
        url: string
    }[]
}

export interface PostImages extends Error {
    images: {
        height: number,
        source: string,
        width: number
    }[]
}

export interface Me extends Error {
    name: string,
    id: string
}

// Webhook
export interface WebhookFeed {
    entry: {
        id: string,
        time: number,
        changes: WebhookChanges[]
    }[],
    object: "page" // Should be page
}

export interface WebhookChanges {
    value: {
        from: {
            id: string,
            name: string
        },
        link: string,
        message?: string,
        post_id: string,
        created_time: number,
        item: "photo" | "status", // Should be photo or status
        photos?: string[],
        photo_id?: string,
        published: 0 | 1,
        verb: "add" | "edited"
    },
    field: "feed" // Should be feed
}