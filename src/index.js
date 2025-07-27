const CONFIG = {
    addonName: "My Files",
    premiumizeFolderId: "",
    premiumizeApiKey: "",
    rpdbApiKey: "",
};

const MANIFEST = {
    id: "stremio.premiumize.worker",
    version: "1.0.0",
    name: CONFIG.addonName,
    description: "Stream your files from Premiumize within Stremio!",
    catalogs: [],
    resources: [
        { name: "catalog", types: ["movie", "series"] },
        { name: "meta", types: ["movie", "series"], idPrefixes: ["premiumize-"] },
        { name: "stream", types: ["movie", "series"], idPrefixes: ["premiumize-", "tmdb:", "tt"] }
    ],
    types: ["movie", "series"]
};

const HEADERS = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,HEAD,POST,OPTIONS",
    "Access-Control-Max-Age": "86400",
};

const API_ENDPOINTS = {
    PREMIUMIZE_FOLDER_LIST: "https://www.premiumize.me/api/folder/list?apikey={apiKey}&id={folderId}",
    PREMIUMIZE_FOLDER_SEARCH: "https://www.premiumize.me/api/folder/search?apikey={apiKey}&q={query}",
    PREMIUMIZE_ITEM_DETAILS: "https://www.premiumize.me/api/item/details?apikey={apiKey}&id={itemId}",
    RPDB_POSTER: "https://api.ratingposterdb.com/{api_key}/{source}/poster-default/{id}.jpg",
};

const REGEX_PATTERNS = {
    Stream: /^\/stream\/(movie|series)\/([a-zA-Z0-9:%\-\._]+)\.json$/,
    Catalog: new RegExp(`^/catalog/${CONFIG.addonName.replace(/ /g, '(?: |%20)')}/(premiumize-\\w+)\\.json$`),
    Meta: /^\/meta\/(movie|series)\/premiumize-([^\.]+)\.json$/,
};

function formatSize(bytes) {
    if (bytes === 0){
        return "0B";
    }
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const k = 1000;
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + sizes[i];
}

function replaceParams(url, params) {
    for (const key in params) {
        url = url.replace(`{${key}}`, encodeURIComponent(params[key] || ""));
    }
    return url;
}

async function folderList(id) {
    const url = replaceParams(API_ENDPOINTS.PREMIUMIZE_FOLDER_LIST, {
        apiKey: CONFIG.premiumizeApiKey,
        folderId: id || ""
    });
    const response = await fetch(url);
    const json = await response.json();
    return json || [];
}

async function itemDetails(id) {
    const url = replaceParams(API_ENDPOINTS.PREMIUMIZE_ITEM_DETAILS, {
        apiKey: CONFIG.premiumizeApiKey,
        itemId: id
    });
    const response = await fetch(url);
    const json = await response.json();
    return json || {};
}

async function folderSearch(query) {
    const url = replaceParams(API_ENDPOINTS.PREMIUMIZE_FOLDER_SEARCH, {
        apiKey: CONFIG.premiumizeApiKey,
        query: query
    });
    const response = await fetch(url);
    const json = await response.json();
    if (json.status === "success" && json.content && json.content.length > 0) {
        return json.content[0];
    }
    return null;
}

function extractIdsFromName(name) {
    const match = name.match(/\[tt(\d+)-(\d+)\]/i);
    if (match) {
        return {
            imdb: `tt${match[1]}`,
            tmdb: `tmdb:${match[2]}`
        };
    }
    return {};
}

function cleanName(name) {
    return name.replace(/\s*\[tt\d+-\d+\]$/, '').trim();
}

function getPosterUrl(id) {
    if (id && id.imdb) {
        return API_ENDPOINTS.RPDB_POSTER
            .replace("{api_key}", CONFIG.rpdbApiKey)
            .replace("{source}", "imdb")
            .replace("{id}", id.imdb);
    }
    return null;
}

async function getMetas(id) {
    const contents = await folderList(id).content;
    const files = contents.filter(item => item.type === "file" && /\.(mp4|mkv|avi)$/i.test(item.name));
    const folders = contents.filter(item => item.type === "folder");
    if (files.length >= folders.length) {
        return collectMovies(contents);
    } else {
        return collectSeries(contents);
    }
}

async function collectMovies(contents) {
    return contents.filter(item => item.type === "file" && /\.(mp4|mkv|avi)$/i.test(item.name)).map(file => {
        const ids = extractIdsFromName(file.name);
        return {
            id: ids.tmdb || `premiumize-${file.id}`,
            type: "movie",
            name: cleanName(file.name.replace(/\.(mp4|mkv|avi)$/i, "")),
            poster: getPosterUrl(ids),
            description: null
        };
    });
}

async function collectSeries(contents) {
    const series = [];
    for (const show of contents.filter(item => item.type === "folder")) {
        const ids = extractIdsFromName(show.name);
        series.push({
            id: ids.tmdb || `premiumize-${show.id}`,
            type: "series",
            name: cleanName(show.name.replace(/\.(mp4|mkv|avi)$/i, "")),
            poster: getPosterUrl(ids),
            description: null
        });
    }
    return series;
}

async function collectEpisodes(id) {
    const contents = await folderList(id).content;
    return contents.filter(item => item.type === "file" && /S\d{2}E\d{2}/i.test(item.name) && /\.(mp4|mkv|avi)$/i.test(item.name));
}

async function getMeta(id, type) {
    if (type === "movie") {
        const file = await itemDetails(id);
        return {
            id: `premiumize-${file.id}`,
            type: type,
            name: cleanName(file.name.replace(/\.(mp4|mkv|avi)$/i, "")) || "Movie",
            poster: null,
            description: null
        };
    }
    else if (type === "series") {
        const files = await collectEpisodes(id);
        const videosBySeason = {};
        for (const file of files) {
            const match = file.name.match(/S(\d{2})E(\d{2})/i);
            if (match) {
                const season = parseInt(match[1]);
                const episode = parseInt(match[2]);
                if (!videosBySeason[season]) videosBySeason[season] = [];
                videosBySeason[season].push({
                    id: `premiumize-${file.id}`,
                    title: `S${season}:E${episode}`,
                    season,
                    episode,
                    released: "2000-01-01T00:00:00.000Z"
                });
            }
        }
        const allEpisodes = Object.entries(videosBySeason).flatMap(([seasonNum, episodes]) =>
            episodes.map(episode => ({
                id: `${episode.id}`,
                title: `S${ep.season}:E${episode.episode}`,
                season: episode.season,
                episode: episode.episode,
                released: episode.released
            }))
        );
        return {
            id,
            type: type,
            name: cleanName(files[0].name.replace(/\.(mp4|mkv|avi)$/i, "").replace(/S(\d{2})E(\d{2})/i, "")) || "TV Show",
            poster: null,
            description: null,
            background: null,
            genres: [],
            cast: [],
            director: [],
            runtime: null,
            videos: allEpisodes
        };
    }
    else {
        return null;
    }
}

async function getStreams(id) {
    let details = null;
    id = decodeURIComponent(id);
    if (id.startsWith("premiumize-")) {
        const fileId = id.split("premiumize-")[1];
        details = await itemDetails(fileId);
    }
    else if (/^tt\d+:\d+:\d+$/.test(id)) {
        const [imdbId, season, episode] = id.split(":");
        const sxxexx = `S${season.padStart(2, "0")}E${episode.padStart(2, "0")}`;
        const query = `${sxxexx} [${imdbId}`;
        details = await folderSearch(query);
    }
    else if (id.startsWith("tt")) {
        const query = `[${id}`;
        details = await folderSearch(query);
    }
    else {
        details = await folderSearch(id);
    }
    if (!details) {
        return [createErrorStream("[NOT FOUND]")];
    }
    const extMatch = details.name && details.name.match(/\.(\w+)$/i);
    const ext = extMatch ? extMatch[1].toUpperCase() : "";
    const sizeStr = details.size ? formatSize(details.size) : "";
    return [{
        name: MANIFEST.name,
        title: `▶️ PLAY [${ext}|${sizeStr}]`,
        url: details.stream_link || details.link || details.directlink,
    }];
}

function createJsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data, null, 4), {
        headers: HEADERS,
        status: status,
    });
}

function createErrorStream(description) {
    return {
        name: `⚠️ ${MANIFEST.name}`,
        description: description,
        externalUrl: "",
    };
}

async function createCatalogs() {
    const rootFolder = await folderList(CONFIG.premiumizeFolderId);
    if (!rootFolder || !rootFolder.content || rootFolder.content.length === 0) {
        return [];
    }
    const folders = rootFolder.content.filter(item => item.type === "folder");
    if (folders.length > 0) {
        return folders.map(folder => ({
            type: CONFIG.addonName,
            id: `premiumize-${folder.id}`,
            name: folder.name
        }));
    }
    const files = rootFolder.content.filter(item => item.type === "file");
    if (files.length > 0) {
        return [{
            type: CONFIG.addonName,
            id: `premiumize-${rootFolder.folder_id}`,
            name: rootFolder.name || "Videos"
        }];
    }
}

async function handleRequest(request) {
    try {
        const url = new URL(request.url);

        if (url.pathname === "/") {
            return Response.redirect(url.origin + "/manifest.json", 301);
        }

        // Manifest
        if (url.pathname === "/manifest.json") {
            MANIFEST.catalogs = await createCatalogs();
            return createJsonResponse(MANIFEST);
        }

        // Catalogs
        const catalogMatch = REGEX_PATTERNS.Catalog.exec(url.pathname);
        if (catalogMatch) {
            const id = catalogMatch[1];
            const contents = await folderList(CONFIG.premiumizeFolderId).content;
            const catalog = contents.find(item => `premiumize-${item.id}` === id);
            if (catalog) {
                const metas = await getMetas(catalog.id);
                return createJsonResponse({ metas });
            }
        }

        // Meta
        const metaMatch = REGEX_PATTERNS.Meta.exec(url.pathname);
        if (metaMatch) {
            const id = metaMatch[2];
            const type = metaMatch[1];
            const meta = await getMeta(id, type);
            return createJsonResponse({ meta });
        }

        // Stream
        const streamMatch = REGEX_PATTERNS.Stream.exec(url.pathname);
        if (streamMatch) {
            const id = streamMatch[2];
            const streams = await getStreams(id);
            return createJsonResponse({ streams });
        }

        return new Response("Not Found", { status: 404 });
    }
    catch (error) {
        console.error({
            message: "An unexpected error occurred",
            error: error.toString(),
        });
        return new Response("Internal Server Error", { status: 500 });
    }
}

export default {
    async fetch(request, env, ctx) {
        CONFIG.premiumizeFolderId = CONFIG.premiumizeFolderId || env.PREMIUMIZE_FOLDER_ID;
        CONFIG.premiumizeApiKey = CONFIG.premiumizeApiKey || env.PREMIUMIZE_API_KEY;
        CONFIG.rpdbApiKey = CONFIG.rpdbApiKey || env.RPDB_API_KEY;
        return handleRequest(request);
    }
};
