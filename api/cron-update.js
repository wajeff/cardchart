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

let isConnected = false;

const EXTRACTION_PROMPT = `
Return ONLY a JSON object where each key is the same card key from Input JSON.
Each key must map to an object with:
- totalPoints (integer)
- totalSpendRequired (integer)
- promotionDurationMonths (integer)
- totalMembershipFee (number)

Please extract the following promotional information:
- totalPoints: Total bonus points offered in the promotion
- promotionDurationMonths: How many months the promotion lasts
- totalMembershipFee: Annual membership fee (IMPORTANT: Use exact amount with decimals, NOT 15588). Please note that if the
promotional length is >12, totalMembershipFee should be multiplied by the number of yearly fees user has to pay. i.e. promotional length is 17 months,
membershipfee total cost is multiplied by two.
- totalSpendRequired: Total spending required to earn all bonus points. Look for text similiar to : 'earn x points when you spend $x
' and its conditions. Once done, sum totalMembershipFee

Extract accurate values from the text. If a field is not mentioned, use 0.
`.trim();

const RETRY_EXTRACTION_PROMPT = `
You are retrying a previous extraction because one or more fields were returned as 0.

Return ONLY a JSON object with the same card keys as Input JSON.
Each key must map to:
- totalPoints (integer)
- totalSpendRequired (integer)
- promotionDurationMonths (integer)
- totalMembershipFee (number)

Important retry rule:
- Re-read the text carefully and avoid returning 0 unless the value is truly absent.
- If any value can be inferred from explicit offer text, return that value instead of 0.
- Keep the output schema exact.

Please extract:
- totalPoints: Total bonus points offered in the promotion.
- promotionDurationMonths: Total campaign duration to earn all bonuses.
- totalMembershipFee: Annual membership fee (exact amount, with decimals if present). If duration > 12 months, multiply annual fee by number of yearly fees required.
- totalSpendRequired: Total spend required to earn all bonus points, then add totalMembershipFee.

Extract accurate values from the text. Only use 0 when a field is genuinely not present.
`.trim();

// Connect to MongoDB
async function connectDB() {
  if (isConnected) {
    return;
  }

  await mongoose.connect(process.env.MONGO_URI);
  isConnected = true;
}
const GEMINI_API_KEY = process.env.VITE_GEMINI_API_KEY;
const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

async function geminiParse(promotion, prompt) {
  let offersObject = '';
  if(promotion instanceof Map){
     offersObject = Object.fromEntries(promotion);
  }
  else{
    offersObject = promotion
  }

  const geminiResponse = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: `Input JSON:
    ${JSON.stringify(offersObject)} ${prompt}`,
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
          },
          required: [
            "totalPoints",
            "totalSpendRequired",
            "promotionDurationMonths",
            "totalMembershipFee",
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

  const parsedObject = await geminiParse(offersMap, EXTRACTION_PROMPT);
  console.log(parsedObject);
  if (!parsedObject || typeof parsedObject !== "object")
    throw new Error("geminiParse returned invalid object");

  //Gemini Parse 0 Value Retry

  //add a while object !contains 0 loop
  const parsedMap = new Map(Object.entries(parsedObject));
  console.log(parsedMap);

  let needsRetry = false;
  let failedCard = '';
  for (const [key, value] of parsedMap) {
    for (const [attri, attriValue] of Object.entries(value)) {
      if (attriValue === 0) {
        needsRetry = true;
        failedCard = key;
        break;
      }
    }
    if (needsRetry) break;
  }

  if (needsRetry) {
    const retryInput = { [failedCard]: offersMap.get(failedCard) };
  const parsedFixObject = await geminiParse(retryInput, RETRY_EXTRACTION_PROMPT);
  parsedMap.set(failedCard, parsedFixObject[failedCard]);

  }

  for (const [key, value] of parsedMap) {
    const newData = value;
    const CardModel = mongoose.models[key] || mongoose.model(key, DataSchema, key);
    const latest =
      (await CardModel.findOne().sort({ date: -1 })) || undefined;
    const latestData = latest?.data?.[0];
    const isSame =
      latestData &&
      newData &&
      latestData.totalPoints === newData.totalPoints &&
      latestData.totalSpendRequired === newData.totalSpendRequired &&
      latestData.promotionDurationMonths === newData.promotionDurationMonths &&
      latestData.totalMembershipFee === newData.totalMembershipFee;

    if (!isSame) {
      const doc = CardModel({
        card: key,
        date: Date.now(),
        data: [newData],
      });
      await doc.save();
    }
  }

  return res.status(200).json({ ok: true });
}
