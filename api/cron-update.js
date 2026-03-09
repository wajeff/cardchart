// Vercel Serverless Function - Runs daily at 12AM

import { GoogleGenAI } from "@google/genai";
import mongoose from "mongoose";
import { scrapeCards } from "../scripts/scrape.ts";

// MongoDB Schema
const DataSchema = new mongoose.Schema({
  card: String,
  date: Number,
  data: Array,
});

let DataModel;
let isConnected = false;

const EXTRACTION_PROMPT = `
Extract the following promotional information:
- totalPoints: Total bonus points offered in the promotion
- totalSpendRequired: Total spending required to earn all bonus points
- monthlySpendRequired: Monthly spending required to earn monthly bonus
- promotionDurationMonths: How many months the promotion lasts
- totalMembershipFee: Annual membership fee (IMPORTANT: Use exact amount with decimals, NOT 15588)

Important parsing guidance:
- Use all captured fields provided, including capturedTexts, capturedLists, capturedData, and any capturedAttributes.
- Fee aliases can appear as labels like "Annual Fee", "Membership Fee", "Annual Membership Fee".
- Parse currency formats safely (e.g. "$799", "799", "$12.99/mo").
- For promotionDurationMonths, use the total campaign duration to earn all bonuses.
- Do NOT use spend-window phrases like "spend in first 3 months" as promotion duration.
- If there are staged bonuses (for example "between 15 and 17 months of Cardmembership"), use the final month (17).

Calculation rules:
- Return totalMembershipFee as the raw annual fee from the offer text (do not pre-scale it).
- Add totalMembershipFee to totalSpendRequired:
  totalSpendRequired = totalSpendRequired + totalMembershipFee

Extract accurate values from the text. If a field is not mentioned, use 0.
`.trim();

// Connect to MongoDB
async function connectDB() {
  if (isConnected) {
    return;
  }

  await mongoose.connect(process.env.MONGO_URI);
  DataModel = mongoose.models.Data || mongoose.model("Data", DataSchema);
  isConnected = true;
}
const GEMINI_API_KEY = process.env.VITE_GEMINI_API_KEY;
const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

async function geminiParse(promotion) {
  const offersObject = Object.fromEntries(promotion);

  const geminiResponse = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: `Input JSON:
    ${JSON.stringify(offersObject)}

Return ONLY a JSON object where each key is the same card key from Input JSON.
Each key must map to an object with:
- totalPoints (integer)
- totalSpendRequired (integer)
- promotionDurationMonths (integer)
- totalMembershipFee (number)
- dataGatheredAt (integer unix milliseconds)

Please extract the following promotional information:
- totalPoints: Total bonus points offered in the promotion
- promotionDurationMonths: How many months the promotion lasts
- totalMembershipFee: Annual membership fee (IMPORTANT: Use exact amount with decimals, NOT 15588). Please note that if the
promotional length is >12, totalMembershipFee should be multiplied by the number of yearly fees user has to pay. i.e. promotional length is 17 months,
membershipfee total cost is multiplied by two.
- totalSpendRequired: Total spending required to earn all bonus points. Look for text similiar to : 'earn x points when you spend $x
' and its conditions. Once done, sum totalMembershipFee

Extract accurate values from the text. If a field is not mentioned, use 0.`,


    config: {
      responseMimeType: "application/json",
      responseJsonSchema: {
        type: "object",
        additionalProperties: {
          type: "object",
          properties: {
            totalPoints: { type: "integer" },
            totalSpendRequired: { type: "integer" },
            promotionDurationMonths: { type: "integer" },
            totalMembershipFee: { type: "number" },
            dataGatheredAt: { type: "integer" },
          },
          required: [
            "totalPoints",
            "totalSpendRequired",
            "promotionDurationMonths",
            "totalMembershipFee",
            "dataGatheredAt",
          ],
          additionalProperties: false,
        },
      },
    },
  });

  console.log(geminiResponse.text);
  const parsed = JSON.parse(geminiResponse.text);
  return parsed;
}

export default async function handler(req, res) {
  await connectDB();
  const offersMap = await scrapeCards();
  console.log(offersMap);

  const parsedObject = await geminiParse(offersMap);
  console.log(parsedObject)
  if (!parsedObject || typeof parsedObject !== "object") throw new Error("geminiParse returned invalid object");

  const parsedMap = new Map(Object.entries(parsedObject));
  console.log(parsedMap)

  for (const [key, value] of parsedMap) {
    const newData = value;
    const latest =
      (await DataModel.findOne({ card: key }).sort({ date: -1 })) || undefined;
    const latestData = latest?.data?.[0];
    const isSame =
      latestData &&
      newData &&
      latestData.totalPoints === newData.totalPoints &&
      latestData.totalSpendRequired === newData.totalSpendRequired &&
      latestData.promotionDurationMonths === newData.promotionDurationMonths &&
      latestData.totalMembershipFee === newData.totalMembershipFee;

    if (!isSame) {
      const doc = DataModel({
        card: key,
        date: Date.now(),
        data: [newData],
      });
      await doc.save();
    }
  }

  return res.status(200).json({ ok: true });
}
