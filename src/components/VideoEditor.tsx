"use client";

import React from "react";
import { Header } from "@/components/video-editor/Header";
import { Content } from "@/components/video-editor/Content";
import { Controls } from "@/components/video-editor/Controls";
import { useVideoEditor } from "@/components/video-editor/useVideoEditor";

export default function VideoEditor() {
    const { state, setters, actions, contentRef } = useVideoEditor();

    return (
        <div className="flex flex-col gap-3 lg:h-full">
            <Header
                videoUrl={state.videoUrl}
                setVideoUrl={setters.setVideoUrl}
                isLocalhost={state.isLocalhost}
                isNative={state.isNative}
                onInputFocus={actions.handleInputFocus}
                onStopServer={actions.handleStopServer}
            />

            <div className="grid grid-cols-1 gap-5 lg:min-h-0 lg:flex-1 lg:grid-cols-3">
                <div ref={contentRef} className="flex flex-col scroll-mt-4 lg:col-span-2 lg:h-full">
                    <Content
                        downloadedFilename={state.downloadedFilename}
                        previewUrl={state.previewUrl}
                        isProbing={state.isProbing}
                        onClosePreview={() => setters.setDownloadedFilename(null)}
                        onPlayer={actions.handlePlayer}
                    />
                </div>

                <div className="flex flex-col lg:col-span-1 lg:h-full">
                    <Controls
                        start={state.time.start}
                        end={state.time.end}
                        setStart={{ h: setters.setStartH, m: setters.setStartM, s: setters.setStartS }}
                        setEnd={{ h: setters.setEndH, m: setters.setEndM, s: setters.setEndS }}
                        filename={state.filename}
                        setFilename={setters.setFilename}
                        heights={state.heights}
                        selectedHeight={state.selectedHeight}
                        setSelectedHeight={setters.setSelectedHeight}
                        isProbing={state.isProbing}
                        downloadUrl={state.downloadUrl}
                        recentLinks={state.recentLinks}
                        isLocalhost={state.isLocalhost}
                        isNative={state.isNative}
                        isDownloading={state.isDownloading}
                        downloadProgress={state.downloadProgress}
                        ytDlpVersion={state.ytDlpVersion}
                        videoId={state.videoId}
                        downloadedFilename={state.downloadedFilename}
                        advancedCookies={state.advancedCookies}
                        setAdvancedCookies={setters.setAdvancedCookies}
                        onPreview={actions.handlePreview}
                        onDownload={actions.handleDownload}
                        onCancelDownload={actions.handleCancelDownload}
                        onOpenFolder={actions.handleOpenFolder}
                        onInputFocus={actions.handleInputFocus}
                    />
                </div>
            </div>
        </div>
    );
}
