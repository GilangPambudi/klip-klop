# Ngeklip

**Ngeklip** is a powerful, modern, and locally-hosted YouTube video downloader and trimmer. Built with the latest web technologies, it offers a seamless experience for downloading videos or clipping specific segments with precision.

## Features

- **High Quality Downloads**: Download full YouTube videos in the best available quality.
- **Precise Trimming**: Clip and trim videos with an intuitive timeline editor before downloading.
- **Portable Binaries**: Comes with bundled `ffmpeg` and `yt-dlp` for hassle-free setup on Windows.
- **Modern UI**: A beautiful, dark-themed interface built with **shadcn/ui** and **Tailwind CSS v4**.
- **Local Performance**: Runs entirely on your machine for maximum privacy and speed.

## Installation

### Prerequisites

Before you begin, ensure you have the following installed on your system:

- **Node.js**: [Download here](https://nodejs.org/) (Required to run the application).

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

### Manual Start

If you prefer using the command line:

1.  Open a terminal in the project directory.
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Start the development server:
    ```bash
    npm run dev
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

- `/bin`: Contains portable executables (`ffmpeg`, `yt-dlp`) for Windows.
- `/src`: Source code for the Next.js application.
  - `/components`: Reusable UI components.
  - `/app`: App Router pages and layouts.
  - `/lib`: Utility functions and server-side logic.
- `launcher.bat`: Windows automation script for easy startup.

## License

This project is licensed under the **MIT License**.

## Acknowledgements

- This project is a fork of [yt-trimmer](https://github.com/maykbrito/yt-trimmer) by [Mayk Brito](https://github.com/maykbrito). Big thanks to him for the original idea and codebase!
