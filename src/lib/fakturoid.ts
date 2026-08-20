/**
 * Fakturoid API v3 Integration Service
 * strictly executes server-side to protect secrets
 */

interface InvoiceLine {
  name: string;
  quantity: number;
  unit_price: number;
  vat_rate: number;
}

interface CreateInvoicePayload {
  subject_id: number;
  lines: InvoiceLine[];
  payment_method?: string;
  currency?: string;
}

export interface BatchInvoiceItem {
  title: string;
  reward: number;
  workerName: string;
  date: Date;
}

/**
 * Fetches the OAuth 2.0 Access Token using Client Credentials Flow
 */
async function getAccessToken(): Promise<string> {
  const clientId = process.env.FAKTUROID_CLIENT_ID || process.env.FAKTUROID_EMAIL;
  const clientSecret = process.env.FAKTUROID_CLIENT_SECRET || process.env.FAKTUROID_API_KEY;
  const userAgent = process.env.FAKTUROID_USER_AGENT || "SVJ Invoice Manager (contact@example.com)";

  if (!clientId || !clientSecret) {
    throw new Error(
      "Missing Fakturoid credentials in environment variables (FAKTUROID_CLIENT_ID/EMAIL or FAKTUROID_CLIENT_SECRET/API_KEY)"
    );
  }

  const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const response = await fetch("https://app.fakturoid.cz/api/v3/oauth/token", {
    method: "POST",
    headers: {
      "User-Agent": userAgent,
      "Content-Type": "application/json",
      "Accept": "application/json",
      "Authorization": `Basic ${authHeader}`,
    },
    body: JSON.stringify({ grant_type: "client_credentials" }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Fakturoid OAuth error status:", response.status, errorText);
    throw new Error(`Fakturoid authentication failed (status ${response.status}): ${errorText}`);
  }

  const data = await response.json();
  if (!data.access_token) {
    throw new Error("No access_token returned by Fakturoid OAuth endpoint");
  }

  return data.access_token;
}

/**
 * Creates a batch invoice in Fakturoid containing all provided unbilled jobs as lines
 */
export async function issueFakturoidBatchInvoice(items: BatchInvoiceItem[]) {
  const accountSlug = process.env.FAKTUROID_SLUG;
  const userAgent = process.env.FAKTUROID_USER_AGENT || "SVJ Invoice Manager (contact@example.com)";
  const subjectIdStr = process.env.FAKTUROID_SUBJECT_ID;

  if (!accountSlug) {
    return { error: "Missing Fakturoid account slug (FAKTUROID_SLUG) in environment variables" };
  }

  if (!subjectIdStr || isNaN(parseInt(subjectIdStr, 10))) {
    return { error: "Missing or invalid Fakturoid client subject ID (FAKTUROID_SUBJECT_ID) in environment variables" };
  }

  const subjectId = parseInt(subjectIdStr, 10);

  if (items.length === 0) {
    return { error: "No items provided for the batch invoice" };
  }

  try {
    // 1. Get auth token
    const token = await getAccessToken();

    // 2. Format lines
    const lines: InvoiceLine[] = items.map((item) => {
      const formattedDate = new Date(item.date).toLocaleDateString("cs-CZ");
      return {
        name: `${item.title} (${item.workerName}) - ${formattedDate}`,
        quantity: 1,
        unit_price: item.reward,
        vat_rate: 0, // default to 0% VAT for simple local repairs/SVJ housing works
      };
    });

    const payload: CreateInvoicePayload = {
      subject_id: subjectId,
      payment_method: "bank",
      currency: "CZK",
      lines,
    };

    console.log(`Sending Fakturoid invoice request to: https://app.fakturoid.cz/api/v3/accounts/${accountSlug}/invoices.json`);
    console.log("Fakturoid payload:", JSON.stringify(payload));

    const response = await fetch(
      `https://app.fakturoid.cz/api/v3/accounts/${accountSlug}/invoices.json`,
      {
        method: "POST",
        headers: {
          "User-Agent": userAgent,
          "Content-Type": "application/json",
          "Accept": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `Fakturoid Invoice creation failed (Status ${response.status}). URL: https://app.fakturoid.cz/api/v3/accounts/${accountSlug}/invoices.json`,
        errorText
      );
      return {
        error: `Fakturoid Invoice endpoint returned status ${response.status}: ${errorText}`,
      };
    }

    const invoiceData = await response.json();
    return {
      success: true,
      invoiceId: String(invoiceData.id),
      invoiceUrl: invoiceData.html_url,
      invoiceNumber: invoiceData.number,
    };
  } catch (error: any) {
    console.error("Fakturoid integration exception:", error);
    return { error: error.message || "An unexpected error occurred during invoicing" };
  }
}
