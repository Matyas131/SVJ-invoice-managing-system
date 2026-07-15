import { getWorkers, getWorkLogs, getJobs, getRecommendation, getLastInvoice, logoutPortal } from "./actions";
import PublicDashboard from "./PublicDashboard";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "SVJ Portal | House Work Logs",
  description: "Secure portal for logging SVJ house maintenance work and tracking resident leaderboards.",
};

export const revalidate = 0; // Force dynamic server rendering

export default async function Page() {
  const workers = await getWorkers();
  const jobs = await getJobs();
  const workLogs = await getWorkLogs();
  const { recommendation, show: showRecommendation, daysSinceLastInvoice } = await getRecommendation();
  const lastInvoice = await getLastInvoice();

  return (
    <div className="flex-1 w-full bg-zinc-950 text-zinc-100 flex flex-col min-h-screen relative overflow-hidden">
      {/* Glowing background accent gradient */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[400px] bg-gradient-to-b from-indigo-500/5 via-teal-500/2 to-transparent blur-[120px] pointer-events-none -z-10" />

      {/* Decorative top border glow */}
      <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-teal-500/50 to-transparent opacity-60 shrink-0" />

      {/* Navigation Banner */}
      <nav className="w-full border-b border-zinc-900 bg-zinc-950/60 backdrop-blur-md relative z-20 shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-teal-400 to-indigo-500 flex items-center justify-center shadow-lg shadow-teal-500/20">
              <svg className="w-4.5 h-4.5 text-zinc-950 font-extrabold" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 12l2 2 4-4" />
              </svg>
            </div>
            <span className="font-bold text-sm tracking-wide text-zinc-200 uppercase">SVJ Portal</span>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-semibold text-zinc-400 tracking-wider uppercase">Portal Unlocked</span>
            </div>

            <form action={logoutPortal}>
              <button
                type="submit"
                className="text-xs font-bold text-zinc-400 hover:text-zinc-200 bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-lg active:scale-95 transition-all cursor-pointer"
              >
                Lock Portal
              </button>
            </form>
          </div>
        </div>
      </nav>

      <main className="flex-1 flex flex-col justify-start relative z-10">
        <PublicDashboard
          workers={workers}
          jobs={jobs}
          workLogs={workLogs}
          recommendation={recommendation}
          showRecommendation={showRecommendation}
          daysSinceLastInvoice={daysSinceLastInvoice}
          lastInvoice={lastInvoice}
        />
      </main>

      <footer className="w-full border-t border-zinc-900/80 py-6 bg-zinc-950/40 shrink-0">
        <div className="max-w-7xl mx-auto px-4 text-center text-xs text-zinc-600 font-medium">
          &copy; {new Date().getFullYear()} SVJ Invoice Manager. Secure Job Tracking.
        </div>
      </footer>
    </div>
  );
}
