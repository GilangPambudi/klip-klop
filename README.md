# Klip-Klop

**Klip-Klop** trims YouTube videos. Paste a link, set a start and an end, and download just that part as a video or as audio. Live at [klip.pambudi.dev](https://klip.pambudi.dev).

## Features

- **Precise trimming**: set the exact start and end of a clip, or download the whole video.
- **Preview before you download**: play the source and jump to your range in the built-in player.
- **Video or audio**: MP4 at the resolution you pick, or MP3, M4A, OGG and OPUS.
- **Smart filenames**: generated from the video title, clip length and resolution.
- **Accounts**: cutting and previewing are open to everyone; downloading needs a Discord login. Google sign-in is built in and can be switched on.
- **Credits**: every account starts with 3 downloads. Accounts can be made unlimited or banned.
- **Private history**: each account sees and deletes only its own downloads.
- **Temporary share links**: every download gets a link that works until the file expires.
- **Link previews**: a generated preview image for Discord, WhatsApp and other apps.

## Installation

### Prerequisites

- [Node.js](https://nodejs.org/) 20.9 or later (22.18 or later to run the tests)
- [yt-dlp](https://github.com/yt-dlp/yt-dlp/wiki/Installation)
- [ffmpeg](https://ffmpeg.org/download.html)
- A MySQL or MariaDB database

Klip-Klop does not include `yt-dlp` or `ffmpeg`. Both commands must be installed separately and available on your system `PATH`.

#### Windows

Open PowerShell and install both tools:

```powershell
winget install yt-dlp
winget install --id Gyan.FFmpeg -e
```

Open a new terminal after installation so the updated `PATH` is loaded.

#### Linux (Debian/Ubuntu)

```bash
sudo apt update
sudo apt install ffmpeg pipx
pipx ensurepath
pipx install yt-dlp
```

Open a new terminal after running `pipx ensurepath`.

#### Verify the tools

```bash
ffmpeg -version
yt-dlp --version
```

If either command is not found, fix your `PATH` before starting Klip-Klop.

### Setup

1. Clone or download this repository and open a terminal in it.
2. Install the dependencies:

   ```bash
   npm install
   ```

3. Create an empty database, then copy `.env.example` to `.env` and fill it in (see [Configuration](#configuration)).
4. Create the tables:

   ```bash
   npm run db:migrate
   ```

5. Start the application:

   ```bash
   npm run dev
   ```

6. Open `http://localhost:4200`.

On Windows, `launcher.bat` does steps 2, 5 and 6 for you. The database and `.env` still have to be set up first.

### Configuration

#### Environment (`.env`)

| Variable | Meaning |
|---|---|
| `DATABASE_URL` | MySQL or MariaDB connection, e.g. `mysql://user:password@localhost:3306/klip_klop`. Required. |
| `AUTH_SECRET` | Secret that signs the login session. Generate one with `openssl rand -base64 33`. |
| `AUTH_URL` | Public address of the app, e.g. `https://klip.example.com`, or `http://localhost:4200` in development. |
| `AUTH_DISCORD_ID`, `AUTH_DISCORD_SECRET` | Discord OAuth2 application. Redirect URL: `<AUTH_URL>/api/auth/callback/discord`. |
| `AUTH_GOOGLE_ENABLED` | `true` to offer Google sign-in as well. Off by default. |
| `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` | Google OAuth client. Redirect URL: `<AUTH_URL>/api/auth/callback/google`. |

If `AUTH_SECRET` is left empty, sign-in is switched off completely: anyone who can reach the app can download, without credits. That suits a private machine only. Always set it on a public server.

#### Site settings (`config` table)

These take effect without a restart:

| name | value | meaning |
|---|---|---|
| `default_height` | `720`, `1080`, ... or `max` | Resolution preselected for a new video: the best one at or below this |
| `default_theme` | `mono` or `neon` (light or dark to match the visitor's device), or a fixed `mono-light`, `mono-dark`, `neon-light`, `neon-dark` | Theme for visitors who have not picked one |
| `retention_hours` | a positive number | Hours before a finished download is deleted |

A missing or invalid value falls back to `max`, `mono` and `24`.

#### Accounts (`users` table)

An account is created the first time someone logs in.

- `credits`: downloads left. Starts at 3 and never refills; edit the number to top an account up.
- `unlimited`: set to `1` to stop charging the account.
- `banned`: set to `1` to block its downloads.

### After an update

Run `npm run db:migrate` again whenever the `drizzle/` folder has new files.

## Development

```bash
npm test          # filename, config and (with DATABASE_URL set) account tests
npx tsc --noEmit  # typecheck
npx eslint src    # lint
```

The account tests use the database in `DATABASE_URL`. They create throwaway `test:` accounts and remove them afterwards.

## Tech Stack

- [Next.js 16](https://nextjs.org/) with the App Router, React 19
- Tailwind CSS v4 and shadcn/ui
- [Auth.js](https://authjs.dev/) for Discord and Google sign-in
- [Drizzle ORM](https://orm.drizzle.team/) on MySQL or MariaDB
- yt-dlp and ffmpeg for downloading and video processing

## Project Structure

- `src/app`: pages and API routes.
- `src/components`: the editor UI.
- `src/lib`: downloading, file naming, share links and the database layer (`src/lib/db`).
- `drizzle`: database migrations.
- `scripts`: tests and the server deploy script.
- `assets/fonts`: IBM Plex Mono, used for the link preview image.
- `download`: finished downloads. Not committed.
- `DESIGN.md`: the design rules.

## License

This project is licensed under the MIT License. IBM Plex Mono is licensed under the SIL Open Font License (`assets/fonts/OFL.txt`).

## Acknowledgements

This project is a fork of [yt-trimmer](https://github.com/maykbrito/yt-trimmer) by [Mayk Brito](https://github.com/maykbrito).
