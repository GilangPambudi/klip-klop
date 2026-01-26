"use client";

import React from "react";
import { Header } from "@/components/video-editor/Header";
import { Content } from "@/components/video-editor/Content";
import { Controls } from "@/components/video-editor/Controls";
import { useVideoEditor } from "@/components/video-editor/useVideoEditor";

export default function VideoEditor() {
    const { state, setters, actions } = useVideoEditor();

    return (
        <div className="flex flex-col h-full space-y-3">
            <Header
                videoUrl={state.videoUrl}
                setVideoUrl={setters.setVideoUrl}
                onInputFocus={actions.handleInputFocus}
                onStopServer={actions.handleStopServer}
            />

            <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-3 gap-5">
                <div className="lg:col-span-2 h-full flex flex-col">
                    <Content
                        downloadedFilename={state.downloadedFilename}
                        videoId={state.videoId}
                        onClosePreview={() => setters.setDownloadedFilename(null)}
                    />
                </div>

                <div className="lg:col-span-1 h-full flex flex-col">
                    <Controls
                        start={state.time.start}
                        end={state.time.end}
                        setStart={{ h: setters.setStartH, m: setters.setStartM, s: setters.setStartS }}
                        setEnd={{ h: setters.setEndH, m: setters.setEndM, s: setters.setEndS }}
                        filename={state.filename}
                        setFilename={setters.setFilename}
                        isDownloading={state.isDownloading}
                        videoId={state.videoId}
                        downloadedFilename={state.downloadedFilename}
                        onPreview={actions.handlePreview}
                        onDownload={actions.handleDownload}
                        onOpenFolder={actions.handleOpenFolder}
                        onInputFocus={actions.handleInputFocus}
                    />
                </div>
            </div>
        </div>
    );
}
