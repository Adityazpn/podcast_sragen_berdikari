import { Mic } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-primary p-10 text-white lg:flex">
        <div className="flex items-center gap-2 text-lg font-semibold">
          <span className="flex size-8 items-center justify-center rounded-lg bg-accent">
            <Mic className="size-4" />
          </span>
          Podcast Studio
        </div>
        <div className="max-w-md">
          <h2 className="text-3xl font-semibold leading-tight">Ruang kerja produksi podcast untuk tim Anda.</h2>
          <p className="mt-4 text-white/70">
            Kelola project, episode, narasumber, riset, naskah, pertanyaan, rundown, hingga teleprompter dalam satu tempat.
          </p>
        </div>
        <p className="text-sm text-white/50">© {new Date().getFullYear()} Podcast Studio</p>
      </div>
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
}
