"use client";

import React, { useState, useTransition } from "react";
import { createWorkLog } from "./actions";

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
  lastInvoice: Invoice | null;
  daysSinceLastInvoice: number | null;
}

export default function PublicDashboard({
  workers,
  jobs,
  workLogs,
  recommendation,
  showRecommendation,
  lastInvoice,
  daysSinceLastInvoice,
}: PublicDashboardProps) {
  const [isPending, startTransition] = useTransition();
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Form State
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

  // Calculate Stats
  const totalJobs = workLogs.length;
  const totalEarned = workLogs.reduce((sum, log) => sum + log.job.reward, 0);
  const activeWorkersCount = workers.length;

  // Calculate Leaderboard (Competition Graph Data)
  const earningsMap: { [workerName: string]: number } = {};
  // Initialize map with all workers (so they show up even if 0 CZK)
  workers.forEach((w) => {
    earningsMap[w.name] = 0;
  });
  // Sum rewards
  workLogs.forEach((log) => {
    if (earningsMap[log.worker.name] !== undefined) {
      earningsMap[log.worker.name] += log.job.reward;
    }
  });

  // Convert to sorted array
  const leaderboard = Object.keys(earningsMap)
    .map((name) => ({ name, amount: earningsMap[name] }))
    .sort((a, b) => b.amount - a.amount);

  // Find max value to normalize bar widths
  const maxAmount = Math.max(...leaderboard.map((item) => item.amount), 1);

  return (
    <div className="flex-1 w-full max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
      {/* Toast Alert */}
      {toast && (
        <div
          className={`fixed bottom-5 right-5 z-50 flex items-center gap-3 px-5 py-4 rounded-xl border shadow-2xl transition-all duration-300 ${
            toast.type === "success"
              ? "bg-emerald-950/90 text-emerald-200 border-emerald-500/30"
              : "bg-rose-950/90 text-rose-200 border-rose-500/30"
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
          <span className="text-sm font-medium">{toast.message}</span>
          <button onClick={() => setToast(null)} className="ml-3 hover:text-white transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Header section with shortcut to admin */}
      <header className="mb-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-teal-400 via-indigo-400 to-purple-500 bg-clip-text text-transparent">
            SVJ House Work Portal
          </h1>
          <p className="text-zinc-400 mt-1 text-sm sm:text-base">
            Select your name and the job you completed to register your reward.
          </p>
        </div>

        <a
          href="/admin"
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white hover:border-zinc-700 active:scale-95 transition-all shadow-md self-start"
        >
          <svg className="w-4 h-4 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          Admin Tools
        </a>
      </header>

      {/* Dynamic Recommendation Banner */}
      {showRecommendation && recommendation && (
        <div className="mb-8 bg-gradient-to-r from-teal-500/10 via-indigo-500/10 to-transparent border border-teal-500/20 rounded-2xl p-6 relative overflow-hidden shadow-lg shadow-teal-950/20">
          <div className="absolute top-0 right-0 w-32 h-32 bg-teal-400/5 rounded-full blur-2xl -z-10" />
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-teal-500/20 flex items-center justify-center text-teal-400 border border-teal-500/30 shrink-0">
                <svg className="w-5 h-5 text-teal-400 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <span className="text-[10px] font-bold text-teal-400 tracking-wider uppercase bg-teal-500/10 px-2 py-0.5 rounded">Recommended Work</span>
                <h3 className="text-lg font-bold text-white mt-1">{recommendation.title}</h3>
                <p className="text-xs text-zinc-400 mt-1">
                  {daysSinceLastInvoice !== null ? (
                    <>
                      It has been <span className="text-teal-400 font-semibold">{daysSinceLastInvoice} days</span> since the last invoice was issued (threshold set to {recommendation.conditionValue} days).
                    </>
                  ) : (
                    <>No invoices have been issued yet. Displaying recommendation threshold of {recommendation.conditionValue} days.</>
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Overview stats tiles */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
        <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-6 backdrop-blur-sm shadow-xl">
          <div className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-2">Total Jobs Logged</div>
          <div className="text-3xl font-extrabold text-white">{totalJobs}</div>
        </div>
        <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-6 backdrop-blur-sm shadow-xl">
          <div className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-2">Total Earned Rewards</div>
          <div className="text-3xl font-extrabold text-teal-400">
            {totalEarned.toLocaleString("cs-CZ")} <span className="text-lg font-medium text-zinc-400">CZK</span>
          </div>
        </div>
        <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-6 backdrop-blur-sm shadow-xl">
          <div className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-2">Active House Residents</div>
          <div className="text-3xl font-extrabold text-indigo-400">{activeWorkersCount}</div>
        </div>
        <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-6 backdrop-blur-sm shadow-xl flex flex-col justify-between">
          <div>
            <div className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-2">Last Issued Invoice</div>
            {lastInvoice ? (
              <div>
                <div className="text-lg font-extrabold text-white truncate">
                  Invoice #{lastInvoice.invoiceNumber}
                </div>
                <div className="text-xs text-zinc-400 mt-1">
                  Issued on: <span className="text-zinc-200 font-medium">{new Date(lastInvoice.issuedAt).toLocaleDateString("cs-CZ")}</span>
                </div>
                <div className="text-xs text-zinc-400 mt-0.5">
                  Amount: <span className="text-teal-400 font-semibold">{lastInvoice.amount.toLocaleString("cs-CZ")} CZK</span>
                </div>
              </div>
            ) : (
              <div className="text-sm text-zinc-500 font-medium py-2">No invoices issued yet</div>
            )}
          </div>
          {lastInvoice && (
            <div className="mt-3 flex items-center justify-between">
              <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                lastInvoice.status === "Paid"
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/25"
                  : "bg-amber-500/10 text-amber-400 border border-amber-500/25"
              }`}>
                {lastInvoice.status}
              </span>
              {lastInvoice.fakturoidUrl && (
                <a
                  href={lastInvoice.fakturoidUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1"
                >
                  View Online
                  <svg className="w-3.5 h-3.5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Log Work Form */}
        <div className="bg-zinc-900/30 border border-zinc-800/80 rounded-2xl p-6 backdrop-blur-sm shadow-xl lg:col-span-1">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <svg className="w-5 h-5 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Log Completed Work
          </h2>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
                Who performed the work?
              </label>
              <select
                value={workerId}
                onChange={(e) => setWorkerId(e.target.value)}
                className="w-full bg-zinc-950/60 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-teal-500 transition-colors text-sm"
                required
              >
                <option value="" disabled>-- Select Name --</option>
                {workers.map((worker) => (
                  <option key={worker.id} value={worker.id} className="bg-zinc-900 text-white">
                    {worker.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
                What work did you do?
              </label>
              <select
                value={jobId}
                onChange={(e) => setJobId(e.target.value)}
                className="w-full bg-zinc-950/60 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-teal-500 transition-colors text-sm"
                required
              >
                <option value="" disabled>-- Select Job (Fixed Reward) --</option>
                {jobs.map((job) => (
                  <option key={job.id} value={job.id} className="bg-zinc-900 text-white">
                    {job.title} ({job.reward.toLocaleString("cs-CZ")} CZK)
                  </option>
                ))}
              </select>
              {jobs.length === 0 && (
                <p className="text-xs text-amber-400/80 mt-2">
                  ⚠️ No predefined jobs set. Ask the administrator to create some.
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
                Date Completed
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-zinc-950/60 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-teal-500 transition-colors text-sm"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isPending || workers.length === 0 || jobs.length === 0}
              className="w-full bg-gradient-to-r from-teal-500 to-indigo-600 hover:from-teal-400 hover:to-indigo-500 text-white font-semibold py-3.5 px-4 rounded-xl shadow-lg shadow-teal-500/10 hover:shadow-teal-500/20 active:scale-[0.98] transition-all duration-200 text-sm disabled:opacity-50"
            >
              {isPending ? "Logging Job..." : "Submit Log Entry"}
            </button>
          </form>
        </div>

        {/* Competition Leaderboard (Bar Graph) */}
        <div className="bg-zinc-900/30 border border-zinc-800/80 rounded-2xl p-6 backdrop-blur-sm shadow-xl lg:col-span-2">
          <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
            <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            Resident Leaderboard
          </h2>
          <p className="text-zinc-500 text-xs sm:text-sm mb-6">
            Compare earnings and spark some competition in managing the house!
          </p>

          {leaderboard.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-zinc-800 rounded-xl bg-zinc-950/20">
              <p className="text-zinc-500 font-medium">No active resident statistics available.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {leaderboard.map((item, index) => {
                const percentage = (item.amount / maxAmount) * 100;
                // Generate rank badge styles
                const isFirst = index === 0;
                const isSecond = index === 1;
                const isThird = index === 2;

                return (
                  <div key={item.name} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-3">
                        <span
                          className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                            isFirst
                              ? "bg-amber-400 text-zinc-950 shadow-md shadow-amber-400/20"
                              : isSecond
                              ? "bg-zinc-300 text-zinc-950"
                              : isThird
                              ? "bg-amber-600 text-zinc-100"
                              : "bg-zinc-800 text-zinc-400"
                          }`}
                        >
                          {index + 1}
                        </span>
                        <span className="font-semibold text-white">{item.name}</span>
                      </div>
                      <span className="font-bold text-zinc-300">
                        {item.amount.toLocaleString("cs-CZ")} <span className="text-xs text-zinc-500 font-normal">CZK</span>
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-zinc-950 rounded-full h-4 overflow-hidden border border-zinc-800/40">
                      <div
                        className={`h-full rounded-full transition-all duration-500 bg-gradient-to-r ${
                          isFirst
                            ? "from-teal-500 to-emerald-400"
                            : "from-indigo-500 to-purple-400"
                        }`}
                        style={{ width: `${Math.max(percentage, 3)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
