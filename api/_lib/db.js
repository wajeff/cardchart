import { neon } from "@neondatabase/serverless";

// Neon's HTTP driver: no persistent connection, so it works well in
// Vercel serverless functions (no pool exhaustion, no cold-connect cost).
let sqlClient;

export function getSql() {
  if (!sqlClient) {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error("DATABASE_URL is not configured");
    }
    sqlClient = neon(url);
  }
  return sqlClient;
}

// Returns every promotion row for a card, oldest first, in the same shape the
// client already expects from the old Mongo API: { card, date, data: [...] }.
export async function getCardHistory(card) {
  const sql = getSql();
  const rows = await sql`
    SELECT
      id,
      card,
      floor(extract(epoch FROM scraped_at) * 1000)::float8 AS date,
      total_points              AS "totalPoints",
      total_spend_required      AS "totalSpendRequired",
      promotion_duration_months AS "promotionDurationMonths",
      total_membership_fee::float8 AS "totalMembershipFee"
    FROM promotions
    WHERE card = ${card}
    ORDER BY scraped_at ASC, id ASC
  `;

  return rows.map(({ id, card: cardKey, date, ...data }) => ({
    _id: String(id),
    card: cardKey,
    date,
    data: [data],
  }));
}

export async function getLatestPromotion(card) {
  const sql = getSql();
  const rows = await sql`
    SELECT
      total_points              AS "totalPoints",
      total_spend_required      AS "totalSpendRequired",
      promotion_duration_months AS "promotionDurationMonths",
      total_membership_fee::float8 AS "totalMembershipFee"
    FROM promotions
    WHERE card = ${card}
    ORDER BY scraped_at DESC, id DESC
    LIMIT 1
  `;
  return rows[0];
}

export async function insertPromotion(card, promo) {
  const sql = getSql();
  await sql`
    INSERT INTO promotions (
      card, total_points, total_spend_required,
      promotion_duration_months, total_membership_fee
    ) VALUES (
      ${card}, ${promo.totalPoints}, ${promo.totalSpendRequired},
      ${promo.promotionDurationMonths}, ${promo.totalMembershipFee}
    )
  `;
}

export async function upsertAlertSubscriber(email) {
  const sql = getSql();
  await sql`
    INSERT INTO alert_subscribers (email, is_active)
    VALUES (${email}, TRUE)
    ON CONFLICT (email)
    DO UPDATE SET is_active = TRUE, updated_at = now()
  `;
}

export async function getActiveSubscriberEmails() {
  const sql = getSql();
  const rows = await sql`
    SELECT email FROM alert_subscribers WHERE is_active = TRUE
  `;
  return rows.map((row) => row.email);
}
