# Klip-Klop

**Klip-Klop** is a locally hosted YouTube video downloader and trimmer. It can download full videos or create precise clips, then provide temporary share links to the results.

## Features

- **Resolution Picker**: Choose from the resolutions available for the loaded video.
- **Smart Filenames**: Generate names from the video title, duration, and resolution.
- **Temporary Share Links**: Share completed downloads on your network for a configurable period.
- **Precise Trimming**: Set the exact start and end time for a clip.
- **Cross-Platform**: Runs on Windows and Linux.
- **Local Processing**: Downloads and processing stay on your machine.

## Installation

### Prerequisites

- [Node.js](https://nodejs.org/)
- [yt-dlp](https://github.com/yt-dlp/yt-dlp/wiki/Installation)
- [ffmpeg](https://ffmpeg.org/download.html)

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

### Configuration

Copy `.env.example` to `.env.local`, then change the retention period when needed:

```dotenv
DOWNLOAD_RETENTION_HOURS=24
```

The value is the number of hours before downloaded files and share links expire. It must be a positive number and defaults to `24` when omitted.

### Setup

1. Clone or download this repository.
2. Open a terminal in the project directory.
3. Install the dependencies:

   ```bash
   pnpm install
   ```

4. Start the application:

   ```bash
   pnpm dev
   ```

5. Open `http://localhost:3000`.

### Windows Launcher

Double-click `launcher.bat` to install missing npm dependencies, start the development server, and open Klip-Klop in your browser.

## Tech Stack

- [Next.js 16](https://nextjs.org/) with the App Router
- React 19
- Tailwind CSS v4 and shadcn/ui
- yt-dlp and ffmpeg for downloading and video processing

## Project Structure

- `/src`: Application source code.
- `/download`: Generated downloads and the temporary-link registry.
- `launcher.bat`: Windows launcher.

## License

This project is licensed under the MIT License.

## Acknowledgements

This project is a fork of [yt-trimmer](https://github.com/maykbrito/yt-trimmer) by [Mayk Brito](https://github.com/maykbrito).
