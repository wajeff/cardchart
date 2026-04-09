import nodemailer from "nodemailer";

import { getAlertSubscriberModel } from "./db.js";

function formatCardName(cardKey) {
  return String(cardKey)
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatCurrency(amount) {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function buildTextEmail(changes) {
  const lines = [
    "Card Chart detected new promotion data.",
    "",
  ];

  changes.forEach((change) => {
    lines.push(
      `${formatCardName(change.card)}`,
      `- Points: ${Number(change.totalPoints).toLocaleString("en-US")}`,
      `- Spend Required: ${formatCurrency(change.totalSpendRequired)}`,
      `- Duration: ${change.promotionDurationMonths} months`,
      `- Membership Fee: ${formatCurrency(change.totalMembershipFee)}`,
      "",
    );
  });

  lines.push("Open Card Chart to review the latest history.");
  return lines.join("\n");
}

function buildHtmlEmail(changes) {
  const cardsMarkup = changes
    .map(
      (change) => `
        <div style="margin-bottom:20px;padding-bottom:20px;border-bottom:1px solid #e5e7eb;">
          <h2 style="margin:0 0 10px;font-size:18px;">${formatCardName(change.card)}</h2>
          <p style="margin:4px 0;">Points: <strong>${Number(change.totalPoints).toLocaleString("en-US")}</strong></p>
          <p style="margin:4px 0;">Spend Required: <strong>${formatCurrency(change.totalSpendRequired)}</strong></p>
          <p style="margin:4px 0;">Duration: <strong>${change.promotionDurationMonths} months</strong></p>
          <p style="margin:4px 0;">Membership Fee: <strong>${formatCurrency(change.totalMembershipFee)}</strong></p>
        </div>
      `,
    )
    .join("");

  return `
    <div style="font-family:Inter,Arial,sans-serif;color:#111827;line-height:1.5;">
      <h1 style="font-size:22px;margin-bottom:16px;">Card Chart promotion alert</h1>
      <p style="margin-bottom:20px;">New promotion data was detected for the following cards:</p>
      ${cardsMarkup}
      <p style="margin-top:24px;">Open Card Chart to review the updated history.</p>
    </div>
  `;
}

function getTransportConfig() {
  const port = Number(process.env.SMTP_PORT || 587);

  return {
    host: process.env.SMTP_HOST,
    port,
    secure: process.env.SMTP_SECURE
      ? process.env.SMTP_SECURE === "true"
      : port === 465,
    auth:
      process.env.SMTP_USER && process.env.SMTP_PASS
        ? {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          }
        : undefined,
  };
}

function hasEmailConfig() {
  return (
    process.env.SMTP_HOST &&
    process.env.SMTP_PORT &&
    process.env.SMTP_FROM_EMAIL
  );
}

export async function sendPromotionAlertEmails(changes) {
  if (!changes.length) {
    return { sent: false, reason: "no_changes" };
  }

  if (!hasEmailConfig()) {
    console.warn("Alert emails skipped: SMTP env vars are not configured.");
    return { sent: false, reason: "missing_email_config" };
  }

  const AlertSubscriber = getAlertSubscriberModel();
  const subscribers = await AlertSubscriber.find({ isActive: true }).lean();
  const recipients = subscribers.map((subscriber) => subscriber.email).filter(Boolean);

  if (!recipients.length) {
    return { sent: false, reason: "no_subscribers" };
  }

  const transport = nodemailer.createTransport(getTransportConfig());
  const subject =
    changes.length === 1
      ? `Card Chart alert: ${formatCardName(changes[0].card)} updated`
      : `Card Chart alert: ${changes.length} cards updated`;

  await transport.sendMail({
    from: process.env.SMTP_FROM_EMAIL,
    to: process.env.ALERTS_TO_EMAIL || process.env.SMTP_FROM_EMAIL,
    bcc: recipients,
    subject,
    text: buildTextEmail(changes),
    html: buildHtmlEmail(changes),
  });

  return {
    sent: true,
    recipientCount: recipients.length,
  };
}
