import { logger } from "./logger";

const PAYSTACK_BASE = "https://api.paystack.co";

function getSecretKey(): string {
  const key = process.env["PAYSTACK_SECRET_KEY"];
  if (!key) {
    throw new Error("PAYSTACK_SECRET_KEY is not configured");
  }
  return key;
}

interface PaystackInitializeResponse {
  status: boolean;
  message: string;
  data: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
}

interface PaystackVerifyResponse {
  status: boolean;
  message: string;
  data: {
    id: number;
    status: string;
    reference: string;
    amount: number;
    currency: string;
    channel: string | null;
    paid_at: string | null;
    gateway_response: string | null;
    customer: { email: string };
    [key: string]: unknown;
  };
}

export async function paystackInitialize(params: {
  email: string;
  amountKobo: number;
  reference: string;
  callbackUrl?: string;
  metadata?: Record<string, unknown>;
}): Promise<PaystackInitializeResponse["data"]> {
  const res = await fetch(`${PAYSTACK_BASE}/transaction/initialize`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getSecretKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: params.email,
      amount: params.amountKobo,
      reference: params.reference,
      callback_url: params.callbackUrl,
      currency: "NGN",
      metadata: params.metadata,
    }),
  });

  const json = (await res.json()) as PaystackInitializeResponse;
  if (!res.ok || !json.status) {
    logger.error({ status: res.status, json }, "Paystack initialize failed");
    throw new Error(json.message || "Paystack initialize failed");
  }
  return json.data;
}

export async function paystackVerify(
  reference: string,
): Promise<PaystackVerifyResponse["data"]> {
  const res = await fetch(
    `${PAYSTACK_BASE}/transaction/verify/${encodeURIComponent(reference)}`,
    {
      headers: { Authorization: `Bearer ${getSecretKey()}` },
    },
  );
  const json = (await res.json()) as PaystackVerifyResponse;
  if (!res.ok || !json.status) {
    logger.error({ status: res.status, json }, "Paystack verify failed");
    throw new Error(json.message || "Paystack verify failed");
  }
  return json.data;
}
