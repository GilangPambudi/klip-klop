import VideoEditor from "@/components/VideoEditor";

export default function Home() {
  return (
    <main className="min-h-screen bg-background flex items-start justify-center py-8 px-4 lg:h-screen lg:items-center lg:py-10">
      <div className="w-full md:max-w-[90%] sm:max-w-full lg:h-full lg:max-h-[90vh]">
        <VideoEditor />
      </div>
    </main>
  );
}
