package com.klipklop.app

import android.content.ContentValues
import android.content.Context
import android.net.Uri
import android.os.Environment
import android.provider.MediaStore
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.yausername.youtubedl_android.YoutubeDL
import com.yausername.youtubedl_android.YoutubeDLRequest
import com.yausername.youtubedl_android.YoutubeDLResponse
import kotlinx.coroutines.*
import org.json.JSONArray
import java.io.File
import java.util.UUID
import java.util.concurrent.atomic.AtomicBoolean

/**
 * Native backend for the Klip-Klop APK.
 *
 * Bridges the React UI (WebView) to yt-dlp (via youtubedl-android) and
 * MediaStore so downloads run fully on-device with no server.
 *
 * Mirrors the web API routes (src/app/api) so the frontend adapter
 * (src/lib/client.ts) can call either target transparently.
 */
@CapacitorPlugin(name = "KlipKlop")
class KlipKlopPlugin : Plugin() {

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private var activeProcessId: String? = null
    private val isCancelled = AtomicBoolean(false)

    /** Lazily init yt-dlp (extracts bundled Python + binary) once. */
    private fun ensureInit() {
        val ctx = context.applicationContext
        try {
            if (!initialized) {
                synchronized(this) {
                    if (!initialized) {
                        YoutubeDL.getInstance().init(ctx)
                        initialized = true
                    }
                }
            }
        } catch (e: Exception) {
            throw RuntimeException("Failed to init yt-dlp: ${e.message}", e)
        }
    }

    companion object {
        @Volatile
        private var initialized = false
        private const val DOWNLOAD_DIR_NAME = "downloads"
        private const val PROCESS_ID_PREFIX = "klipklop"
    }

    // ------------------------------------------------------------------
    // probe(url) -> { title, duration, heights[], directUrl, error? }
    // Mirrors POST /api/info. Runs yt-dlp -g + --print.
    // ------------------------------------------------------------------
    @PluginMethod
    fun probe(call: PluginCall) {
        val url = call.getString("url") ?: run {
            call.reject("Missing url")
            return
        }
        scope.launch {
            try {
                ensureInit()
                val request = YoutubeDLRequest(url)
                // Fast probe: resolve a direct mp4 stream + metadata via --print.
                request.addOption("--no-playlist")
                request.addOption("--no-warnings")
                request.addOption("-g")
                request.addOption("-f", "best[ext=mp4][vcodec!=none][acodec!=none]/best")
                request.addOption("--print", "%(title)s")
                request.addOption("--print", "%(duration)s")
                request.addOption("--print", "%(formats.:.height)j")
                // Skip YTDLP_COMMON_ARGS here (player_client slows the probe).
                val response = YoutubeDL.getInstance().execute(request)
                val out = response.out ?: ""
                val lines = out.split("\r", "\n").filter { it.isNotBlank() }

                val title = lines.getOrNull(0) ?: ""
                val durationRaw = lines.getOrNull(1) ?: "0"
                val heightsRaw = lines.getOrNull(2) ?: "[]"
                val streamLines = lines.drop(3)

                val heights = parseHeights(heightsRaw)
                val directUrl = streamLines.firstOrNull {
                    it.startsWith("http") &&
                        (it.contains("videoplayback") || it.contains("googlevideo")) &&
                        it.contains("itag=") &&
                        !it.contains("manifest.googlevideo")
                } ?: ""

                val result = JSObject()
                result.put("title", title)
                result.put("duration", durationRaw.toLongOrNull() ?: 0L)
                result.put("heights", heights)
                result.put("directUrl", directUrl)
                call.resolve(result)
            } catch (e: Exception) {
                call.reject(cleanError(e.message ?: "Probe failed"), "PROBE_FAILED", e)
            }
        }
    }

    private fun parseHeights(raw: String): JSONArray {
        val arr = JSONArray()
        try {
            val parsed = JSONArray(raw)
            val seen = LinkedHashSet<Int>()
            for (i in 0 until parsed.length()) {
                val h = parsed.optInt(i, -1)
                if (h > 0) seen.add(h)
            }
            val sorted = seen.sortedDescending()
            sorted.forEach { arr.put(it) }
        } catch (_: Exception) {
            // non-json heights; leave empty
        }
        return arr
    }

    // ------------------------------------------------------------------
    // downloadClip(params) -> { success, file, uri, error? }
    // Mirrors POST /api/download. Downloads with --download-sections,
    // then (M5) Media3 trim, then saves to MediaStore (Gallery).
    // ------------------------------------------------------------------
    @PluginMethod
    fun downloadClip(call: PluginCall) {
        val url = call.getString("url") ?: run { call.reject("Missing url"); return }
        val start = call.getString("start") ?: "00:00:00"
        val end = call.getString("end") ?: "00:00:00"
        val filename = sanitizeFilename(call.getString("filename") ?: "clip")
        val height = call.getInt("height")
        val cookies = call.getString("cookies")

        if (activeProcessId != null) {
            call.reject("A download is already in progress", "DOWNLOAD_IN_PROGRESS")
            return
        }
        isCancelled.set(false)
        val processId = "$PROCESS_ID_PREFIX-${UUID.randomUUID()}"
        activeProcessId = processId

        scope.launch {
            try {
                ensureInit()
                notifyProgress("download", 0.0, "Preparing…")

                // Resolve start/end for --download-sections (web uses HH:mm:ss already).
                val startZero = start == "00:00:00" || start == "0"
                val endZero = end == "00:00:00" || end == "0"
                val sections = when {
                    startZero && endZero -> null
                    !startZero && endZero -> "*${start}-inf"
                    startZero && !endZero -> "*00:00:00-${end}"
                    else -> "*${start}-${end}"
                }

                val downloadDir = File(context.filesDir, DOWNLOAD_DIR_NAME).apply { mkdirs() }
                val outputTemplate = "$downloadDir/${filename}.%(ext)s"

                val request = YoutubeDLRequest(url)
                request.addOption("--no-playlist")
                request.addOption("-f", if (height != null && height > 0)
                    "bestvideo[height<=$height]+bestaudio/best[height<=$height]/best"
                    else "bestvideo+bestaudio/best")
                request.addOption("--merge-output-format", "mp4")
                request.addOption("--remux-video", "mp4")
                request.addOption("--force-keyframes-at-cuts")
                request.addOption("--extractor-args", "youtube:player_client=android_vr,tv")
                if (cookies != null && cookies.isNotBlank()) {
                    request.addOption("--add-header", "Cookie: $cookies")
                }
                request.addOption("-o", outputTemplate)
                request.addOption("--print", "after_move:filepath")
                if (sections != null) request.addOption("--download-sections", sections)
                if (height != null && height > 0) request.addOption("-S", "res:$height")

                // NOTE: --js-runtimes node is intentionally NOT added (no Node on
                // Android). The player_client=android_vr,tv handles JS challenges.

                var downloadedPath: String? = null
                // Cancel is handled via destroyProcessById(processId) which kills
                // the process; the callback simply stops being invoked.
                val response = YoutubeDL.getInstance().execute(request, processId) { progress, _, line ->
                    notifyProgress("download", progress.toDouble(), line)
                }
                activeProcessId = null

                // Locate the downloaded file from --print output.
                val out = response.out ?: ""
                val printed = out.split("\r", "\n").map { it.trim() }
                    .filter { it.startsWith(downloadDir.absolutePath) }
                    .lastOrNull()
                downloadedPath = printed ?: findDownloadedFile(downloadDir, filename)
                if (downloadedPath == null) {
                    call.reject("yt-dlp finished but no output file found", "NO_OUTPUT")
                    return@launch
                }

                notifyProgress("save", 100.0, "Saving to Gallery…")
                val uri = saveToMediaStore(File(downloadedPath), filename)
                val result = JSObject()
                result.put("success", true)
                result.put("file", filename)
                result.put("uri", uri.toString())
                call.resolve(result)
            } catch (e: Exception) {
                activeProcessId = null
                call.reject(cleanError(e.message ?: "Download failed"), "DOWNLOAD_FAILED", e)
            }
        }
    }

    // ------------------------------------------------------------------
    // listDownloads() -> { downloads: [{file,size,uri,createdAt}] }
    // Mirrors GET /api/links.
    // ------------------------------------------------------------------
    @PluginMethod
    fun listDownloads(call: PluginCall) {
        scope.launch {
            try {
                val downloadDir = File(context.filesDir, DOWNLOAD_DIR_NAME)
                val arr = JSONArray()
                if (downloadDir.exists()) {
                    downloadDir.listFiles()?.filter { it.isFile && it.name.endsWith(".mp4") }?.forEach { f ->
                        val o = JSObject()
                        o.put("file", f.name)
                        o.put("size", f.length())
                        o.put("createdAt", f.lastModified())
                        o.put("uri", Uri.fromFile(f).toString())
                        arr.put(o)
                    }
                }
                val result = JSObject()
                result.put("downloads", arr)
                call.resolve(result)
            } catch (e: Exception) {
                call.reject(e.message ?: "Failed to list downloads", "LIST_FAILED", e)
            }
        }
    }

    // ------------------------------------------------------------------
    // updateYtDlp() -> { updated, version }
    // ------------------------------------------------------------------
    @PluginMethod
    fun updateYtDlp(call: PluginCall) {
        scope.launch {
            try {
                ensureInit()
                val status = YoutubeDL.getInstance().updateYoutubeDL(context)
                val version = YoutubeDL.getInstance().version(context)
                val result = JSObject()
                result.put("updated", status == YoutubeDL.UpdateStatus.DONE)
                result.put("version", version ?: "")
                call.resolve(result)
            } catch (e: Exception) {
                call.reject(e.message ?: "Update failed", "UPDATE_FAILED", e)
            }
        }
    }

    // ------------------------------------------------------------------
    // cancelDownload() -> { cancelled }
    // ------------------------------------------------------------------
    @PluginMethod
    fun cancelDownload(call: PluginCall) {
        val pid = activeProcessId
        val cancelled = pid != null && YoutubeDL.getInstance().destroyProcessById(pid)
        activeProcessId = null
        isCancelled.set(true)
        val result = JSObject()
        result.put("cancelled", cancelled)
        call.resolve(result)
    }

    // ------------------------------------------------------------------
    // resolveLocalVideo(filename) -> { uri }
    // Returns a content:// URI (via FileProvider) the WebView <video> can play.
    // ------------------------------------------------------------------
    @PluginMethod
    fun resolveLocalVideo(call: PluginCall) {
        val filename = call.getString("filename") ?: run { call.reject("Missing filename"); return }
        val file = File(File(context.filesDir, DOWNLOAD_DIR_NAME), filename)
        if (!file.exists()) {
            call.reject("File not found: $filename", "FILE_NOT_FOUND")
            return
        }
        val uri = androidx.core.content.FileProvider.getUriForFile(
            context,
            "${context.packageName}.fileprovider",
            file,
        )
        val result = JSObject()
        result.put("uri", uri.toString())
        call.resolve(result)
    }

    // ------------------------------------------------------------------
    // Helpers
    // ------------------------------------------------------------------

    private fun notifyProgress(phase: String, percent: Double, message: String) {
        val obj = JSObject()
        obj.put("phase", phase)
        obj.put("percent", percent)
        obj.put("message", message)
        notifyListeners("progress", obj)
    }

    /** Find the actual downloaded file (yt-dlp appends format/ext). */
    private fun findDownloadedFile(dir: File, base: String): String? {
        return dir.listFiles()?.firstOrNull {
            it.isFile && it.name.startsWith(base) && (it.name.endsWith(".mp4") || it.name.endsWith(".mkv") || it.name.endsWith(".webm"))
        }?.absolutePath
    }

    /** Copy the final file into MediaStore (Gallery). Scoped-storage safe. */
    private fun saveToMediaStore(src: File, displayName: String): Uri {
        val resolver = context.contentResolver
        val values = ContentValues().apply {
            put(MediaStore.Video.Media.DISPLAY_NAME, displayName)
            put(MediaStore.Video.Media.MIME_TYPE, "video/mp4")
            if (android.os.Build.VERSION.SDK_INT >= 29) {
                put(MediaStore.Video.Media.RELATIVE_PATH, "${Environment.DIRECTORY_MOVIES}/Klip-Klop")
            }
        }
        val collection = if (android.os.Build.VERSION.SDK_INT >= 29)
            MediaStore.Video.Media.getContentUri(MediaStore.VOLUME_EXTERNAL_PRIMARY)
        else
            MediaStore.Video.Media.EXTERNAL_CONTENT_URI
        val uri = resolver.insert(collection, values) ?: throw Exception("MediaStore insert failed")
        resolver.openOutputStream(uri)?.use { out ->
            src.inputStream().use { it.copyTo(out) }
        }
        return uri
    }

    /** Sanitize to [A-Za-z0-9_-] like the web downloader. */
    private fun sanitizeFilename(raw: String): String {
        var cleaned = raw.trim().replace(Regex("[^A-Za-z0-9_-]+"), "_")
            .replace(Regex("_{2,}"), "_")
            .trim('_', '-')
        if (cleaned.isEmpty()) cleaned = "clip"
        return cleaned.take(200)
    }

    private fun cleanError(msg: String): String {
        return msg
            .lines()
            .lastOrNull()?.trim()
            ?.takeIf { it.isNotBlank() }
            ?: msg
    }
}
