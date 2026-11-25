import { APP_NAME, Logo } from "@/components/layout/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-primary p-10 text-white lg:flex">
        <div className="flex items-center gap-3 text-lg font-semibold">
          <Logo size={40} />
          {APP_NAME}
        </div>
        <div className="max-w-md">
          <Logo size={220} priority className="mb-8 drop-shadow-2xl" />
          <h2 className="text-3xl font-semibold leading-tight">Ruang kerja produksi podcast untuk tim Anda.</h2>
          <p className="mt-4 text-white/70">
            Kelola project, episode, narasumber, riset, naskah, pertanyaan, rundown, hingga teleprompter dalam satu tempat.
          </p>
        </div>
        <p className="text-sm text-white/50">© {new Date().getFullYear()} {APP_NAME}</p>
      </div>
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-3 font-semibold lg:hidden">
            <Logo size={56} priority />
            {APP_NAME}
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
