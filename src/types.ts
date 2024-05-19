export interface Post {
    /** Unique ID from database */
    id: number,
    post_id: string,
    author: string,
    author_link: string,
    message: string,
    attachments: string
}