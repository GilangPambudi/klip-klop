# Ngeklip

**Ngeklip** is a powerful, modern, and locally-hosted YouTube video downloader and trimmer. Built with the latest web technologies, it offers a seamless experience for downloading videos or clipping specific segments with precision.

## Features

- **Resolution Picker**: Choose from the resolutions actually available for the loaded video.
- **Smart Filenames**: Names are generated from the YouTube title, e.g. `My_Video_Title-75s-1080p.mp4`.
- **Shareable Links**: Every download gets a tokenized link that works from any device on your network, and expires automatically after 24 hours.
- **Precise Trimming**: Clip and trim videos with an intuitive timeline editor before downloading.
- **Cross-Platform**: Runs on Windows and Linux.
- **Modern UI**: A beautiful, dark-themed interface built with **shadcn/ui** and **Tailwind CSS v4**.
- **Local Performance**: Runs entirely on your machine for maximum privacy and speed.

## Installation

### Prerequisites

- **Node.js**: [Download here](https://nodejs.org/) (required to run the application).
- **yt-dlp** and **ffmpeg**: resolved from `./bin` first, then from your `PATH`.

**Windows**: portable `yt-dlp.exe` and `ffmpeg.exe` in `./bin` are used automatically. Nothing else to install.

**Linux**: install both tools system-wide:

```bash
sudo apt install ffmpeg
pipx install yt-dlp   # or: sudo apt install yt-dlp
```

If either is missing, the app reports which tool it could not find along with the command to install it.

### Setup

1.  **Clone or Download** the repository to your local machine.
2.  Navigate to the project folder.
3.  That's it! The included launcher handles the rest.

## Usage

### Fast Start (Windows)

1.  Locate the `launcher.bat` file in the root directory.
2.  Double-click `launcher.bat`.
    - _First run:_ It will automatically install necessary dependencies (`npm install`). This may take a few minutes.
    - _Subsequent runs:_ It will start the server immediately.
3.  A console window will open, and the application will launch in your default web browser at `http://localhost:3000`.

### Manual Start (Windows & Linux)

1.  Open a terminal in the project directory.
2.  Install dependencies:
    ```bash
    pnpm install
    ```
3.  Start the development server:
    ```bash
    pnpm dev
    ```
4.  Open `http://localhost:3000` in your browser.

## Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **UI Components**: [shadcn/ui](https://ui.shadcn.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Core Engines**:
  - **ffmpeg**: For video processing and trimming.
  - **yt-dlp**: For downloading YouTube content.

## Project Structure

- `/bin`: Optional portable executables (`ffmpeg`, `yt-dlp`). Checked before `PATH`.
- `/src`: Source code for the Next.js application.
  - `/components`: Reusable UI components.
  - `/app`: App Router pages and layouts.
  - `/lib`: Utility functions and server-side logic.
- `launcher.bat`: Windows automation script for easy startup.

## License

This project is licensed under the **MIT License**.

## Acknowledgements

- This project is a fork of [yt-trimmer](https://github.com/maykbrito/yt-trimmer) by [Mayk Brito](https://github.com/maykbrito). Big thanks to him for the original idea and codebase!
