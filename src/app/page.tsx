import { getWorkers, getWorkLogs, getJobs, getRecommendation, getInvoices, logoutPortal } from "./actions";
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
  const invoices = await getInvoices();

  return (
    <div className="flex-1 w-full bg-[#0d0e10] text-[#ffffff] flex flex-col min-h-screen relative overflow-hidden">
      {/* Glowing background accent gradient */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[400px] bg-gradient-to-b from-indigo-500/5 via-teal-500/2 to-transparent blur-[120px] pointer-events-none -z-10" />

      <main className="flex-1 flex flex-col justify-start relative z-10">
        <PublicDashboard
          workers={workers}
          jobs={jobs}
          workLogs={workLogs}
          recommendation={recommendation}
          showRecommendation={showRecommendation}
          daysSinceLastInvoice={daysSinceLastInvoice}
          invoices={invoices}
        />
      </main>

      <footer className="w-full border-t border-zinc-900/80 py-6 bg-zinc-950/40 shrink-0">
        <div className="max-w-7xl mx-auto px-4 text-center text-xs text-zinc-600 font-medium">
          &copy; {new Date().getFullYear()} SVJ Invoice Manager
        </div>
      </footer>
    </div>
  );
}
