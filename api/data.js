import { getCardHistory } from "./_lib/db.js";

export default async function handler(req, res) {
  try {
    const { card } = req.query;
    if (!card) return res.status(400).json({ error: "Missing card" });

    const results = await getCardHistory(String(card));
    return res.status(200).json(results);
  } catch (error) {
    console.error("API error:", error);
    return res.status(500).json({ error: "Could not load card data." });
  }
}
