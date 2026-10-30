import VideoEditor from "@/components/VideoEditor";

export default function Home() {
  return (
    <main className="min-h-screen bg-background flex items-start justify-center px-3 pt-3 pb-20 lg:px-4 lg:h-screen lg:items-center lg:py-10">
      <div className="w-full md:max-w-[90%] sm:max-w-full lg:h-full lg:max-h-[90vh]">
        <VideoEditor />
      </div>
    </main>
  );
}
