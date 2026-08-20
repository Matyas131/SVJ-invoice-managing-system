"use client";

import React, { useState, useTransition } from "react";
import { createWorkLog, deleteWorkLog, updateWorkLog } from "./actions";

interface Worker {
  id: number;
  name: string;
}

interface Job {
  id: number;
  title: string;
  reward: number;
}

interface WorkLog {
  id: number;
  workerId: number;
  jobId: number;
  date: Date;
  isBilled: boolean;
  worker: Worker;
  job: Job;
}

interface Invoice {
  id: number;
  invoiceNumber: string;
  amount: number;
  status: string;
  issuedAt: Date;
  fakturoidUrl: string | null;
}

interface Recommendation {
  id: number;
  title: string;
  conditionType: string;
  conditionValue: number;
  jobId: number | null;
  job?: Job | null;
}

interface PublicDashboardProps {
  workers: Worker[];
  jobs: Job[];
  workLogs: WorkLog[];
  recommendation: Recommendation | null;
  showRecommendation: boolean;
  daysSinceLastInvoice: number | null;
  invoices: Invoice[];
}

export default function PublicDashboard({
  workers,
  jobs,
  workLogs,
  recommendation,
  showRecommendation,
  daysSinceLastInvoice,
  invoices,
}: PublicDashboardProps) {
  const [isPending, startTransition] = useTransition();
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  
  // Modal State for viewing and editing work logs
  const [isLogsListOpen, setIsLogsListOpen] = useState(false);

  // Editing work log state
  const [editingLogId, setEditingLogId] = useState<number | null>(null);
  const [editWorkerId, setEditWorkerId] = useState("");
  const [editJobId, setEditJobId] = useState("");
  const [editDate, setEditDate] = useState("");

  // Form State (inline on the card)
  const [workerId, setWorkerId] = useState("");
  const [jobId, setJobId] = useState("");
  const [date, setDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!workerId || !jobId || !date) {
      showToast("Please fill in all fields", "error");
      return;
    }

    startTransition(async () => {
      const res = await createWorkLog({
        workerId: parseInt(workerId, 10),
        jobId: parseInt(jobId, 10),
        date,
      });

      if (res.error) {
        showToast(res.error, "error");
      } else {
        showToast("Work logged successfully! Great job!", "success");
        setWorkerId("");
        setJobId("");
      }
    });
  };

  // Edit / Delete Handlers inside Modal
  const startEditing = (log: WorkLog) => {
    setEditingLogId(log.id);
    setEditWorkerId(String(log.workerId));
    setEditJobId(String(log.jobId));
    setEditDate(new Date(log.date).toISOString().split("T")[0]);
  };

  const cancelEditing = () => {
    setEditingLogId(null);
  };

  const handleEditSubmit = (e: React.FormEvent, logId: number) => {
    e.preventDefault();
    if (!editWorkerId || !editJobId || !editDate) return;

    startTransition(async () => {
      const res = await updateWorkLog(logId, {
        workerId: parseInt(editWorkerId, 10),
        jobId: parseInt(editJobId, 10),
        date: editDate,
      });

      if (res.error) {
        showToast(res.error, "error");
      } else {
        showToast("Záznam byl úspěšně upraven", "success");
        setEditingLogId(null);
      }
    });
  };

  const handleDeleteLog = (logId: number) => {
    if (confirm("Opravdu chcete smazat tento záznam o práci?")) {
      startTransition(async () => {
        const res = await deleteWorkLog(logId);
        if (res.error) {
          showToast(res.error, "error");
        } else {
          showToast("Záznam byl úspěšně smazán", "success");
        }
      });
    }
  };

  // Helper: Initials
  const getInitials = (name: string) => {
    if (!name) return "";
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  // Helper: Avatar color based on hash of worker name
  const getAvatarColor = (name: string) => {
    const colors = [
      "bg-red-500/10 text-red-400 border border-red-500/20",
      "bg-blue-500/10 text-blue-400 border border-blue-500/20",
      "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
      "bg-amber-500/10 text-amber-400 border border-amber-500/20",
      "bg-purple-500/10 text-purple-400 border border-purple-500/20",
      "bg-pink-500/10 text-pink-400 border border-pink-500/20",
      "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20",
      "bg-teal-500/10 text-teal-400 border border-teal-500/20",
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  };

  // Calculate Metrics
  const totalInvoiced = invoices.reduce((sum, inv) => sum + inv.amount, 0);
  const totalInvoicesCount = invoices.length;
  const paidInvoicesCount = invoices.filter((inv) => inv.status === "Paid").length;
  const paidInvoicesAmount = invoices.filter((inv) => inv.status === "Paid").reduce((sum, inv) => sum + inv.amount, 0);

  const totalJobsCompleted = workLogs.length;
  const unbilledLogs = workLogs.filter((log) => !log.isBilled);
  const unbilledRewards = unbilledLogs.reduce((sum, log) => sum + log.job.reward, 0);

  const billedLogs = workLogs.filter((log) => log.isBilled);
  const billedRatio = totalJobsCompleted > 0 ? Math.round((billedLogs.length / totalJobsCompleted) * 100) : 0;

  // Calculate Leaderboard / Earnings per resident
  const earningsMap: { [workerName: string]: number } = {};
  workers.forEach((w) => {
    earningsMap[w.name] = 0;
  });
  workLogs.forEach((log) => {
    if (earningsMap[log.worker.name] !== undefined) {
      earningsMap[log.worker.name] += log.job.reward;
    }
  });

  const leaderboard = Object.keys(earningsMap)
    .map((name) => ({ name, amount: earningsMap[name] }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 6); // Take top 6 for the chart layout

  const maxAmount = Math.max(...leaderboard.map((item) => item.amount), 1);

  return (
    <div className="flex-1 w-full bg-[#0d0e10] text-[#ffffff] font-mono p-4 sm:p-6 lg:p-8 flex flex-col justify-start selection:bg-[#4f6272] selection:text-white">
      {/* Toast Alert */}
      {toast && (
        <div
          className={`fixed bottom-5 right-5 z-50 flex items-center gap-3 px-5 py-4 rounded border shadow-2xl transition-all duration-300 bg-[#1c1d1f] ${
            toast.type === "success"
              ? "text-emerald-400 border-emerald-500/30"
              : "text-rose-400 border-rose-500/30"
          }`}
        >
          {toast.type === "success" ? (
            <svg className="w-5 h-5 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ) : (
            <svg className="w-5 h-5 text-rose-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
          <span className="text-xs font-semibold uppercase tracking-wide">{toast.message}</span>
          <button onClick={() => setToast(null)} className="ml-3 text-zinc-500 hover:text-white transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Main Grid Layout (Matching visual positions and dimensions of inspo) */}
      <main className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        
        {/* Column 1 (Leftmost Column) */}
        <div className="flex flex-col gap-4">
          
          {/* Tile 1: VYFAKTUROVÁNO CELKEM (Today's Focus - Blue-grey accent) */}
          <div className="bg-[#4f6272] text-white p-5 rounded flex flex-col justify-between h-[180px] relative overflow-hidden group">
            <div className="flex items-start justify-between">
              <span className="text-[11px] font-bold uppercase tracking-widest text-white/80">VYFAKTUROVÁNO CELKEM</span>
              <span className="text-white/40 group-hover:text-white/80 transition-colors cursor-help">● ● ●</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-7xl xl:text-8xl font-semibold tracking-tighter leading-none">
                {totalInvoiced >= 1000 ? `${(totalInvoiced / 1000).toFixed(1)}k` : totalInvoiced}
              </span>
              <span className="text-xs sm:text-sm text-white/60 font-bold uppercase tracking-widest">/ CZK</span>
            </div>
          </div>

          {/* Tile 2: SPLNĚNÉ PRÁCE (Completed Tasks - Dark background) */}
          <div className="bg-[#1c1d1f] p-5 rounded flex flex-col justify-between h-[180px] border border-[#2b2c2f]/40 relative group">
            <div className="flex items-start justify-between">
              <span className="text-[11px] font-bold uppercase tracking-widest text-zinc-500">SPLNĚNÉ PRÁCE</span>
              <span className="text-zinc-700 group-hover:text-zinc-400 transition-colors cursor-help">● ● ●</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-7xl xl:text-8xl font-semibold tracking-tighter leading-none text-white">
                {totalJobsCompleted}
              </span>
              <span className="text-xs sm:text-sm text-zinc-500 font-bold uppercase tracking-widest">/ LOGS</span>
            </div>
          </div>

          {/* Tile 3: LOG JOBS + LATEST WORKS (Inline form / no popup to log) */}
          <div className="bg-[#1c1d1f] p-5 rounded border border-[#2b2c2f]/40 flex flex-col justify-between min-h-[460px] group">
            <div className="flex items-start justify-between w-full">
              <span className="text-[11px] font-bold uppercase tracking-widest text-zinc-500">ZAPSAT PRÁCI</span>
              
              {/* Trigger Button - Circle with Up-Right Arrow (Open Edit logs list) */}
              <button 
                onClick={() => setIsLogsListOpen(true)}
                className="w-7 h-7 rounded-full bg-[#c9c7b9] hover:bg-white text-[#1c1d1f] transition-all flex items-center justify-center hover:scale-105 active:scale-95 shadow-md"
                title="View and Edit Logged Jobs"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" />
                </svg>
              </button>
            </div>

            {/* Embedded Inline Form to Log Work Directly */}
            <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-2.5 my-auto">
              <div>
                <select
                  value={workerId}
                  onChange={(e) => setWorkerId(e.target.value)}
                  className="w-full bg-[#131416] border border-[#2b2c2f] rounded px-3 py-2 text-white focus:outline-none focus:border-zinc-500 transition-colors text-xs font-mono"
                  required
                >
                  <option value="" disabled>-- Kdo pracoval? --</option>
                  {workers.map((w) => (
                    <option key={w.id} value={w.id} className="bg-[#1c1d1f]">
                      {w.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <select
                  value={jobId}
                  onChange={(e) => setJobId(e.target.value)}
                  className="w-full bg-[#131416] border border-[#2b2c2f] rounded px-3 py-2 text-white focus:outline-none focus:border-zinc-500 transition-colors text-xs font-mono"
                  required
                >
                  <option value="" disabled>-- Hotová práce --</option>
                  {jobs.map((j) => (
                    <option key={j.id} value={j.id} className="bg-[#1c1d1f]">
                      {j.title} ({j.reward} CZK)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-[#131416] border border-[#2b2c2f] rounded px-3 py-2 text-white focus:outline-none focus:border-zinc-500 transition-colors text-xs font-mono"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isPending || workers.length === 0 || jobs.length === 0}
                className="w-full bg-[#c9c7b9] hover:bg-white text-[#1c1d1f] font-bold py-2.5 rounded transition-colors text-[10px] uppercase tracking-widest disabled:opacity-40"
              >
                {isPending ? "Zapisuji..." : "ZAPISAT AKTIVITU"}
              </button>
            </form>

            {/* Divider and Latest Activity avatars grid */}
            <div className="border-t border-[#232427] pt-4 mt-4">
              <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3">POSLEDNÍ AKTIVITY</h4>
              
              {workLogs.length === 0 ? (
                <div className="text-[9px] text-zinc-600">Žádná historie</div>
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  {workLogs.slice(0, 6).map((log) => {
                    const initials = getInitials(log.worker.name);
                    const colorClasses = getAvatarColor(log.worker.name);
                    const formattedDate = new Date(log.date).toLocaleDateString("cs-CZ");
                    return (
                      <div key={log.id} className="relative group/item flex justify-center">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold transition-all hover:scale-105 ${colorClasses}`}>
                          {initials}
                        </div>
                        {/* Custom Tooltip */}
                        <div className="absolute bottom-full mb-2 hidden group-hover/item:block bg-[#131416] text-[9px] text-zinc-300 p-2.5 rounded border border-[#2b2c2f] shadow-2xl whitespace-nowrap z-50 pointer-events-none">
                          <span className="font-bold text-white block mb-0.5">{log.worker.name}</span>
                          <span className="text-zinc-400 block">{log.job.title}</span>
                          <span className="text-emerald-400 block mt-0.5 font-bold">+{log.job.reward} CZK</span>
                          <span className="text-[8px] text-zinc-600 block mt-0.5">{formattedDate}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Column 2 */}
        <div className="flex flex-col gap-4">
          
          {/* Tile 4: PLACENÉ FAKTURY (Paid Invoices - Tall double-unit card) */}
          <div className="bg-[#1c1d1f] p-5 rounded border border-[#2b2c2f]/40 flex flex-col justify-between h-[376px] group">
            <div className="flex items-start justify-between">
              <span className="text-[11px] font-bold uppercase tracking-widest text-zinc-500">PLACENÉ FAKTURY</span>
              <span className="text-zinc-700 group-hover:text-zinc-400 transition-colors cursor-help">● ● ●</span>
            </div>

            <div className="my-auto flex items-baseline gap-2">
              <span className="text-7xl xl:text-8xl font-semibold tracking-tighter leading-none text-white">
                {paidInvoicesCount}
              </span>
              <span className="text-xs sm:text-sm text-zinc-500 font-bold uppercase tracking-widest">
                / {totalInvoicesCount}
              </span>
            </div>

            <div className="border-t border-[#232427] pt-4 flex flex-col gap-1.5 text-[10px] tracking-wider text-zinc-400 uppercase">
              <div className="flex justify-between">
                <span>VYPLACENÝ OBSAH:</span>
                <span className="text-emerald-400 font-bold">{paidInvoicesAmount.toLocaleString("cs-CZ")} CZK</span>
              </div>
              <div className="flex justify-between text-zinc-600">
                <span>CELKOVÝ NÁROK:</span>
                <span>{totalInvoiced.toLocaleString("cs-CZ")} CZK</span>
              </div>
            </div>
          </div>

          {/* Tile 5: RECOMMENDED WORK (Aesthetic Usability Effect - Tall Blue-grey card) */}
          <div className="bg-[#4f6272] text-white p-5 rounded flex flex-col justify-between h-[376px] relative overflow-hidden group">
            {/* Background geometric design vector (Fibonacci Style / Clean housing vector overlay) */}
            <div className="absolute top-2 right-2 w-28 h-28 opacity-15 pointer-events-none">
              <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="50" cy="50" r="45" />
                <rect x="15" y="15" width="70" height="70" />
                <line x1="50" y1="5" x2="50" y2="95" />
                <line x1="5" y1="50" x2="95" y2="50" />
                <path d="M 50 95 A 45 45 0 0 0 95 50" />
                <path d="M 95 50 A 45 45 0 0 0 50 5" />
              </svg>
            </div>

            <div>
              <span className="text-[11px] font-bold uppercase tracking-widest text-white/80">DOPORUČENÁ ÚDRŽBA</span>
              
              <div className="mt-8">
                <h3 className="text-xl font-bold leading-snug uppercase">
                  {showRecommendation && recommendation ? recommendation.title : "Vše v pořádku"}
                </h3>
                <p className="text-[10px] text-white/70 mt-3 leading-relaxed">
                  {showRecommendation && recommendation ? (
                    daysSinceLastInvoice !== null ? (
                      `Od poslední faktury uplynulo ${daysSinceLastInvoice} dní (limit: ${recommendation.conditionValue} dní).`
                    ) : (
                      `Nemáme žádné přechozí faktury. Limit doporučení je nastaven na ${recommendation.conditionValue} dní.`
                    )
                  ) : (
                    "Žádná doporučená údržba na základě pravidel. Všechny podmínky jsou splněny."
                  )}
                </p>
              </div>
            </div>

            {/* Slider Dots */}
            <div className="flex items-center gap-1.5 mt-auto">
              <span className="w-1.5 h-1.5 rounded-full bg-white" />
              <span className="w-1.5 h-1.5 rounded-full bg-white/30" />
              <span className="w-1.5 h-1.5 rounded-full bg-white/30" />
              <span className="w-1.5 h-1.5 rounded-full bg-white/30" />
              <span className="w-1.5 h-1.5 rounded-full bg-white/30" />
            </div>
          </div>
        </div>

        {/* Column 3 & 4 (Combined spanning sections) */}
        <div className="col-span-1 md:col-span-2 flex flex-col gap-4">
          
          {/* Tile 6: CELKOVÝ PŘEHLED REZIDENTŮ (Clean Vertical Bar Chart Only) */}
          <div className="bg-[#1c1d1f] p-5 rounded border border-[#2b2c2f]/40 flex flex-col justify-between min-h-[376px] group">
            <div className="flex items-start justify-between w-full mb-4">
              <span className="text-[11px] font-bold uppercase tracking-widest text-zinc-500">PŘEHLED REZIDENTŮ (CZK)</span>
              
              <div className="flex items-center gap-2 text-[9px] text-zinc-600 font-bold uppercase tracking-widest">
                <span className="hover:text-zinc-300 cursor-pointer">7D</span>
                <span className="hover:text-zinc-300 cursor-pointer">30D</span>
                <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 cursor-pointer">3M</span>
                <span className="hover:text-zinc-300 cursor-pointer">12M</span>
              </div>
            </div>

            {/* Full-width & Full-height Vertical Bar Chart Column Graph */}
            <div className="flex items-end justify-between h-[250px] px-2 border-b border-[#232427] gap-3 mt-auto w-full">
              {leaderboard.length === 0 ? (
                <div className="w-full text-center text-[10px] text-zinc-600 mb-6">Žádná statistika</div>
              ) : (
                leaderboard.map((item, index) => {
                  const percentage = (item.amount / maxAmount) * 100;
                  const barBg = index === 0 ? "bg-[#4f6272] hover:bg-white" : "bg-zinc-700 hover:bg-zinc-400";
                  return (
                    <div key={item.name} className="flex flex-col items-center flex-1 h-full justify-end group/bar relative">
                      {/* Tooltip */}
                      <div className="absolute bottom-full mb-2 hidden group-hover/bar:block bg-[#131416] text-[9px] text-zinc-300 p-2.5 rounded border border-[#2b2c2f] shadow-2xl text-center z-50 whitespace-nowrap pointer-events-none">
                        <span className="font-bold text-white block mb-0.5">{item.name}</span>
                        <span className="text-emerald-400 font-bold block">{item.amount.toLocaleString()} CZK</span>
                      </div>

                      {/* Display value above bar if greater than 0 */}
                      {item.amount > 0 && (
                        <span className="text-[9px] text-zinc-400 mb-1.5 font-bold tracking-tight">
                          {item.amount >= 1000 ? `${(item.amount / 1000).toFixed(1)}k` : item.amount}
                        </span>
                      )}

                      {/* Bar Graphic */}
                      <div 
                        className={`w-full rounded-t-sm transition-all duration-500 cursor-pointer ${barBg}`}
                        style={{ height: `${Math.max(percentage, 8)}%` }}
                      />

                      {/* Label (Initials) */}
                      <span className="text-[10px] text-zinc-500 mt-2.5 font-bold tracking-widest uppercase truncate max-w-full">
                        {getInitials(item.name)}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Sub Grid (Lower half of columns 3 & 4: Unbilled Rewards & Billed Ratio) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Tile 7: ROZPRACOVANÉ ODMĚNY (ChatGPT API Usage - Progress bar layout) */}
            <div className="bg-[#1c1d1f] p-5 rounded border border-[#2b2c2f]/40 flex flex-col justify-between h-[180px] group">
              <div className="flex items-start justify-between">
                <span className="text-[11px] font-bold uppercase tracking-widest text-zinc-500">ROZPRACOVANÉ ODMĚNY</span>
                <span className="text-zinc-700 group-hover:text-zinc-400 transition-colors cursor-help">● ● ●</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-5xl sm:text-6xl xl:text-7xl font-semibold tracking-tighter text-white leading-none">
                  {unbilledRewards.toLocaleString("cs-CZ")}
                </span>
                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest leading-none">
                  / 10k
                </span>
              </div>
              {/* Progress bar */}
              <div className="w-full bg-[#131416] rounded-full h-1.5 overflow-hidden">
                <div 
                  className="bg-[#4f6272] h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min((unbilledRewards / 10000) * 100, 100)}%` }}
                />
              </div>
            </div>

            {/* Tile 8: STAV VYÚČTOVÁNÍ (Work Life Balance - Circular progress layout) */}
            <div className="bg-[#1c1d1f] p-5 rounded border border-[#2b2c2f]/40 flex flex-col justify-between h-[180px] group">
              <div className="flex items-start justify-between">
                <span className="text-[11px] font-bold uppercase tracking-widest text-zinc-500">STAV VYÚČTOVÁNÍ</span>
                <span className="text-zinc-700 group-hover:text-zinc-400 transition-colors cursor-help">● ● ●</span>
              </div>

              <div className="flex items-center justify-between gap-4 my-auto">
                <div className="flex items-baseline gap-1">
                  <span className="text-5xl sm:text-6xl xl:text-7xl font-semibold tracking-tighter text-white leading-none">
                    {billedRatio}
                  </span>
                  <span className="text-xs text-zinc-500 font-bold uppercase tracking-widest">%</span>
                </div>

                {/* SVG circular progress ring */}
                <div className="relative w-20 h-20 shrink-0">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    <circle 
                      cx="50" 
                      cy="50" 
                      r="40" 
                      className="text-zinc-800" 
                      strokeWidth="6" 
                      stroke="currentColor" 
                      fill="transparent" 
                    />
                    <circle 
                      cx="50" 
                      cy="50" 
                      r="40" 
                      className="text-[#4f6272]" 
                      strokeWidth="6" 
                      stroke="currentColor" 
                      fill="transparent" 
                      strokeDasharray="251.2" 
                      strokeDashoffset={251.2 - (251.2 * billedRatio) / 100}
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
              </div>
            </div>

          </div>

          {/* Tile 9: ADMINISTRACE (Custom Dashboard - Tan Accent Card / Spans Col 3-4 width) */}
          <a 
            href="/admin"
            className="bg-[#c9c7b9] hover:bg-white text-[#1c1d1f] p-5 rounded flex flex-col justify-between h-[180px] group transition-colors shadow-lg cursor-pointer"
          >
            <div className="flex items-start justify-between w-full">
              <span className="text-[11px] font-bold uppercase tracking-widest text-[#1c1d1f]/70">ZABEZPEČENÁ OBLAST</span>
              
              {/* Arrow Indicator Button */}
              <div className="w-8 h-8 rounded-full bg-[#1c1d1f] text-white flex items-center justify-center transition-all group-hover:scale-105 active:scale-95">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" />
                </svg>
              </div>
            </div>

            <div className="mt-4">
              <h3 className="text-4xl sm:text-5xl font-semibold tracking-tighter uppercase leading-none">ADMINISTRACE</h3>
              <div className="text-[10px] text-[#1c1d1f]/60 tracking-widest uppercase mt-2">
                PRO SPRÁVU FAKTUR A NASTAVENÍ SYSTÉMU
              </div>
            </div>
          </a>

        </div>

      </main>

      {/* Logged Jobs List Modal (Arrow click opens this) */}
      {isLogsListOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1c1d1f] border border-[#2b2c2f] p-6 rounded w-full max-w-4xl max-h-[90vh] flex flex-col relative animate-in fade-in zoom-in duration-200">
            
            {/* Close Button */}
            <button 
              onClick={() => setIsLogsListOpen(false)}
              className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-6 flex items-center gap-2">
              Seznam odpracovaných úloh
            </h2>

            {/* Table/List Container */}
            <div className="flex-1 overflow-y-auto pr-1 text-xs">
              {workLogs.length === 0 ? (
                <div className="text-center py-12 text-zinc-500">Žádné záznamy o práci</div>
              ) : (
                <div className="space-y-3">
                  {workLogs.map((log) => (
                    <div key={log.id} className="border border-[#2b2c2f] p-3 rounded bg-[#131416] flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                      
                      {editingLogId === log.id ? (
                        /* Edit Mode Form */
                        <form onSubmit={(e) => handleEditSubmit(e, log.id)} className="w-full grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
                          <select
                            value={editWorkerId}
                            onChange={(e) => setEditWorkerId(e.target.value)}
                            className="bg-[#1c1d1f] border border-[#2b2c2f] rounded p-2 text-white font-mono text-xs focus:outline-none"
                            required
                          >
                            {workers.map((w) => (
                              <option key={w.id} value={w.id}>{w.name}</option>
                            ))}
                          </select>

                          <select
                            value={editJobId}
                            onChange={(e) => setEditJobId(e.target.value)}
                            className="bg-[#1c1d1f] border border-[#2b2c2f] rounded p-2 text-white font-mono text-xs focus:outline-none"
                            required
                          >
                            {jobs.map((j) => (
                              <option key={j.id} value={j.id}>{j.title} ({j.reward} CZK)</option>
                            ))}
                          </select>

                          <input
                            type="date"
                            value={editDate}
                            onChange={(e) => setEditDate(e.target.value)}
                            className="bg-[#1c1d1f] border border-[#2b2c2f] rounded p-2 text-white font-mono text-xs focus:outline-none"
                            required
                          />

                          <div className="flex gap-2 justify-end">
                            <button type="submit" className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold uppercase">
                              Uložit
                            </button>
                            <button type="button" onClick={cancelEditing} className="px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] font-bold uppercase">
                              Zrušit
                            </button>
                          </div>
                        </form>
                      ) : (
                        /* Read Mode Row */
                        <>
                          <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <div>
                              <span className="text-[10px] text-zinc-500 block uppercase font-bold">Soused</span>
                              <span className="font-bold text-white">{log.worker.name}</span>
                            </div>
                            <div>
                              <span className="text-[10px] text-zinc-500 block uppercase font-bold">Práce</span>
                              <span className="text-zinc-300">{log.job.title}</span>
                            </div>
                            <div>
                              <span className="text-[10px] text-zinc-500 block uppercase font-bold">Datum & Odměna</span>
                              <span className="text-zinc-400 font-mono">
                                {new Date(log.date).toLocaleDateString("cs-CZ")} • <span className="text-emerald-400 font-bold">+{log.job.reward} CZK</span>
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-end md:self-auto">
                            {log.isBilled ? (
                              <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                Fakturováno
                              </span>
                            ) : (
                              <>
                                <button 
                                  onClick={() => startEditing(log)}
                                  className="px-2.5 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors text-[10px] uppercase font-bold"
                                >
                                  Upravit
                                </button>
                                <button 
                                  onClick={() => handleDeleteLog(log.id)}
                                  className="px-2.5 py-1.5 rounded bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 hover:text-rose-300 transition-colors text-[10px] uppercase font-bold border border-rose-950/50"
                                >
                                  Smazat
                                </button>
                              </>
                            )}
                          </div>
                        </>
                      )}

                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
