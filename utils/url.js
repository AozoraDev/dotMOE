const regex = /https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&\/=]*)/g;

function getURLsFromString(string) {
    // https://uibakery.io/regex-library/url
    const match = string.match(regex);
    
    if (match) return match
    else return [];
}

function toMarkdown(string) {
    return string.replace(regex, match => `[${match}](${match})`);
}

module.exports = {
    getURLsFromString,
    toMarkdown
};