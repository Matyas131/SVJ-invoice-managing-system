"use client";

import React, { useState, useTransition } from "react";
import {
  createWorker,
  updateWorker,
  deleteWorker,
  createJob,
  updateJob,
  deleteJob,
  deleteWorkLog,
  createBatchInvoice,
  updateInvoiceStatus,
  updateRecommendation,
  deleteInvoice,
} from "./actions";

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
  invoiceId: string | null;
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

interface AdminDashboardProps {
  workers: Worker[];
  jobs: Job[];
  workLogs: WorkLog[];
  invoices: Invoice[];
  recommendation: Recommendation | null;
}

export default function AdminDashboard({
  workers,
  jobs,
  workLogs,
  invoices,
  recommendation,
}: AdminDashboardProps) {
  const [activeSubTab, setActiveSubTab] = useState<"logs" | "invoices" | "recommendation" | "jobs" | "workers">("logs");
  const [isPending, startTransition] = useTransition();
  const [isBilling, setIsBilling] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "invoice" } | null>(null);
  const [invoiceLink, setInvoiceLink] = useState<string | null>(null);

  // Worker Form State
  const [newWorkerName, setNewWorkerName] = useState("");
  const [editingWorkerId, setEditingWorkerId] = useState<number | null>(null);
  const [editingWorkerName, setEditingWorkerName] = useState("");

  // Job Form State
  const [newJobTitle, setNewJobTitle] = useState("");
  const [newJobReward, setNewJobReward] = useState("");
  const [editingJobId, setEditingJobId] = useState<number | null>(null);
  const [editingJobTitle, setEditingJobTitle] = useState("");
  const [editingJobReward, setEditingJobReward] = useState("");

  // Recommendation Form State
  const [recTitle, setRecTitle] = useState(recommendation?.title || "");
  const [recConditionType, setRecConditionType] = useState(recommendation?.conditionType || "ALWAYS");
  const [recConditionValue, setRecConditionValue] = useState(String(recommendation?.conditionValue || 0));
  const [recJobId, setRecJobId] = useState(String(recommendation?.jobId || ""));

  const showToast = (message: string, type: "success" | "error" | "invoice", link?: string) => {
    setInvoiceLink(link || null);
    setToast({ message, type });
    if (type !== "invoice") {
      setTimeout(() => setToast(null), 5000);
    }
  };

  // --- Worker Handlers ---

  const handleAddWorker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorkerName.trim()) return;

    startTransition(async () => {
      const res = await createWorker(newWorkerName);
      if (res.error) {
        showToast(res.error, "error");
      } else {
        showToast("Worker added successfully!", "success");
        setNewWorkerName("");
      }
    });
  };

  const handleUpdateWorker = async (id: number) => {
    if (!editingWorkerName.trim()) return;

    startTransition(async () => {
      const res = await updateWorker(id, editingWorkerName);
      if (res.error) {
        showToast(res.error, "error");
      } else {
        showToast("Worker renamed successfully!", "success");
        setEditingWorkerId(null);
        setEditingWorkerName("");
      }
    });
  };

  const handleDeleteWorker = async (id: number, name: string) => {
    if (!confirm(`Delete "${name}"? Warning: This will cascade delete all logs associated with this worker.`)) return;

    startTransition(async () => {
      const res = await deleteWorker(id);
      if (res.error) {
        showToast(res.error, "error");
      } else {
        showToast("Worker deleted successfully.", "success");
      }
    });
  };

  // --- Job Handlers ---

  const handleAddJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newJobTitle.trim() || !newJobReward) return;

    const rewardNum = parseFloat(newJobReward);
    if (isNaN(rewardNum) || rewardNum < 0) {
      showToast("Reward must be a positive number", "error");
      return;
    }

    startTransition(async () => {
      const res = await createJob(newJobTitle, rewardNum);
      if (res.error) {
        showToast(res.error, "error");
      } else {
        showToast("Deterministic job created!", "success");
        setNewJobTitle("");
        setNewJobReward("");
      }
    });
  };

  const handleUpdateJob = async (id: number) => {
    if (!editingJobTitle.trim() || !editingJobReward) return;

    const rewardNum = parseFloat(editingJobReward);
    if (isNaN(rewardNum) || rewardNum < 0) {
      showToast("Reward must be a positive number", "error");
      return;
    }

    startTransition(async () => {
      const res = await updateJob(id, editingJobTitle, rewardNum);
      if (res.error) {
        showToast(res.error, "error");
      } else {
        showToast("Job updated successfully!", "success");
        setEditingJobId(null);
        setEditingJobTitle("");
        setEditingJobReward("");
      }
    });
  };

  const handleDeleteJob = async (id: number, title: string) => {
    if (!confirm(`Delete predefined job "${title}"? Warning: This will delete all work logs linked to this job.`)) return;

    startTransition(async () => {
      const res = await deleteJob(id);
      if (res.error) {
        showToast(res.error, "error");
      } else {
        showToast("Job deleted successfully.", "success");
      }
    });
  };

  // --- WorkLog Handlers ---

  const handleDeleteWorkLog = async (id: number) => {
    if (!confirm("Are you sure you want to delete this log entry?")) return;

    startTransition(async () => {
      const res = await deleteWorkLog(id);
      if (res.error) {
        showToast(res.error, "error");
      } else {
        showToast("Log entry deleted.", "success");
      }
    });
  };

  // --- Consolidation Invoicing Handler ---

  const handleGenerateBatchInvoice = async () => {
    const unbilledCount = workLogs.filter((log) => !log.isBilled).length;
    if (unbilledCount === 0) {
      showToast("There are no unbilled work logs to invoice.", "error");
      return;
    }

    if (!confirm(`Create one Fakturoid invoice consolidating all ${unbilledCount} unbilled jobs?`)) {
      return;
    }

    setIsBilling(true);
    setToast(null);

    const res = await createBatchInvoice();
    setIsBilling(false);

    if (res.error) {
      showToast(res.error, "error");
    } else {
      showToast(
        `Invoice #${res.invoiceNumber} containing ${res.itemsCount} items successfully sent to Fakturoid!`,
        "invoice",
        res.invoiceUrl || undefined
      );
    }
  };

  // --- Invoice Status Handler ---

  const handleUpdateInvoiceStatus = async (id: number, newStatus: string) => {
    startTransition(async () => {
      const res = await updateInvoiceStatus(id, newStatus);
      if (res.error) {
        showToast(res.error, "error");
      } else {
        showToast(`Invoice status updated to "${newStatus}"!`, "success");
      }
    });
  };

  const handleDeleteInvoice = async (id: number, number: string) => {
    if (
      !confirm(
        `Opravdu chcete smazat fakturu #${number} z lokálního systému? Odpracované práce spojené s touto fakturou budou opět uvolněny k vyúčtování.`
      )
    ) {
      return;
    }

    startTransition(async () => {
      const res = await deleteInvoice(id);
      if (res.error) {
        showToast(res.error, "error");
      } else {
        showToast("Faktura byla úspěšně smazána z lokálního systému.", "success");
      }
    });
  };

  // --- Recommendation Handler ---

  const handleSaveRecommendation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recTitle.trim()) {
      showToast("Recommendation text is required", "error");
      return;
    }

    const valueNum = parseFloat(recConditionValue);
    if (isNaN(valueNum) || valueNum < 0) {
      showToast("Condition threshold value must be a non-negative number", "error");
      return;
    }

    startTransition(async () => {
      const res = await updateRecommendation({
        title: recTitle,
        conditionType: recConditionType,
        conditionValue: valueNum,
        jobId: null,
      });

      if (res.error) {
        showToast(res.error, "error");
      } else {
        showToast("Recommendation configurations saved successfully!", "success");
      }
    });
  };

  // Calculate stats
  const totalEarned = workLogs.reduce((sum, log) => sum + log.job.reward, 0);
  const totalBilled = workLogs
    .filter((log) => log.isBilled)
    .reduce((sum, log) => sum + log.job.reward, 0);
  const totalUnbilled = totalEarned - totalBilled;
  const unbilledLogsCount = workLogs.filter((log) => !log.isBilled).length;

  return (
    <div className="flex-1 w-full max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
      {/* Toast / Invoicing Notifications */}
      {toast && (
        <div
          className={`fixed bottom-5 right-5 z-50 flex flex-col gap-2 p-5 rounded-2xl border shadow-2xl transition-all duration-300 ${
            toast.type === "success"
              ? "bg-emerald-950/90 text-emerald-200 border-emerald-500/30"
              : toast.type === "invoice"
              ? "bg-indigo-950/90 text-indigo-200 border-indigo-500/40"
              : "bg-rose-950/90 text-rose-200 border-rose-500/30"
          }`}
        >
          <div className="flex items-center gap-3">
            {toast.type === "success" ? (
              <svg className="w-5 h-5 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : toast.type === "invoice" ? (
              <svg className="w-5 h-5 text-indigo-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-rose-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            <span className="text-sm font-semibold">{toast.message}</span>
            <button onClick={() => setToast(null)} className="ml-auto hover:text-white transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          {toast.type === "invoice" && invoiceLink && (
            <a
              href={invoiceLink}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-all shadow-md active:scale-95 text-center"
            >
              Open Invoice in Fakturoid
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          )}
        </div>
      )}

      {/* Header section with Stats and consolidated billing */}
      <header className="mb-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-teal-400 via-indigo-400 to-purple-500 bg-clip-text text-transparent">
            Administrator tools
          </h1>
          <p className="text-zinc-400 mt-1 text-sm sm:text-base">
            Consolidate unbilled jobs into single invoices and manage house directory details.
          </p>
        </div>

        {/* Console action buttons */}
        <div className="flex flex-wrap items-center gap-4">
          <button
            onClick={handleGenerateBatchInvoice}
            disabled={isBilling || unbilledLogsCount === 0}
            className="flex items-center gap-2 px-6 py-3.5 rounded-xl text-sm font-bold bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white shadow-xl shadow-emerald-500/10 hover:shadow-emerald-500/20 active:scale-95 transition-all disabled:opacity-40 disabled:pointer-events-none"
          >
            {isBilling ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Issuing Consolidated Invoice...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Issue Invoice ({unbilledLogsCount} Unbilled Jobs)
              </>
            )}
          </button>
        </div>
      </header>

      {/* Admin overview stats tiles */}
      <section className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-10">
        <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-6 backdrop-blur-sm shadow-xl">
          <div className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-2">Unbilled Work Logs</div>
          <div className="text-3xl font-extrabold text-amber-400">{unbilledLogsCount}</div>
        </div>
        <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-6 backdrop-blur-sm shadow-xl">
          <div className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-2">Unbilled Value</div>
          <div className="text-3xl font-extrabold text-amber-400">
            {totalUnbilled.toLocaleString("cs-CZ")} <span className="text-lg font-medium text-zinc-400">CZK</span>
          </div>
        </div>
        <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-6 backdrop-blur-sm shadow-xl">
          <div className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-2">Total Invoiced rewards</div>
          <div className="text-3xl font-extrabold text-emerald-400">
            {totalBilled.toLocaleString("cs-CZ")} <span className="text-lg font-medium text-zinc-400">CZK</span>
          </div>
        </div>
        <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-6 backdrop-blur-sm shadow-xl">
          <div className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-2">Predefined Jobs</div>
          <div className="text-3xl font-extrabold text-indigo-400">{jobs.length}</div>
        </div>
      </section>

      {/* Navigation tabs for admin functions */}
      <div className="border-b border-zinc-900 mb-8 overflow-x-auto">
        <div className="flex gap-6 min-w-max">
          <button
            onClick={() => setActiveSubTab("logs")}
            className={`pb-4 text-sm font-bold border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
              activeSubTab === "logs"
                ? "border-teal-500 text-teal-400"
                : "border-transparent text-zinc-500 hover:text-zinc-300"
            }`}
          >
            Work Logs History
          </button>
          <button
            onClick={() => setActiveSubTab("invoices")}
            className={`pb-4 text-sm font-bold border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
              activeSubTab === "invoices"
                ? "border-teal-500 text-teal-400"
                : "border-transparent text-zinc-500 hover:text-zinc-300"
            }`}
          >
            Consolidated Invoices ({invoices.length})
          </button>
          <button
            onClick={() => setActiveSubTab("recommendation")}
            className={`pb-4 text-sm font-bold border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
              activeSubTab === "recommendation"
                ? "border-teal-500 text-teal-400"
                : "border-transparent text-zinc-500 hover:text-zinc-300"
            }`}
          >
            Recommendation Settings
          </button>
          <button
            onClick={() => setActiveSubTab("jobs")}
            className={`pb-4 text-sm font-bold border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
              activeSubTab === "jobs"
                ? "border-teal-500 text-teal-400"
                : "border-transparent text-zinc-500 hover:text-zinc-300"
            }`}
          >
            Predefined Jobs ({jobs.length})
          </button>
          <button
            onClick={() => setActiveSubTab("workers")}
            className={`pb-4 text-sm font-bold border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
              activeSubTab === "workers"
                ? "border-teal-500 text-teal-400"
                : "border-transparent text-zinc-500 hover:text-zinc-300"
            }`}
          >
            House Workers ({workers.length})
          </button>
        </div>
      </div>

      {/* Admin Tab Contents */}
      {activeSubTab === "logs" && (
        <div className="bg-zinc-900/30 border border-zinc-800/80 rounded-2xl p-6 backdrop-blur-sm shadow-xl overflow-hidden">
          <h2 className="text-xl font-bold text-white mb-6">Work Logs History</h2>

          {workLogs.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-zinc-800 rounded-xl bg-zinc-950/20">
              <svg className="w-12 h-12 text-zinc-600 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p className="text-zinc-500 font-medium">No work logs recorded in database yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-zinc-800/80 text-zinc-500 text-xs font-bold uppercase tracking-wider">
                    <th className="py-4 px-4">Date</th>
                    <th className="py-4 px-4">Job Title</th>
                    <th className="py-4 px-4">Worker</th>
                    <th className="py-4 px-4 text-right">Reward</th>
                    <th className="py-4 px-4 text-center">Status</th>
                    <th className="py-4 px-4 text-right">Invoice details</th>
                    <th className="py-4 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {workLogs.map((log) => {
                    const formattedDate = new Date(log.date).toLocaleDateString("cs-CZ");

                    return (
                      <tr key={log.id} className="text-sm hover:bg-zinc-800/10 transition-colors">
                        <td className="py-4 px-4 text-zinc-300 font-medium whitespace-nowrap">
                          {formattedDate}
                        </td>
                        <td className="py-4 px-4 text-white font-medium">
                          {log.job.title}
                        </td>
                        <td className="py-4 px-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-zinc-800 text-zinc-300 border border-zinc-700/50">
                            {log.worker.name}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-right text-white font-bold whitespace-nowrap">
                          {log.job.reward.toLocaleString("cs-CZ")} <span className="text-xs text-zinc-500 font-normal">CZK</span>
                        </td>
                        <td className="py-4 px-4 text-center whitespace-nowrap">
                          {log.isBilled ? (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                              </svg>
                              Billed
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              Unbilled
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-4 text-right whitespace-nowrap font-medium text-zinc-400">
                          {log.isBilled && log.invoiceId ? (
                            <span className="text-xs text-zinc-500">
                              Consolidated in <span className="text-teal-400 font-bold">#{log.invoiceId}</span>
                            </span>
                          ) : (
                            <span className="text-xs text-zinc-600 italic">Pending invoice generation</span>
                          )}
                        </td>
                        <td className="py-4 px-4 text-right whitespace-nowrap">
                          <button
                            onClick={() => handleDeleteWorkLog(log.id)}
                            disabled={isPending}
                            className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 bg-rose-500/5 hover:bg-rose-500/10 border border-rose-500/20 hover:border-rose-500/30 active:scale-95 transition-all disabled:opacity-40 cursor-pointer"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeSubTab === "invoices" && (
        <div className="bg-zinc-900/30 border border-zinc-800/80 rounded-2xl p-6 backdrop-blur-sm shadow-xl overflow-hidden animate-fade-in">
          <h2 className="text-xl font-bold text-white mb-6">Consolidated Invoices List</h2>

          {invoices.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-zinc-800 rounded-xl bg-zinc-950/20">
              <svg className="w-12 h-12 text-zinc-600 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-zinc-500 font-medium">No consolidated invoices issued yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-zinc-800/80 text-zinc-500 text-xs font-bold uppercase tracking-wider">
                    <th className="py-4 px-4">Date Issued</th>
                    <th className="py-4 px-4">Invoice #</th>
                    <th className="py-4 px-4 text-right">Consolidated Amount</th>
                    <th className="py-4 px-4 text-center">Status</th>
                    <th className="py-4 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {invoices.map((inv) => {
                    const formattedDate = new Date(inv.issuedAt).toLocaleDateString("cs-CZ");

                    return (
                      <tr key={inv.id} className="text-sm hover:bg-zinc-800/10 transition-colors">
                        <td className="py-4 px-4 text-zinc-300 font-medium whitespace-nowrap">
                          {formattedDate}
                        </td>
                        <td className="py-4 px-4 text-white font-bold">
                          #{inv.invoiceNumber}
                        </td>
                        <td className="py-4 px-4 text-right text-teal-400 font-bold whitespace-nowrap">
                          {inv.amount.toLocaleString("cs-CZ")} <span className="text-xs text-zinc-500 font-normal">CZK</span>
                        </td>
                        <td className="py-4 px-4 text-center whitespace-nowrap">
                          <select
                            value={inv.status}
                            onChange={(e) => handleUpdateInvoiceStatus(inv.id, e.target.value)}
                            disabled={isPending}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold border focus:outline-none transition-colors ${
                              inv.status === "Paid"
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 focus:border-emerald-500"
                                : "bg-amber-500/10 text-amber-400 border-amber-500/30 focus:border-amber-500"
                            }`}
                          >
                            <option value="Unpaid" className="bg-zinc-900 text-white">Unpaid</option>
                            <option value="Paid" className="bg-zinc-900 text-white">Paid</option>
                          </select>
                        </td>
                        <td className="py-4 px-4 text-right whitespace-nowrap flex items-center justify-end gap-3">
                          {inv.fakturoidUrl && (
                            <a
                              href={inv.fakturoidUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors"
                            >
                              View in Fakturoid
                              <svg className="w-3.5 h-3.5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                            </a>
                          )}
                          <button
                            onClick={() => handleDeleteInvoice(inv.id, inv.invoiceNumber)}
                            disabled={isPending}
                            className="inline-flex items-center gap-1 text-xs font-bold text-rose-400 hover:text-rose-300 disabled:opacity-40 transition-colors cursor-pointer bg-rose-500/10 hover:bg-rose-500/20 px-2.5 py-1.5 rounded-lg border border-rose-500/20 hover:border-rose-500/30"
                          >
                            Smazat
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeSubTab === "recommendation" && (
        <div className="bg-zinc-900/30 border border-zinc-800/80 rounded-2xl p-6 backdrop-blur-sm shadow-xl max-w-2xl mx-auto animate-fade-in">
          <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
            <svg className="w-5 h-5 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Job Recommendation Configuration
          </h2>
          <p className="text-zinc-500 text-xs sm:text-sm mb-6">
            Configure what job location or description to recommend next, and set dynamic rules for when to show it on the homepage.
          </p>

          <form onSubmit={handleSaveRecommendation} className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
                Recommendation Description / Location
              </label>
              <input
                type="text"
                placeholder="e.g. Wash the hallway corridor, prune garden bushes"
                value={recTitle}
                onChange={(e) => setRecTitle(e.target.value)}
                className="w-full bg-zinc-950/60 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-teal-500 transition-colors text-sm"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
                  Display Condition
                </label>
                <select
                  value={recConditionType}
                  onChange={(e) => setRecConditionType(e.target.value)}
                  className="w-full bg-zinc-950/60 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-teal-500 transition-colors text-sm"
                  required
                >
                  <option value="DAYS_SINCE_LAST_INVOICE" className="bg-zinc-900 text-white">Show if days since last invoice is at least X</option>
                  <option value="ALWAYS" className="bg-zinc-900 text-white">Always Show</option>
                  <option value="NEVER" className="bg-zinc-900 text-white">Never Show (Disabled)</option>
                </select>
              </div>

              {recConditionType === "DAYS_SINCE_LAST_INVOICE" && (
                <div className="animate-fade-in">
                  <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
                    Condition Threshold (X Days)
                  </label>
                  <input
                    type="number"
                    value={recConditionValue}
                    onChange={(e) => setRecConditionValue(e.target.value)}
                    className="w-full bg-zinc-950/60 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-teal-500 transition-colors text-sm"
                    required
                    min="0"
                    step="1"
                  />
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="w-full bg-gradient-to-r from-teal-500 to-indigo-600 hover:from-teal-400 hover:to-indigo-500 text-white font-semibold py-3.5 px-4 rounded-xl shadow-lg active:scale-95 transition-all text-sm disabled:opacity-50 cursor-pointer"
            >
              {isPending ? "Saving Settings..." : "Save Recommendation Configuration"}
            </button>
          </form>
        </div>
      )}

      {activeSubTab === "jobs" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start animate-fade-in">
          {/* Add Job Form */}
          <div className="bg-zinc-900/30 border border-zinc-800/80 rounded-2xl p-6 backdrop-blur-sm shadow-xl lg:col-span-1">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <svg className="w-5 h-5 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Create Predefined Job
            </h2>
            <form onSubmit={handleAddJob} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
                  Job Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Grass mowing"
                  value={newJobTitle}
                  onChange={(e) => setNewJobTitle(e.target.value)}
                  className="w-full bg-zinc-950/60 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-teal-500 transition-colors text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
                  Predefined Reward (CZK)
                </label>
                <input
                  type="number"
                  placeholder="e.g. 500"
                  value={newJobReward}
                  onChange={(e) => setNewJobReward(e.target.value)}
                  className="w-full bg-zinc-950/60 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-teal-500 transition-colors text-sm"
                  required
                  min="0"
                  step="0.01"
                />
              </div>

              <button
                type="submit"
                disabled={isPending}
                className="w-full bg-gradient-to-r from-teal-500 to-indigo-600 hover:from-teal-400 hover:to-indigo-500 text-white font-semibold py-3 px-4 rounded-xl shadow-lg active:scale-95 transition-all text-sm disabled:opacity-50 cursor-pointer"
              >
                Create Job
              </button>
            </form>
          </div>

          {/* Job Directory List */}
          <div className="bg-zinc-900/30 border border-zinc-800/80 rounded-2xl p-6 backdrop-blur-sm shadow-xl lg:col-span-2">
            <h2 className="text-xl font-bold text-white mb-6">Deterministic Jobs List</h2>

            {jobs.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-zinc-800 rounded-xl bg-zinc-950/20">
                <svg className="w-12 h-12 text-zinc-600 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-zinc-500 font-medium">No predefined jobs registered.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {jobs.map((job) => (
                  <div
                    key={job.id}
                    className="flex items-center justify-between p-4 bg-zinc-950/40 border border-zinc-800/80 rounded-xl hover:border-zinc-700/80 transition-all duration-200"
                  >
                    {editingJobId === job.id ? (
                      <div className="flex flex-col gap-3 w-full">
                        <input
                          type="text"
                          value={editingJobTitle}
                          onChange={(e) => setEditingJobTitle(e.target.value)}
                          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-white text-sm"
                          placeholder="Job Title"
                        />
                        <div className="flex gap-2">
                          <input
                             type="number"
                             value={editingJobReward}
                             onChange={(e) => setEditingJobReward(e.target.value)}
                             className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-white text-sm"
                             placeholder="Reward (CZK)"
                             min="0"
                          />
                          <button
                            onClick={() => handleUpdateJob(job.id)}
                            className="p-2 rounded-lg text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 active:scale-90"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                            </svg>
                          </button>
                          <button
                            onClick={() => {
                              setEditingJobId(null);
                              setEditingJobTitle("");
                              setEditingJobReward("");
                            }}
                            className="p-2 rounded-lg text-zinc-400 bg-zinc-800 border border-zinc-700 active:scale-90"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 text-indigo-400 font-bold text-sm">
                            Kč
                          </div>
                          <div>
                            <div className="text-white font-semibold text-sm leading-tight">{job.title}</div>
                            <div className="text-zinc-500 text-xs mt-1 font-bold">
                              {job.reward.toLocaleString("cs-CZ")} CZK
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setEditingJobId(job.id);
                              setEditingJobTitle(job.title);
                              setEditingJobReward(String(job.reward));
                            }}
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-300 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 active:scale-95 transition-all cursor-pointer"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </button>

                          <button
                            onClick={() => handleDeleteJob(job.id, job.title)}
                            disabled={isPending}
                            className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 bg-rose-500/5 hover:bg-rose-500/10 border border-rose-500/20 hover:border-rose-500/30 active:scale-95 transition-all disabled:opacity-40 cursor-pointer"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeSubTab === "workers" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start animate-fade-in">
          {/* Add Worker Form */}
          <div className="bg-zinc-900/30 border border-zinc-800/80 rounded-2xl p-6 backdrop-blur-sm shadow-xl lg:col-span-1">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <svg className="w-5 h-5 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Add New Worker
            </h2>
            <form onSubmit={handleAddWorker} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. John Doe (Plumber)"
                  value={newWorkerName}
                  onChange={(e) => setNewWorkerName(e.target.value)}
                  className="w-full bg-zinc-950/60 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-teal-500 transition-colors text-sm"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isPending}
                className="w-full bg-gradient-to-r from-teal-500 to-indigo-600 hover:from-teal-400 hover:to-indigo-500 text-white font-semibold py-3 px-4 rounded-xl shadow-lg active:scale-95 transition-all text-sm disabled:opacity-50 cursor-pointer"
              >
                Add Worker
              </button>
            </form>
          </div>

          {/* Worker Directory List */}
          <div className="bg-zinc-900/30 border border-zinc-800/80 rounded-2xl p-6 backdrop-blur-sm shadow-xl lg:col-span-2">
            <h2 className="text-xl font-bold text-white mb-6">Workers Directory</h2>

            {workers.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-zinc-800 rounded-xl bg-zinc-950/20">
                <svg className="w-12 h-12 text-zinc-600 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <p className="text-zinc-500 font-medium">No workers registered in database.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {workers.map((worker) => (
                  <div
                    key={worker.id}
                    className="flex items-center justify-between p-4 bg-zinc-950/40 border border-zinc-800/80 rounded-xl hover:border-zinc-700/80 transition-all duration-200"
                  >
                    {editingWorkerId === worker.id ? (
                       <div className="flex items-center gap-2 w-full">
                         <input
                           type="text"
                           value={editingWorkerName}
                           onChange={(e) => setEditingWorkerName(e.target.value)}
                           className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-white text-sm focus:outline-none focus:border-teal-500"
                         />
                         <button
                           onClick={() => handleUpdateWorker(worker.id)}
                           className="p-1.5 rounded-lg text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 active:scale-90"
                         >
                           <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                           </svg>
                         </button>
                         <button
                           onClick={() => {
                             setEditingWorkerId(null);
                             setEditingWorkerName("");
                           }}
                           className="p-1.5 rounded-lg text-zinc-400 bg-zinc-800 border border-zinc-700 active:scale-90"
                         >
                           <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                           </svg>
                         </button>
                       </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-teal-500/10 flex items-center justify-center border border-teal-500/20 text-teal-400 font-bold text-sm">
                            {worker.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="text-white font-semibold text-sm leading-tight">{worker.name}</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setEditingWorkerId(worker.id);
                              setEditingWorkerName(worker.name);
                            }}
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-300 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 hover:border-zinc-600 active:scale-95 transition-all cursor-pointer"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </button>

                          <button
                            onClick={() => handleDeleteWorker(worker.id, worker.name)}
                            disabled={isPending}
                            className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 bg-rose-500/5 hover:bg-rose-500/10 border border-rose-500/20 hover:border-rose-500/30 active:scale-95 transition-all disabled:opacity-40 cursor-pointer"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
