# YouTube Trimmer (Ngeklip)

A powerful and simple tool to download and trim YouTube videos, available as both a CLI (Command Line Interface) and a Web Application.

![Project Demo](https://i.gyazo.com/47d07ad7f425ccd747b4f6c3fb483e51.gif)

## 🚀 Features

- **Download & Trim**: Select specific start and end times to clip parts of a YouTube video.
- **Multiple Intervals**: Download multiple clips from a single video at once (CLI).
- **Concatenation**: Option to automatically join multiple clips into a single video file.
- **Dual Interface**: Use it via terminal or a modern web interface.

## 📋 Prerequisites

Before running this project, ensure you have the following installed on your machine:

1.  **Node.js**: [Download & Install](https://nodejs.org/)
2.  **FFmpeg**: Required for video processing. [Download & Install](https://ffmpeg.org/download.html)
3.  **yt-dlp**: Required for downloading YouTube videos. [Download & Install](https://github.com/yt-dlp/yt-dlp#installation)

> **Note**: Make sure both `ffmpeg` and `yt-dlp` are available in your system's PATH.

## 🛠 Installation

1.  **Clone the repository**

    ```bash
    git clone https://github.com/maykbrito/trimmer-yt-npm.git
    cd trimmer-yt-npm
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

## 💻 Usage

### 🌐 Web Interface

For a visual and interactive experience:

1.  **Start the development server**

    ```bash
    npm run dev
    ```

    This command runs the Express server and Tailwind CSS watcher concurrently.

2.  **Open in Browser**
    Go to [http://localhost:3000](http://localhost:3000)

3.  **Follow the UI instructions**:
    - Enter the YouTube URL.
    - Specify start and end timestamps.
    - Click to process.

### 🖥 CLI (Command Line Interface)

#### Single Clip

To download a single specific part of a video:

1.  Run the command:
    ```bash
    npm run trim
    ```
2.  Follow the interactive prompts:
    - **YouTube URL**: Paste the video link.
    - **Start Time**: Format `HH:mm:ss.ms` (e.g., `00:01:30`).
    - **End Time**: Format `HH:mm:ss.ms`.
    - **Filename**: (Optional) Name of the output file.

#### Multiple Clips

To download multiple parts from the same video:

1.  Open `src/actions/multiple-parts.js` in your editor.
2.  Configure the `data` object:
    ```javascript
    const data = {
      url: "https://www.youtube.com/watch?v=VIDEO_ID",
      intervals: [
        ["00:01:19", "00:01:40.200"], // Clip 1
        ["00:04:30", "00:05:00"], // Clip 2
      ],
      concat: true, // Set to code if you want to merge all clips into one file
    };
    ```
3.  Run the command:
    ```bash
    npm run trimall
    ```

## 🏗 Tech Stack

- **Runtime**: Node.js
- **Backend Framework**: Express.js
- **Styling**: Tailwind CSS
- **Core Processing**:
  - `yt-dlp` (Video Downloading)
  - `ffmpeg` (Video Trimming & Concatenation)
- **Utilities**:
  - `readline-sync` (CLI Prompts)
  - `concurrently` (Dev Server)

## 📄 License

This project is licensed under the **MIT License**.
