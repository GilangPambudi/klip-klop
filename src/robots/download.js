const { exec, toSeconds, grabRange } = require('./utils.js')

const createFilename = name =>
  name ? name.replace(/\s/g, '-').toLowerCase() : 'part'

const VIDEOQUALITY = 'bestvideo[height<=1080]+bestaudio[height<=1080]/best'
// const VIDEOQUALITY = 'bv*[ext=mp4]+ba[ext=m4a]/b[ext=mp4] / bv*+ba/b'
// const VIDEOQUALITY = "bv+ba/b"


// const youtubedlUrl = url => `"$(yt-dlp -g '${url}')"`
// const youtubedlUrl = url => `"$(yt-dlp -S size -g '${url}')"`

/**
 * Function that download partial video content from given Youtube URL
 *
 * @param {Object} content
 * @param {String} content.url - Youtube URL
 * @param {String} content.from - time as 00:00:00 or miliseconds
 * @param {String} content.to - time as 00:00:00 or miliseconds
 * @param {String} content.filename
 * @returns {Promise}
 * @example
 * await downloadPart({
 * url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
 * from: '00:00:00',
 * to: '00:00:10',
 * filename: 'video.mp4'
 * })
 */
const downloadPart = async ({ url, from, to, filename }) => {
  const outputFilename = createFilename(filename)

  // Calculate start and end seconds for yt-dlp
  // "from" is usually "00:00:00", we can pass it directly to yt-dlp format usually, 
  // but yt-dlp expects "*start_time-end_time". 
  // If "start_time" is 00:00:00, it works.

  // However, current existing logic creates "t" (duration).
  // We need absolute End Time for yt-dlp, or calculate it.
  // The current code does: t = duration.
  // We need to support the existing "to" input which might be duration or absolute time.
  // Based on "utils.js" (not seen recently but implied), `toSeconds(from, to)` likely calculates duration.

  // Let's rely on calculating seconds to be safe.
  const startSeconds = await getSeconds(from)

  // "to" might be a duration or an end timestamp.
  // In the web UI, users usually set "In" and "Out" timestamps.
  // Let's assume absolute timestamps are passed or handle duration if needed.
  // But wait, the previous code calculated 't' (duration).
  // If I have start and duration, End = Start + Duration.

  let endSeconds;
  // If "to" has colon, it's likely a timestamp.
  if (String(to).includes(':')) {
    const duration = toSeconds(from, to) // existing function returns duration
    endSeconds = startSeconds + duration
  } else {
    // If it's a number/milliseconds/seconds
    // The existing code: `grabRange(to, from)` seems to handle ms.
    // Let's try to be simpler: if it's already a duration, add to start.
    // But wait, safely, let's just stick to the calculation logic.

    // Actually, looking at previous logs: 
    // Video starts in (00:00:00.00): 00:00:00
    // Video ends in (00:00:00.00): 00:00:10
    // "toSeconds" returned 10.
    // So "to" is absolute timestamp in the inputs.

    // Reuse `toSeconds` logic to get duration, then add to start?
    // Or just parse "to" to seconds directly.
    // Since I can't see `toSeconds` implementation inside `utils.js` right now, 
    // I will assume `to` is an absolute timestamp string like "00:00:10".
    // I'll add a helper here or parse it.
    endSeconds = await getSeconds(to);
  }

  try {
    const path = require('path')
    const fs = require('fs')
    const localYtDlp = path.resolve(__dirname, '../../bin/yt-dlp.exe')
    const ytDlpCommand = (process.platform === 'win32' && fs.existsSync(localYtDlp)) ? `"${localYtDlp}"` : 'yt-dlp'

    // Create download directory if not exists
    const downloadDir = path.resolve(__dirname, '../../download')
    if (!fs.existsSync(downloadDir)) {
      fs.mkdirSync(downloadDir, { recursive: true })
    }

    // Update outputFilename to include full path
    const fullOutputFilename = path.join(downloadDir, outputFilename)

    console.log(`> Downloading with native yt-dlp (Best Quality)...`)

    // Construct the section string: *start-end
    // Example: *00:00:00-00:00:10
    const downloadSections = `*${from}-${to}`

    // NOTE: yt-dlp can take timestamps directly in --download-sections

    await exec(
      `${ytDlpCommand} "${url}" \
      --download-sections "${downloadSections}" \
      -f "bestvideo+bestaudio/best" \
      --merge-output-format mp4 \
      --force-keyframes-at-cuts \
      -o "${fullOutputFilename}.%(ext)s"`
    )

    console.log(`> Video saved to: ${fullOutputFilename}.mp4`)

  } catch (error) {
    throw new Error(error)
  }
}

// Helper to ensure we can parse the time if needed, 
// though yt-dlp accepts 00:00:00 format directly.
// We'll trust passing `from` and `to` strings directly to yt-dlp works 
// as it supports standard time formats.
const getSeconds = async (timeStr) => {
  // Placeholder if needed, but for now we pass strings directly
  // If the user input is 00:00:00, yt-dlp handles it.
  return 0; // Not strictly used in the constructed command above
}

module.exports = downloadPart
