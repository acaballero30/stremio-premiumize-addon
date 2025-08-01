# Stremio Premiumize Files Addon

![showcase](/images/showcase.jpg)

This addon lets you connect your [Premiumize](https://www.premiumize.me/) files and watch them directly in [Stremio](https://www.stremio.com/). You can choose a specific folder to use as your library, or use your Premiumize root folder by default.

The addon automatically organizes your content into Stremio catalogs:
- **Movie Catalog:** If a folder contains mostly video files, it is shown as a movie catalog.
- **Series Catalog:** If a folder contains mostly subfolders, it is shown as a series catalog. Series episodes must be named with the format `SXXEXX` (for example, `S01E02`).

You can also integrate your files with TMDB or AIOLists catalogs by naming your files or folders like this:
- For movies: `NAME [IMDBID]`
- For series episodes: `NAME SXXEXX [IMDBID]`

Optionally, you can add an API key from [Rating Poster Database (RPDB)](https://ratingposterdb.com/) to show posters in your catalogs.

*This Addon is inspired by [Viren070's GDrive Addon](https://github.com/Viren070/stremio-gdrive-addon)*

## Features

- Browse and stream your Premiumize files in Stremio.
- Choose any folder as your library root.
- Automatic detection of movies and series based on folder structure.
- Integration with TMDB and AIOLists catalogs by naming convention.
- Optional poster images using RPDB API key.
- Simple deployment as a Cloudflare Worker.

## Deployment

This addon is designed to be deployed as a worker on Cloudflare Workers.

### 1. Create a GitHub Account

If you don't have one, go to [github.com](https://github.com/) and sign up for a free account.

### 2. Copy the Code to your account

- Go to the project page: [https://github.com/acaballero30/stremio-premiumize-addon](https://github.com/acaballero30/stremio-premiumize-addon)
- Click the **Fork** button at the top right.  
  This will create a copy of the project in your own GitHub account.

### 3. Create a Cloudflare Account

- Go to [https://dash.cloudflare.com/sign-up](https://dash.cloudflare.com/sign-up) and create a free account.

### 4. Import the Code to Cloudflare

- In the Cloudflare dashboard, click on **Workers & Pages** in the left menu.
- Click **Create** or **Import a repository**.
- Select **GitHub** and authorize Cloudflare if needed.
- Find and select the repository you forked (`stremio-premiumize-addon`).
- For the project name, use: `stremio-premiumize`
- Click **Deploy**.

### 5. Add Your API Keys

- In your Worker dashboard, go to **Settings** > **Variables & Secrets**.
- Click **Add variable** for each key:
    - `PREMIUMIZE_API_KEY` — your Premiumize API key
    - `PREMIUMIZE_FOLDER_ID` — (optional) the folder ID you want to use
    - `RPDB_API_KEY` — (optional) your RPDB API key for posters
- Save each variable after adding.

### 6. Get Your Addon URL

- After deployment, at the top click **View this worker**.
- Copy the URL shown (it will look like `https://stremio-premiumize.yourname.workers.dev`).

### 7. Install the Addon

- Open Stremio.
- Go to the **Add-ons** section.
- Click **Install Add-on via URL**.
- Paste the URL you copied from Cloudflare.
- Click **Install**.

## File Structure (Example)

```
Media
├── Movies
│   └── How to train your dragon [tt26743210].mp4
│   └── Some Movie.mp4
├── Documentaries
│   └── Some Documentary.mp4
├── Series
│   └── Severance [tt11280740]
│       ├── Severance S01E01.mkv
│       └── Severance S01E02.mkv
│   └── My Show
│       ├── My Show S01E01.mp4
│       └── My Show S01E02.mp4
└── Anime
    └── Kaguya-sama Love is War [tt9522300]
        ├── S01E01.mp4
        └── S01E02.mp4
    └── Another Anime
        └── Season 1
            ├── S01E01.mp4
            └── S01E02.mp4
        └── Season 2
            ├── S02E01.mp4
            └── S02E02.mp4
```

**Tips:**
- Series episodes must include the `SXXEXX` pattern (e.g., `S01E02`) at the end of the filename.
- Files and folders without IDs `[IMDBID]` will only show on the Addon catalogs, and won't have posters or metadata.