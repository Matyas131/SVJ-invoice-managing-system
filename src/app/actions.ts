"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { issueFakturoidBatchInvoice } from "@/lib/fakturoid";
import { cookies } from "next/headers";
import { hashPassword } from "@/lib/auth";

// ==========================================
// WORKER ACTIONS
// ==========================================

export async function getWorkers() {
  try {
    return await prisma.worker.findMany({
      orderBy: { name: "asc" },
    });
  } catch (error) {
    console.error("Error fetching workers:", error);
    throw new Error("Failed to fetch workers");
  }
}

export async function createWorker(name: string) {
  const trimmedName = name?.trim();
  if (!trimmedName) {
    return { error: "Worker name is required" };
  }

  try {
    const worker = await prisma.worker.create({
      data: { name: trimmedName },
    });
    revalidatePath("/");
    return { success: true, worker };
  } catch (error: any) {
    console.error("Error creating worker:", error);
    if (error.code === "P2002") {
      return { error: "A worker with this name already exists" };
    }
    return { error: "Failed to create worker" };
  }
}

export async function updateWorker(id: number, name: string) {
  const trimmedName = name?.trim();
  if (!trimmedName) {
    return { error: "Worker name is required" };
  }

  try {
    const worker = await prisma.worker.update({
      where: { id },
      data: { name: trimmedName },
    });
    revalidatePath("/");
    return { success: true, worker };
  } catch (error: any) {
    console.error("Error updating worker:", error);
    if (error.code === "P2002") {
      return { error: "A worker with this name already exists" };
    }
    return { error: "Failed to update worker" };
  }
}

export async function deleteWorker(id: number) {
  try {
    await prisma.worker.delete({
      where: { id },
    });
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Error deleting worker:", error);
    return { error: "Failed to delete worker" };
  }
}

// ==========================================
// JOB ACTIONS (Predefined deterministic jobs)
// ==========================================

export async function getJobs() {
  try {
    return await prisma.job.findMany({
      orderBy: { title: "asc" },
    });
  } catch (error) {
    console.error("Error fetching jobs:", error);
    throw new Error("Failed to fetch jobs");
  }
}

export async function createJob(title: string, reward: number) {
  const trimmedTitle = title?.trim();
  if (!trimmedTitle) {
    return { error: "Job title is required" };
  }
  if (reward === undefined || isNaN(reward) || reward < 0) {
    return { error: "Financial reward must be a non-negative number" };
  }

  try {
    const job = await prisma.job.create({
      data: {
        title: trimmedTitle,
        reward,
      },
    });
    revalidatePath("/");
    return { success: true, job };
  } catch (error: any) {
    console.error("Error creating job:", error);
    if (error.code === "P2002") {
      return { error: "A job with this title already exists" };
    }
    return { error: "Failed to create job" };
  }
}

export async function updateJob(id: number, title: string, reward: number) {
  const trimmedTitle = title?.trim();
  if (!trimmedTitle) {
    return { error: "Job title is required" };
  }
  if (reward === undefined || isNaN(reward) || reward < 0) {
    return { error: "Financial reward must be a non-negative number" };
  }

  try {
    const job = await prisma.job.update({
      where: { id },
      data: {
        title: trimmedTitle,
        reward,
      },
    });
    revalidatePath("/");
    return { success: true, job };
  } catch (error: any) {
    console.error("Error updating job:", error);
    if (error.code === "P2002") {
      return { error: "A job with this title already exists" };
    }
    return { error: "Failed to update job" };
  }
}

export async function deleteJob(id: number) {
  try {
    await prisma.job.delete({
      where: { id },
    });
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Error deleting job:", error);
    return { error: "Failed to delete job" };
  }
}

// ==========================================
// WORKLOG ACTIONS
// ==========================================

export async function getWorkLogs() {
  try {
    return await prisma.workLog.findMany({
      include: {
        worker: true,
        job: true,
      },
      orderBy: {
        date: "desc",
      },
    });
  } catch (error) {
    console.error("Error fetching work logs:", error);
    throw new Error("Failed to fetch work logs");
  }
}

export interface WorkLogInput {
  workerId: number;
  jobId: number;
  date: string; // ISO string
}

export async function createWorkLog(data: WorkLogInput) {
  if (!data.workerId) {
    return { error: "Worker is required" };
  }
  if (!data.jobId) {
    return { error: "Job type selection is required" };
  }
  if (!data.date || isNaN(Date.parse(data.date))) {
    return { error: "A valid date is required" };
  }

  try {
    const workLog = await prisma.workLog.create({
      data: {
        workerId: data.workerId,
        jobId: data.jobId,
        date: new Date(data.date),
      },
    });
    revalidatePath("/");
    return { success: true, workLog };
  } catch (error) {
    console.error("Error creating work log:", error);
    return { error: "Failed to log work" };
  }
}

export async function deleteWorkLog(id: number) {
  try {
    await prisma.workLog.delete({
      where: { id },
    });
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Error deleting work log:", error);
    return { error: "Failed to delete work log" };
  }
}

// ==========================================
// BATCH INVOICING ACTIONS (Server-Side)
// ==========================================

export async function createBatchInvoice() {
  try {
    // 1. Fetch all unbilled work logs
    const unbilledLogs = await prisma.workLog.findMany({
      where: { isBilled: false },
      include: {
        worker: true,
        job: true,
      },
      orderBy: { date: "asc" },
    });

    if (unbilledLogs.length === 0) {
      return { error: "No unbilled work logs available to invoice." };
    }

    // 2. Map DB logs to Fakturoid BatchInvoice items
    const invoiceItems = unbilledLogs.map((log) => ({
      title: log.job.title,
      reward: log.job.reward,
      workerName: log.worker.name,
      date: log.date,
    }));

    // 3. Issue the single consolidated invoice on Fakturoid
    const result = await issueFakturoidBatchInvoice(invoiceItems);

    if (result.error) {
      return { error: result.error };
    }

    const invoiceNumber = result.invoiceNumber || result.invoiceId;

    // 4. Mark all these logs as billed in DB, recording the invoice ID
    await prisma.workLog.updateMany({
      where: {
        id: { in: unbilledLogs.map((log) => log.id) },
      },
      data: {
        isBilled: true,
        invoiceId: invoiceNumber,
      },
    });

    revalidatePath("/");
    return {
      success: true,
      invoiceUrl: result.invoiceUrl,
      invoiceNumber: invoiceNumber,
      itemsCount: unbilledLogs.length,
    };
  } catch (error: any) {
    console.error("Error in createBatchInvoice:", error);
    return { error: error.message || "An unexpected error occurred during batch invoicing" };
  }
}

// ==========================================
// SECURITY / ADMIN ACTIONS
// ==========================================

export async function loginAdmin(password: string) {
  const adminPassword = process.env.ADMIN_PASSWORD || "super-secret-password";

  if (password === adminPassword) {
    const cookiesList = await cookies();
    const hash = await hashPassword(adminPassword);
    cookiesList.set("svj_admin_session", hash, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: "/",
    });
    return { success: true };
  }

  return { error: "Invalid password" };
}

export async function logoutAdmin() {
  const cookiesList = await cookies();
  cookiesList.delete("svj_admin_session");
  revalidatePath("/");
}
