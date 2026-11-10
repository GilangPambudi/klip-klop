"use client";

import React from "react";
import { Header } from "@/components/video-editor/Header";
import { Content } from "@/components/video-editor/Content";
import { Controls } from "@/components/video-editor/Controls";
import { LoginDialog } from "@/components/video-editor/LoginDialog";
import type { SessionUser } from "@/components/video-editor/UserMenu";
import { useVideoEditor } from "@/components/video-editor/useVideoEditor";

interface VideoEditorProps {
    user: SessionUser | null;
    /** Sign-in providers on offer; empty when sign-in is off (local launcher). */
    providers: string[];
    /** Site setting: preselect the best resolution at or below this. null = the highest available. */
    defaultHeight: number | null;
}

export default function VideoEditor({ user, providers, defaultHeight }: VideoEditorProps) {
    const authEnabled = providers.length > 0;
    const { state, setters, actions, contentRef } = useVideoEditor(authEnabled && !user, user?.credits ?? null, defaultHeight);

    return (
        <div className="flex flex-col gap-3 lg:h-full">
            <LoginDialog
                open={state.loginOpen}
                onOpenChange={setters.setLoginOpen}
                providers={providers}
                onBeforeRedirect={actions.saveDraft}
            />
            <Header
                authEnabled={authEnabled}
                user={user}
                credits={state.credits}
                onLogin={() => setters.setLoginOpen(true)}
                videoUrl={state.videoUrl}
                setVideoUrl={setters.setVideoUrl}
                isLocalhost={state.isLocalhost}
                onInputFocus={actions.handleInputFocus}
                onStopServer={actions.handleStopServer}
            />

            {/* grid-rows-1 = minmax(0,1fr): an `auto` row would grow with the controls and overflow 90vh. */}
            <div className="grid grid-cols-1 gap-3 lg:gap-5 lg:min-h-0 lg:flex-1 lg:grid-cols-3 lg:grid-rows-1">
                <div ref={contentRef} className="flex flex-col scroll-mt-4 lg:col-span-2 lg:h-full">
                    <Content
                        downloadedFilename={state.downloadedFilename}
                        previewUrl={state.previewUrl}
                        isProbing={state.isProbing}
                        onClosePreview={() => setters.setDownloadedFilename(null)}
                        onPlayer={actions.handlePlayer}
                        trim={state.trim}
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
                        format={state.format}
                        setFormat={setters.setFormat}
                        isProbing={state.isProbing}
                        downloadUrl={state.downloadUrl}
                        recentLinks={state.recentLinks}
                        isLocalhost={state.isLocalhost}
                        isDownloading={state.isDownloading}
                        credits={state.credits}
                        banned={user?.banned ?? false}
                        videoId={state.videoId}
                        downloadedFilename={state.downloadedFilename}
                        onPreview={actions.handlePreview}
                        onPreviewFile={actions.handlePreviewFile}
                        onDeleteFile={actions.handleDeleteFile}
                        onDownload={actions.handleDownload}
                        onOpenFolder={actions.handleOpenFolder}
                        onInputFocus={actions.handleInputFocus}
                    />
                </div>
            </div>
        </div>
    );
}
