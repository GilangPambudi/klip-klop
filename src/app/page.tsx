import VideoEditor from "@/components/VideoEditor";

export default function Home() {
  return (
    <main className="min-h-screen bg-background flex items-start justify-center p-4 pb-6 lg:h-screen lg:items-center">
      <div className="w-full md:max-w-[90%] sm:max-w-full lg:h-full lg:max-h-[calc(100vh-2.5rem)]">
        <VideoEditor />
      </div>
    </main>
  );
}
