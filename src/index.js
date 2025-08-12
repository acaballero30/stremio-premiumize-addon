let KVStore;

const CONFIG = {
    addonName: "My Files",
    premiumizeFolderId: "",
    premiumizeApiKey: "",
    rpdbApiKey: "",
    tmdbApiKey: "",
    tmdbConfig: ""
};

const MANIFEST = {
    id: "stremio.premiumize.worker",
    version: "1.0.0",
    name: CONFIG.addonName,
    description: "Stream your files from Premiumize within Stremio!",
    catalogs: [],
    resources: [
        { name: "catalog", types: ["movie", "series"] },
        { name: "meta", types: ["movie", "series"], idPrefixes: ["premiumize:"] },
        { name: "stream", types: ["movie", "series"], idPrefixes: ["premiumize:", "tmdb:", "tt"] }
    ],
    types: ["movie", "series"]
};

const REGEX_PATTERNS = {
    naming: {
        brackets: /[\[{\(].*?[\]}\)]/g,
        trailingDashes: /^-+|-+$/g,
        multipleSpaces: /\s{2,}/g,
        trailingUnderscore: /_+$/g,
        leadingUnderscore: /^_+/g,
        fileExtension: /\.[^/.]+$/,
        releaseGroup: /-[a-z0-9]+$/i,
        year: /\(\d{4}\)/,
        episodePrefix: /^(episode|ep|pt)\.?\s?\d+/i,
        specialPrefix: /^(special|ova|oav|oade)\s?\d*/i,
        trailingDashSpace: /(\s-)+$/,
        leadingDashSpace: /^(-\s)+/,
        extraSpaces: /\s+/g
    },
    resolutions: {
        "2160p": /(?<![^ [(_\-.])(4k|2160p|uhd)(?=[ \)\]_.-]|$)/i,
        "1080p": /(?<![^ [(_\-.])(1080p|fhd)(?=[ \)\]_.-]|$)/i,
        "720p": /(?<![^ [(_\-.])(720p|hd)(?=[ \)\]_.-]|$)/i,
        "480p": /(?<![^ [(_\-.])(480p|sd)(?=[ \)\]_.-]|$)/i,
    },
    qualities: {
        "BluRay REMUX":
            /(?<![^ [(_\-.])((blu[ .\-_]?ray|bd|br|b|uhd)[ .\-_]?remux)(?=[ \)\]_.-]|$)/i,
        BluRay: /(?<![^ [(_\-.])(blu[ .\-_]?ray|((bd|br|b|uhd)[ .\-_]?(rip|r)?))(?![ .\-_]?remux)(?=[ \)\]_.-]|$)/i,
        "WEB-DL":
            /(?<![^ [(_\-.])(web[ .\-_]?(dl)?)(?![ .\-_]?DLRip)(?=[ \)\]_.-]|$)/i,
        WEBRip: /(?<![^ [(_\-.])(web[ .\-_]?rip)(?=[ \)\]_.-]|$)/i,
        HDRip: /(?<![^ [(_\-.])(hd[ .\-_]?rip|web[ .\-_]?dl[ .\-_]?rip)(?=[ \)\]_.-]|$)/i,
        "HC HD-Rip": /(?<![^ [(_\-.])(hc|hd[ .\-_]?rip)(?=[ \)\]_.-]|$)/i,
        DVDRip: /(?<![^ [(_\-.])(dvd[ .\-_]?(rip|mux|r|full|5|9))(?=[ \)\]_.-]|$)/i,
        HDTV: /(?<![^ [(_\-.])((hd|pd)tv|tv[ .\-_]?rip|hdtv[ .\-_]?rip|dsr(ip)?|sat[ .\-_]?rip)(?=[ \)\]_.-]|$)/i,
        CAM: /(?<![^ [(_\-.])(cam|hdcam|cam[ .\-_]?rip)(?=[ \)\]_.-]|$)/i,
        TS: /(?<![^ [(_\-.])(telesync|ts|hd[ .\-_]?ts|pdvd|predvd(rip)?)(?=[ \)\]_.-]|$)/i,
        TC: /(?<![^ [(_\-.])(telecine|tc|hd[ .\-_]?tc)(?=[ \)\]_.-]|$)/i,
        SCR: /(?<![^ [(_\-.])(((dvd|bd|web)?[ .\-_]?)?(scr(eener)?))(?=[ \)\]_.-]|$)/i,
    },
    visualTags: {
        "HDR10+":
            /(?<![^ [(_\-.])(hdr[ .\-_]?(10|ten)[ .\-_]?([+]|plus))(?=[ \)\]_.-]|$)/i,
        HDR10: /(?<![^ [(_\-.])(hdr10)(?=[ \)\]_.-]|$)/i,
        HDR: /(?<![^ [(_\-.])(hdr)(?=[ \)\]_.-]|$)/i,
        DV: /(?<![^ [(_\-.])(dolby[ .\-_]?vision(?:[ .\-_]?atmos)?|dv)(?=[ \)\]_.-]|$)/i,
        IMAX: /(?<![^ [(_\-.])(imax)(?=[ \)\]_.-]|$)/i,
        AI: /(?<![^ [(_\-.])(ai[ .\-_]?(upscale|enhanced|remaster))(?=[ \)\]_.-]|$)/i,
    },
    audioTags: {
        Atmos: /(?<![^ [(_\-.])(atmos)(?=[ \)\]_.-]|$)/i,
        "DD+": /(?<![^ [(_\-.])((?:ddp|dolby[ .\-_]?digital[ .\-_]?plus)(?:[ .\-_]?(5\.1|7\.1))?)(?=[ \)\]_.-]|$)/i,
        DD: /(?<![^ [(_\-.])((?:dd|dolby[ .\-_]?digital)(?:[ .\-_]?(5\.1|7\.1))?)(?=[ \)\]_.-]|$)/i,
        "DTS-HD MA":
            /(?<![^ [(_\-.])(dts[ .\-_]?hd[ .\-_]?ma)(?=[ \)\]_.-]|$)/i,
        "DTS-HD":
            /(?<![^ [(_\-.])(dts[ .\-_]?hd)(?![ .\-_]?ma)(?=[ \)\]_.-]|$)/i,
        DTS: /(?<![^ [(_\-.])(dts(?![ .\-_]?hd[ .\-_]?ma|[ .\-_]?hd))(?=[ \)\]_.-]|$)/i,
        TrueHD: /(?<![^ [(_\-.])(true[ .\-_]?hd)(?=[ \)\]_.-]|$)/i,
        5.1: /(?<![^ [(_\-.])((?:ddp|dd)?[ .\-_]?5\.1)(?=[ \)\]_.-]|$)/i,
        7.1: /(?<![^ [(_\-.])((?:ddp|dd)?[ .\-_]?7\.1)(?=[ \)\]_.-]|$)/i,
        AC3: /(?<![^ [(_\-.])(ac[ .\-_]?3)(?=[ \)\]_.-]|$)/i,
        AAC: /(?<![^ [(_\-.])(aac)(?=[ \)\]_.-]|$)/i,
    },
    encodes: {
        HEVC: /(?<![^ [(_\-.])(hevc|x265|h265|h\.265)(?=[ \)\]_.-]|$)/i,
        AVC: /(?<![^ [(_\-.])(avc|x264|h264|h\.264)(?=[ \)\]_.-]|$)/i,
    },
    languages: {
        Multi: /(?<![^ [(_\-.])(multi|multi[ .\-_]?audio)(?=[ \)\]_.-]|$)/i,
        "Dual Audio": /(?<![^ [(_\-.])(dual[ .\-_]?audio)(?=[ \)\]_.-]|$)/i,
        English: /(?<![^ [(_\-.])(english|eng)(?=[ \)\]_.-]|$)/i,
        Japanese: /(?<![^ [(_\-.])(japanese|jap)(?=[ \)\]_.-]|$)/i,
        Spanish: /(?<![^ [(_\-.])(spanish|spa)(?=[ \)\]_.-]|$)/i,
        Korean: /(?<![^ [(_\-.])(korean|kor)(?=[ \)\]_.-]|$)/i,
        Latino: /(?<![^ [(_\-.])(latino|lat)(?=[ \)\]_.-]|$)/i,
        Chinese: /(?<![^ [(_\-.])(chinese|chi)(?=[ \)\]_.-]|$)/i,
        Russian: /(?<![^ [(_\-.])(russian|rus)(?=[ \)\]_.-]|$)/i,
        Arabic: /(?<![^ [(_\-.])(arabic|ara)(?=[ \)\]_.-]|$)/i,
        Portuguese: /(?<![^ [(_\-.])(portuguese|por)(?=[ \)\]_.-]|$)/i,
        French: /(?<![^ [(_\-.])(french|fra)(?=[ \)\]_.-]|$)/i,
        German: /(?<![^ [(_\-.])(german|ger)(?=[ \)\]_.-]|$)/i,
        Italian: /(?<![^ [(_\-.])(italian|ita)(?=[ \)\]_.-]|$)/i,
        Hindi: /(?<![^ [(_\-.])(hindi|hin)(?=[ \)\]_.-]|$)/i,
        Bengali: /(?<![^ [(_\-.])(bengali|ben)(?=[ \)\]_.-]|$)/i,
        Punjabi: /(?<![^ [(_\-.])(punjabi|pan)(?=[ \)\]_.-]|$)/i,
        Marathi: /(?<![^ [(_\-.])(marathi|mar)(?=[ \)\]_.-]|$)/i,
        Gujarati: /(?<![^ [(_\-.])(gujarati|guj)(?=[ \)\]_.-]|$)/i,
        Tamil: /(?<![^ [(_\-.])(tamil|tam)(?=[ \)\]_.-]|$)/i,
        Telugu: /(?<![^ [(_\-.])(telugu|tel)(?=[ \)\]_.-]|$)/i,
        Kannada: /(?<![^ [(_\-.])(kannada|kan)(?=[ \)\]_.-]|$)/i,
        Malayalam: /(?<![^ [(_\-.])(malayalam|mal)(?=[ \)\]_.-]|$)/i,
        Thai: /(?<![^ [(_\-.])(thai|tha)(?=[ \)\]_.-]|$)/i,
        Vietnamese: /(?<![^ [(_\-.])(vietnamese|vie)(?=[ \)\]_.-]|$)/i,
        Indonesian: /(?<![^ [(_\-.])(indonesian|ind)(?=[ \)\]_.-]|$)/i,
        Turkish: /(?<![^ [(_\-.])(turkish|tur)(?=[ \)\]_.-]|$)/i,
        Hebrew: /(?<![^ [(_\-.])(hebrew|heb)(?=[ \)\]_.-]|$)/i,
        Persian: /(?<![^ [(_\-.])(persian|per)(?=[ \)\]_.-]|$)/i,
        Ukrainian: /(?<![^ [(_\-.])(ukrainian|ukr)(?=[ \)\]_.-]|$)/i,
        Greek: /(?<![^ [(_\-.])(greek|ell)(?=[ \)\]_.-]|$)/i,
        Lithuanian: /(?<![^ [(_\-.])(lithuanian|lit)(?=[ \)\]_.-]|$)/i,
        Latvian: /(?<![^ [(_\-.])(latvian|lav)(?=[ \)\]_.-]|$)/i,
        Estonian: /(?<![^ [(_\-.])(estonian|est)(?=[ \)\]_.-]|$)/i,
        Polish: /(?<![^ [(_\-.])(polish|pol)(?=[ \)\]_.-]|$)/i,
        Czech: /(?<![^ [(_\-.])(czech|cze)(?=[ \)\]_.-]|$)/i,
        Slovak: /(?<![^ [(_\-.])(slovak|slo)(?=[ \)\]_.-]|$)/i,
        Hungarian: /(?<![^ [(_\-.])(hungarian|hun)(?=[ \)\]_.-]|$)/i,
        Romanian: /(?<![^ [(_\-.])(romanian|rum)(?=[ \)\]_.-]|$)/i,
        Bulgarian: /(?<![^ [(_\-.])(bulgarian|bul)(?=[ \)\]_.-]|$)/i,
        Serbian: /(?<![^ [(_\-.])(serbian|srp)(?=[ \)\]_.-]|$)/i,
        Croatian: /(?<![^ [(_\-.])(croatian|hrv)(?=[ \)\]_.-]|$)/i,
        Slovenian: /(?<![^ [(_\-.])(slovenian|slv)(?=[ \)\]_.-]|$)/i,
        Dutch: /(?<![^ [(_\-.])(dutch|dut)(?=[ \)\]_.-]|$)/i,
        Danish: /(?<![^ [(_\-.])(danish|dan)(?=[ \)\]_.-]|$)/i,
        Finnish: /(?<![^ [(_\-.])(finnish|fin)(?=[ \)\]_.-]|$)/i,
        Swedish: /(?<![^ [(_\-.])(swedish|swe)(?=[ \)\]_.-]|$)/i,
        Norwegian: /(?<![^ [(_\-.])(norwegian|nor)(?=[ \)\]_.-]|$)/i,
        Malay: /(?<![^ [(_\-.])(malay|may)(?=[ \)\]_.-]|$)/i,
    },
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

function cleanFileName(filename) {
    for (const category in REGEX_PATTERNS) {
        for (const patternKey in REGEX_PATTERNS[category]) {
            const regex = REGEX_PATTERNS[category][patternKey];
            filename = filename.replace(regex, ' ');
        }
    }
    filename = filename.trim();
    const seasonEpisodeMatch = filename.match(/(?:S\d{1,2}E\d{1,2})|(?:S\d{1,2}P\d{1,2})|(?:\d{1,2}x\d{1,2})|(?:Season\s\d+\s?Episode\s\d+)/i);
    let seasonEpisode = '';
    let episodeTitle = '';
    if (seasonEpisodeMatch) {
        seasonEpisode = seasonEpisodeMatch[0];
        seasonEpisode = seasonEpisode
            .replace(/Season\s(\d+)\s?Episode\s(\d+)/i, 'S$1E$2')
            .replace(/(\d{1,2})x(\d{1,2})/i, 'S$1E$2')
            .toUpperCase();
        filename = filename.replace(new RegExp(seasonEpisodeMatch[0], 'i'), '').trim();
        const episodeTitleMatch = filename.match(/(?:[-–—:])\s*([^-–—:]+)$/);
        if (episodeTitleMatch) {
            episodeTitle = episodeTitleMatch[1].trim();
            filename = filename.replace(new RegExp(`[-–—:]\\s*${episodeTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`), '').trim();
        }
        return episodeTitle ? `${seasonEpisode} ${episodeTitle}` : seasonEpisode;
    }
    return filename;
}

function extractImdbId(filename) {
    const match = filename.match(/\[(tt\d+)(?:-\d+)?\]/);
    return match ? match[1] : null;
}

function chooseValue(primary, fallback) {
    if (primary === undefined || primary === null || primary === "") {
        return fallback;
    }
    return primary;
}

function organizeEpisodes(files, id) {
    const patterns = [
        /S(\d{1,2})E(\d{1,2})(?!\d)/i,
        /(\d{1,2})x(\d{1,2})(?!\d)/i
    ];
    const videos = {};
    for (const file of files) {
        let season = 0;
        let episode = 0;
        let matched = false;
        for (const regex of patterns) {
            const match = file.name.match(regex);
            if (match) {
                season = parseInt(match[1]);
                episode = parseInt(match[2]);
                matched = true;
                break;
            }
        }
        if (!matched) {
            season = 0;
            episode = (videos[season]?.length || 0) + 1;
        }
        if (!videos[season]) {
            videos[season] = [];
        }
        const episodeId = id.startsWith("tt") ? `${id}:${season}:${episode}` : `premiumize:${file.id}`;
        if (!id.startsWith("tt") || !videos[season].some(v => v.id === episodeId)) {
            videos[season].push({
                id: episodeId,
                name: cleanFileName(file.name),
                season,
                episode,
                number: episode,
            });
        }
    }
    return videos;
}

function createJsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data, null, 4), {
        headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET,HEAD,POST,OPTIONS",
            "Access-Control-Max-Age": "86400",
        },
        status: status,
    });
}

async function fetchUrl(url) {
    try {
        const response = await fetch(url);
        return await response.json();
    }
    catch (error) {
        console.error(error);
        throw new Error(`Failed to fetch URL: ${url}`);
    }
}

async function getCinemeta(id, type) {
    const url = `https://v3-cinemeta.strem.io/meta/${type}/${id}.json`;
    return fetchUrl(url);
}

async function getTMDB(id, type) {
    const url = `https://tmdb.elfhosted.com/${CONFIG.tmdbConfig}/meta/${type}/${id}.json`;
    return fetchUrl(url);
}

function getPosterUrl(id) {
    return `https://api.ratingposterdb.com/${CONFIG.rpdbApiKey}/imdb/poster-default/${id}.jpg`;
}

async function getItem(id) {
    const url = `https://www.premiumize.me/api/item/details?apikey=${CONFIG.premiumizeApiKey}&id=${id}`;
    return fetchUrl(url);
}

async function searchFolder(query) {
    const url = `https://www.premiumize.me/api/folder/list?apikey=${CONFIG.premiumizeApiKey}&q=${query}`;
    return fetchUrl(url);
}

async function listFolder(id) {
    const url = `https://www.premiumize.me/api/folder/list?apikey=${CONFIG.premiumizeApiKey}&id=${id}`;
    return fetchUrl(url);
}

async function listAll() {
    const url = `https://www.premiumize.me/api/item/listall?apikey=${CONFIG.premiumizeApiKey}`;
    return await fetchUrl(url);
}

async function listVideos(path) {
    const allItems = await getFilesCached();
    return allItems.files.filter(file => 
        file.mime_type?.startsWith("video") &&
        file.path?.includes(`${path}/`)
    );
}

async function searchFiles(query) {
    const allItems = await getFilesCached();
    return allItems.files.filter(file => query.test(file.path) && file.mime_type?.startsWith("video"));
}

async function enrichMeta(meta, id) {
    let [cinemeta, tmdb] = await Promise.all([
        getCinemeta(id, meta.type).catch(() => ({})),
        getTMDB(id, meta.type).catch(() => ({}))
    ]);
    cinemeta = cinemeta.meta || {};
    tmdb = tmdb.meta || {};
    const allKeys = new Set([...Object.keys(cinemeta), ...Object.keys(tmdb)]);
    const externalMeta = {};
    for (const key of allKeys) {
        if (key === "background" || key === "logo") {
            externalMeta[key] = chooseValue(cinemeta[key], tmdb[key]);
        } else {
            externalMeta[key] = chooseValue(tmdb[key], cinemeta[key]);
        }
    }
    const mergedMeta = { ...meta };
    if (externalMeta.name) {
        mergedMeta.name = externalMeta.name;
    }
    for (const [key, value] of Object.entries(externalMeta)) {
        if (!["id", "videos"].includes(key) && !(key in mergedMeta)) {
            mergedMeta[key] = value;
        }
    }
    if (Array.isArray(meta.videos)) {
        mergedMeta.videos = meta.videos.map((video) => {
            if (video.season === 0) {
                return video;
            }
        const tmdbMatch = (tmdb.videos || []).find(
            v => v.season === video.season && v.episode === video.episode
        );
        const cinemetaMatch = (cinemeta.videos || []).find(
            v => v.season === video.season && v.episode === video.episode
        );
        const allKeys = new Set([
            ...Object.keys(cinemetaMatch || {}),
            ...Object.keys(tmdbMatch || {})
        ]);
        const mergedVideo = {};
        for (const key of allKeys) {
            mergedVideo[key] = chooseValue(tmdbMatch?.[key], cinemetaMatch?.[key]);
        }
        return { ...video, ...mergedVideo, id: video.id };
        });
    }
    return mergedMeta;
}

async function getCatalogs() {
    const rootFolder = await listFolder(CONFIG.premiumizeFolderId);
    if (!rootFolder || !rootFolder.content || rootFolder.content.length === 0) {
        return [];
    }
    const folders = rootFolder.content.filter(item => item.type === "folder");
    if (folders.length > 0) {
        return folders.map(folder => ({
            type: CONFIG.addonName,
            id: `premiumize:${folder.id}`,
            name: folder.name
        }));
    }
    const files = rootFolder.content.filter(item => item.type === "file");
    if (files.length > 0) {
        return [{
            type: CONFIG.addonName,
            id: `premiumize:${rootFolder.folder_id}`,
            name: rootFolder.name || "Videos"
        }];
    }
}

async function getCatalog(id) {
    const catalogFolder = await listFolder(id);
    const content = catalogFolder.content
        .filter(item => item.type === "folder" || (item.type === "file" && item.mime_type?.startsWith("video")))
        .map(item => {
            return {
                id: `premiumize:${item.id}`,
                name: cleanFileName(item.name),
                type: item.type === "folder" ? "series" : "movie",
                poster: getPosterUrl(extractImdbId(item.name)) || "",
            };
        });
    const metas = await Promise.all(content.map(async item => {
        const meta = await getMetaCached(item.id.replace("premiumize:", ""), item.type);
        return mergeMeta(item, meta);
    }));
    return { metas };
}

async function getMeta(id, type) {
    let meta = {};
    if (type === "movie") {
        const file = await getItem(id);
        meta = {
            id: `premiumize:${file.id}`,
            name: cleanFileName(file.name),
            type
        };
        const imdb = extractImdbId(file.name);
        if (imdb) {
            meta = await enrichMeta(meta, imdb);
        }
    }
    if (type === "series") {
        const seriesFolder = await listFolder(id);
        const hasSubfolders = seriesFolder.content.some(item => item.type === "folder");
        const files = hasSubfolders 
            ? await listVideos(seriesFolder.name)
            : seriesFolder.content.filter(file => file.mime_type?.startsWith("video"));
        const imdb = extractImdbId(seriesFolder.name);
        const episodes = organizeEpisodes(files, imdb || id);
        const videos = Object.values(episodes)
            .flat()
            .sort((a, b) => a.season - b.season || a.episode - b.episode)
        meta = {
            id: `premiumize:${id}`,
            name: cleanFileName(seriesFolder.name),
            type,
            videos
        };
        if (imdb) {
            meta = await enrichMeta(meta, imdb);
        }
    }
    return { meta };
}

function mergeMeta(item, metaWrapper) {
    if (!metaWrapper || !metaWrapper.meta) {
        return item;
    }
    const meta = metaWrapper.meta;
    const { id, type, poster, videos, ...rest } = meta;
    return { ...rest, ...item };
}

async function getStreams(id, type) {
    let details = [];
    if (id.startsWith("premiumize:")) {
        id = id.split(":")[1];
        item = await getItem(id);
        if (item) {
            details = [item];
        }
    }
    else {
        const idParts = id.split(":");
        const isIMDb = id.startsWith("tt");
        id = isIMDb ? idParts[0] : idParts[1];
        let query = id;
        if (type === "series") {
            const seasonNum = parseInt(idParts[isIMDb ? 1 : 2], 10);
            const episodeNum = parseInt(idParts[isIMDb ? 2 : 3], 10);
            const patterns = [
                `${id}.*S0?${seasonNum}E0?${episodeNum}(?!\\d)`,
                `${id}.*${seasonNum}x0?${episodeNum}(?!\\d)`,
            ];
            query = new RegExp(patterns.join("|"), "i");
        } else {
            query = new RegExp(id, "i");
        }
        const fileMatches = await searchFiles(query);
        if (fileMatches.length > 0) {
            const files = fileMatches.map(async match => {
                const item = await getItem(match.id);
                return { ...item, path: match.path };
            });
            details = await Promise.all(files);
        }
    }
    if (!details.length) {
        return { streams: [] };
    }
    const streams = details.map(item => {
        const extensionMatch = item.name?.match(/\.(\w+)$/i);
        const extension = extensionMatch ? extensionMatch[1].toUpperCase() : "";
        const size = item.size ? formatSize(item.size) : "";
        let version = "";
        if (item.path) {
            const parts = item.path.split("/");
            const seriesIndex = parts.findIndex(p => p.includes(id));
            if (seriesIndex >= 0 && parts.length > seriesIndex + 1) {
                const language = parts[seriesIndex + 1];
                if (/^(Subtitulado|Latino|Japones|Castellano|Español|Ingl[eé]s)$/i.test(language)) {
                    version = language;
                }
            }
        }
        return {
            name: MANIFEST.name,
            title: `▶️ PLAY${version ? ` - ${version}` : ""} [${extension}|${size}]`,
            url: item.stream_link || item.link || item.directlink,
        };
    });
    return { streams };
}

async function getCached(key, fetchFn, shouldCache = () => true) {
    let cached = await KVStore.get(key, { type: 'json' });
    if (!cached || (typeof cached === 'object' && Object.keys(cached).length === 0)) {
        const data = await fetchFn();
        if (shouldCache(data)) {
            await KVStore.put(key, JSON.stringify(data));
        }
        return data;
    }
    return cached;
}

function getFilesCached() {
    return getCached("files", () => listAll());
}

function getCatalogsCached() {
    return getCached("catalogs", () => getCatalogs());
}

function getCatalogCached(id) {
    return getCached(`catalog:${id}`, () => getCatalog(id));
}

function getMetaCached(id, type) {
    return getCached(`meta:${type}:${id}`, () => getMeta(id, type));
}

function getStreamsCached(id, type) {
    return getCached(`streams:${type}:${id}`, () => getStreams(id, type), 
        data => Array.isArray(data.streams) && data.streams.length > 0);
}

async function handleRequest(request) {
    try {
        const url = new URL(request.url);
        const path = decodeURIComponent(url.pathname);
        if (path === "/") {
            return Response.redirect(url.origin + "/manifest.json", 301);
        }
        if (path === "/manifest.json") {
            MANIFEST.catalogs = await getCatalogsCached();
            return createJsonResponse(MANIFEST);
        }
        const catalogMatch = path.match(`^/catalog/${CONFIG.addonName}/premiumize:([\\w-]+)\\.json$`);
        if (catalogMatch) {
            const id = catalogMatch[1];
            const catalog = await getCatalogCached(id);
            return createJsonResponse(catalog);
        }
        const metaMatch = path.match(/^\/meta\/(movie|series)\/premiumize:([^\.]+)\.json$/);
        if (metaMatch) {
            const id = metaMatch[2];
            const type = metaMatch[1];
            const meta = await getMetaCached(id, type);
            return createJsonResponse(meta);
        }
        const streamMatch = path.match(/^\/stream\/(movie|series)\/([a-zA-Z0-9:%\-._]+)\.json$/);
        if (streamMatch) {
            const id = streamMatch[2];
            const type = streamMatch[1];
            const streams = await getStreamsCached(id, type);
            return createJsonResponse(streams);
        }
        if (path === "/delete/files.json") {
            KVStore.delete('files');
            const files = await getFilesCached();
            return createJsonResponse(files);
        }
        if (path === "/delete/manifest.json") {
            KVStore.delete('catalogs');
            MANIFEST.catalogs = await getCatalogsCached();
            return createJsonResponse(MANIFEST);
        }
        if (path === "/delete/catalogs.json") {
            const list = await KVStore.list({ prefix: "catalog:" });
            await Promise.all(list.keys.map(k => KVStore.delete(k.name)));
            return createJsonResponse({ status: "ok", deleted: list.keys.length });
        }
        if (path === "/delete/metas.json") {
            const list = await KVStore.list({ prefix: "meta:" });
            await Promise.all(list.keys.map(k => KVStore.delete(k.name)));
            return createJsonResponse({ status: "ok", deleted: list.keys.length });
        }
        if (path === "/delete/streams.json") {
            const list = await KVStore.list({ prefix: "streams:" });
            await Promise.all(list.keys.map(k => KVStore.delete(k.name)));
            return createJsonResponse({ status: "ok", deleted: list.keys.length });
        }
        return new Response("Not Found", { status: 404 });
    }
    catch (error) {
        console.error(error);
        return new Response("Internal Server Error", { status: 500 });
    }
}

export default {
    async fetch(request, env, ctx) {
        CONFIG.premiumizeFolderId = CONFIG.premiumizeFolderId || env.PREMIUMIZE_FOLDER_ID;
        CONFIG.premiumizeApiKey = CONFIG.premiumizeApiKey || env.PREMIUMIZE_API_KEY;
        CONFIG.rpdbApiKey = CONFIG.rpdbApiKey || env.RPDB_API_KEY;
        CONFIG.tmdbApiKey = CONFIG.tmdbApiKey || env.TMDB_API_KEY;
        CONFIG.tmdbConfig = CONFIG.tmdbConfig || env.TMDB_CONFIG;
        KVStore = env.KV;
        return handleRequest(request);
    }
};
