import type { Order } from "@workspace/db";
import { logger } from "./logger";

const STORE_NAME = "Authentic Shayo Lockerr";

/**
 * Customer-facing copy for each fulfillment status. Returning null means we do
 * not notify for that status (e.g. the initial "processing" before payment).
 */
function statusCopy(
  status: string,
): { subject: string; heading: string; body: string } | null {
  switch (status) {
    case "confirmed":
      return {
        subject: "Your order is confirmed",
        heading: "Order confirmed 🎉",
        body: "We've received your order and it's now confirmed. We'll begin preparing it for delivery.",
      };
    case "shipped":
      return {
        subject: "Your order is on the way",
        heading: "Out for delivery 🚚",
        body: "Good news — your order has been dispatched and is on its way to you.",
      };
    case "delivered":
      return {
        subject: "Your order has been delivered",
        heading: "Delivered ✅",
        body: "Your order has been delivered. We hope you enjoy it — thank you for shopping with us!",
      };
    case "cancelled":
      return {
        subject: "Your order has been cancelled",
        heading: "Order cancelled",
        body: "Your order has been cancelled. If this is unexpected or you need help, simply reply to this message.",
      };
    case "processing":
      return {
        subject: "We've received your order",
        heading: "Order received",
        body: "Your order has been received and is being processed.",
      };
    default:
      return null;
  }
}

function formatNaira(kobo: number): string {
  return "₦" + Math.round(kobo / 100).toLocaleString("en-NG");
}

function orderSummaryLines(order: Order): string[] {
  return order.items.map(
    (it) =>
      `${it.quantity} × ${it.drinkName} (${it.sizeLabel}) — ${formatNaira(
        it.sizePrice * 100 * it.quantity,
      )}`,
  );
}

/**
 * Normalize a Nigerian phone number to E.164 (+234…) for WhatsApp.
 * Accepts local "0803…", "803…", "234803…", or already-"+234…" forms.
 * Returns null if it can't produce a plausible number.
 */
export function toE164Nigeria(raw: string): string | null {
  const digits = (raw ?? "").replace(/[^\d+]/g, "");
  if (!digits) return null;
  let n = digits.replace(/^\+/, "");
  if (n.startsWith("234")) {
    // already country-coded
  } else if (n.startsWith("0")) {
    n = "234" + n.slice(1);
  } else if (n.length === 10) {
    n = "234" + n;
  } else {
    return null;
  }
  if (n.length < 12 || n.length > 15) return null;
  return "+" + n;
}

function buildEmailHtml(order: Order, copy: NonNullable<ReturnType<typeof statusCopy>>): string {
  const items = orderSummaryLines(order)
    .map((l) => `<li style="margin:4px 0;">${l}</li>`)
    .join("");
  return `
  <div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:560px;margin:0 auto;color:#1a1a1a;">
    <div style="background:#0d0b08;padding:24px;text-align:center;">
      <span style="color:#d4a843;font-size:20px;font-weight:800;letter-spacing:1px;">${STORE_NAME}</span>
    </div>
    <div style="padding:24px;">
      <h1 style="font-size:22px;margin:0 0 12px;">${copy.heading}</h1>
      <p style="font-size:15px;line-height:1.5;color:#444;">Hi ${order.customerName || "there"},</p>
      <p style="font-size:15px;line-height:1.5;color:#444;">${copy.body}</p>
      <div style="background:#fdf8f0;border:1px solid #eadfc6;border-radius:12px;padding:16px;margin:20px 0;">
        <p style="margin:0 0 8px;font-weight:700;">Order ${order.reference}</p>
        <ul style="padding-left:18px;margin:0;font-size:14px;color:#444;">${items}</ul>
        <p style="margin:12px 0 0;font-weight:700;">Total: ${formatNaira(order.totalKobo)}</p>
      </div>
      <p style="font-size:13px;color:#888;">Delivery to: ${order.deliveryAddress}${
        order.deliveryCity ? ", " + order.deliveryCity : ""
      }${order.deliveryState ? ", " + order.deliveryState : ""}</p>
    </div>
    <div style="padding:16px 24px;border-top:1px solid #eee;text-align:center;font-size:12px;color:#aaa;">
      ${STORE_NAME} • Premium spirits, delivered.
    </div>
  </div>`;
}

function buildWhatsAppText(order: Order, copy: NonNullable<ReturnType<typeof statusCopy>>): string {
  const items = orderSummaryLines(order).join("\n");
  return [
    `*${STORE_NAME}*`,
    "",
    `${copy.heading}`,
    "",
    `Hi ${order.customerName || "there"},`,
    copy.body,
    "",
    `*Order ${order.reference}*`,
    items,
    `Total: ${formatNaira(order.totalKobo)}`,
  ].join("\n");
}

/**
 * Send an email via Resend. No-ops (logs) until the Resend integration is wired.
 */
async function sendEmail(
  _to: string,
  _subject: string,
  _html: string,
): Promise<void> {
  // Wired once the Resend integration is connected.
  logger.info({ to: _to, subject: _subject }, "[notify] email send skipped — Resend not configured yet");
}

/**
 * Send a WhatsApp message via Meta WhatsApp Business Cloud API.
 * No-ops (logs) until the WhatsApp integration is wired.
 */
async function sendWhatsApp(_toE164: string, _text: string): Promise<void> {
  // Wired once the Meta WhatsApp Business integration is connected.
  logger.info({ to: _toE164 }, "[notify] whatsapp send skipped — WhatsApp not configured yet");
}

/**
 * Fire-and-forget customer notification for an order status change.
 * Never throws — each channel is isolated so one failure can't block the other
 * or the request that triggered it.
 */
export function notifyOrderStatus(order: Order, status: string): void {
  const copy = statusCopy(status);
  if (!copy) return;

  void (async () => {
    if (order.customerEmail) {
      try {
        await sendEmail(order.customerEmail, copy.subject, buildEmailHtml(order, copy));
      } catch (err) {
        logger.error({ err, orderId: order.id }, "[notify] email failed");
      }
    }
    const phone = toE164Nigeria(order.customerPhone);
    if (phone) {
      try {
        await sendWhatsApp(phone, buildWhatsAppText(order, copy));
      } catch (err) {
        logger.error({ err, orderId: order.id }, "[notify] whatsapp failed");
      }
    } else if (order.customerPhone) {
      logger.warn(
        { orderId: order.id },
        "[notify] could not normalize customer phone for WhatsApp",
      );
    }
  })();
}
