// Vercel Serverless Function - Runs daily at 12AM
// Fetches BrowseAI data → Parses with Gemini → Saves to MongoDB

import axios from 'axios';
import { GoogleGenAI } from '@google/genai';
import mongoose from 'mongoose';
import fs from 'node:fs';
import path from 'node:path';

// MongoDB Schema
const DataSchema = new mongoose.Schema({
  card: String,
  date: String,
  data: Array
});

let DataModel;
let isConnected = false;

const EXTRACTION_PROMPT = `
Please extract the following promotional information:
- totalPoints: Total bonus points offered in the promotion
- totalSpendRequired: Total spending required to earn all bonus points
- monthlySpendRequired: Monthly spending required to earn monthly bonus
- monthlyPoints: Points earned per month when meeting spend requirement
- promotionDurationMonths: How many months the promotion lasts
- totalMembershipFee: Annual membership fee (IMPORTANT: Use exact amount with decimals, NOT 15588)
- monthlyFee: Monthly membership fee
- dataGatheredAt: Timestamp from when data was gathered (in the last sentence)

Extract accurate values from the text. If a field is not mentioned, use 0.
`.trim();

// Connect to MongoDB
async function connectDB() {
  if (isConnected) {
    return;
  }

  await mongoose.connect(process.env.MONGO_URI);
  DataModel = mongoose.models.Data || mongoose.model('Data', DataSchema);
  isConnected = true;
}

function getRobotConfigs() {
  // Preferred config file (easy to read/edit in source control).
  // Default path: api/cards.config.json
  const configPath = process.env.CARD_ROBOTS_FILE || 'api/cards.config.json';
  const absoluteConfigPath = path.resolve(process.cwd(), configPath);
  if (fs.existsSync(absoluteConfigPath)) {
    const fileContent = fs.readFileSync(absoluteConfigPath, 'utf8');
    const parsed = JSON.parse(fileContent);
    if (!Array.isArray(parsed)) {
      throw new Error(`${configPath} must contain a JSON array`);
    }

    return parsed
      .filter((item) => item?.card && (item?.robotId || item?.robotIdEnv))
      .map((item) => {
        const card = String(item.card);
        const robotId = item?.robotId || process.env[item?.robotIdEnv];

        if (!robotId) {
          const missingKey = item?.robotIdEnv || 'robotId';
          throw new Error(`Missing robot ID for card=${card}. Expected env key: ${missingKey}`);
        }

        return {
          card,
          robotId: String(robotId),
          taskIndex: item?.taskIndex,
          promotionSource: item?.promotionSource || null
        };
      });
  }

  // Optional inline env config:
  // CARD_ROBOTS_JSON='[{"card":"amex_cobalt","robotId":"..."},{"card":"amex_platinum","robotId":"..."}]'
  if (process.env.CARD_ROBOTS_JSON) {
    const parsed = JSON.parse(process.env.CARD_ROBOTS_JSON);
    if (!Array.isArray(parsed)) {
      throw new Error('CARD_ROBOTS_JSON must be a JSON array');
    }

    return parsed
      .filter((item) => item?.card && item?.robotId)
      .map((item) => ({
        card: String(item.card),
        robotId: String(item.robotId),
        taskIndex: item?.taskIndex,
        promotionSource: item?.promotionSource || null
      }));
  }

  // Backward-compatible fallback:
  // Reads every env var like VITE_<CARD_NAME>_ROBOT_ID and converts to card slug.
  return Object.entries(process.env)
    .filter(([key, value]) => key.startsWith('VITE_') && key.endsWith('_ROBOT_ID') && value)
    .map(([key, value]) => {
      const card = key
        .replace(/^VITE_/, '')
        .replace(/_ROBOT_ID$/, '')
        .toLowerCase();

      return { card, robotId: value, taskIndex: undefined, promotionSource: null };
    });
}

function isSamePromotion(existing, incoming) {
  return existing.totalPoints === incoming.totalPoints &&
         existing.totalSpendRequired === incoming.totalSpendRequired &&
         existing.monthlySpendRequired === incoming.monthlySpendRequired &&
         existing.monthlyPoints === incoming.monthlyPoints &&
         existing.promotionDurationMonths === incoming.promotionDurationMonths &&
         existing.totalMembershipFee === incoming.totalMembershipFee &&
         existing.monthlyFee === incoming.monthlyFee;
}

function normalizePromotionValue(value) {
  if (typeof value === 'string') {
    return value.trim();
  }
  if (typeof value === 'number') {
    return String(value);
  }
  if (value && typeof value === 'object' && typeof value.text === 'string') {
    return value.text.trim();
  }
  if (value === null || value === undefined) {
    return '';
  }
  return JSON.stringify(value);
}

function readFromList(list, source = {}) {
  if (!Array.isArray(list) || list.length === 0) {
    return '';
  }

  if (Number.isInteger(source.itemIndex)) {
    return normalizePromotionValue(list[source.itemIndex]);
  }

  const joinWith = typeof source.joinWith === 'string' ? source.joinWith : '\n';
  return list
    .map((item) => normalizePromotionValue(item))
    .filter(Boolean)
    .join(joinWith);
}

function extractPromotionText(promotionData, promotionSource = null) {
  const capturedTexts = promotionData?.capturedTexts || {};
  const capturedLists = promotionData?.capturedLists || {};

  if (promotionSource?.type === 'text' && promotionSource?.key) {
    return normalizePromotionValue(capturedTexts[promotionSource.key]);
  }

  if (promotionSource?.type === 'list' && promotionSource?.key) {
    return readFromList(capturedLists[promotionSource.key], promotionSource);
  }

  // Auto mode: use explicit "Promotion" first, then any non-empty text key.
  const directPromotionText = normalizePromotionValue(capturedTexts.Promotion);
  if (directPromotionText) {
    return directPromotionText;
  }

  const firstTextValue = Object.values(capturedTexts)
    .map((value) => normalizePromotionValue(value))
    .find(Boolean);
  if (firstTextValue) {
    return firstTextValue;
  }

  // For <ul> style robots, use "Promotion" list first, then any non-empty list.
  const preferredList = capturedLists.Promotion;
  const preferredListText = readFromList(preferredList, promotionSource || {});
  if (preferredListText) {
    return preferredListText;
  }

  const firstList = Object.values(capturedLists).find((value) => Array.isArray(value) && value.length > 0);
  return readFromList(firstList, promotionSource || {});
}

async function processCard({ card, robotId, taskIndex, promotionSource, robotApiKey, geminiApiKey }) {
  // 1. Fetch data from Browse.ai
  const browseResponse = await axios.get(
    `https://api.browse.ai/v2/robots/${robotId}/tasks`,
    {
      headers: {
        Authorization: `Bearer ${robotApiKey}`
      }
    }
  );

  const resolvedTaskIndex = Number.isInteger(taskIndex)
    ? taskIndex
    : Number(process.env.BROWSE_TASK_INDEX ?? 2);
  const promotionData = browseResponse.data?.result?.robotTasks?.items?.[resolvedTaskIndex];

  if (!promotionData) {
    throw new Error(`No Browse.ai task found for card=${card} at index=${resolvedTaskIndex}`);
  }

  const promotionText = extractPromotionText(promotionData, promotionSource);
  if (!promotionText) {
    throw new Error(`No promotion text found for card=${card}. Set promotionSource in cards config.`);
  }
  const promotion = `${promotionText} Data was gathered at ${promotionData.finishedAt}`;

  // 2. Parse with Gemini
  const ai = new GoogleGenAI({ apiKey: geminiApiKey });
  const geminiResponse = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: `${promotion}\n\n${EXTRACTION_PROMPT}`,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            totalPoints: { type: 'integer' },
            totalSpendRequired: { type: 'integer' },
            monthlySpendRequired: { type: 'integer' },
            monthlyPoints: { type: 'integer' },
            promotionDurationMonths: { type: 'integer' },
            totalMembershipFee: { type: 'number' },
            monthlyFee: { type: 'number' },
            dataGatheredAt: { type: 'integer' }
          }
        }
      },
      propertyOrdering: ['totalPoints', 'totalSpendRequired', 'monthlySpendRequired', 'monthlyPoints', 'promotionDurationMonths', 'totalMembershipFee', 'monthlyFee', 'dataGatheredAt']
    }
  });

  const parsedData = JSON.parse(geminiResponse.text);
  parsedData.forEach((item) => {
    item.totalMembershipFee = Math.ceil(item.totalMembershipFee);
    item.monthlyFee = Math.ceil(item.monthlyFee * 100) / 100;
    item.promotionText = promotionText;
    item.dataGatheredAt = Date.now();
  });

  const newData = parsedData[0];
  if (!newData) {
    throw new Error(`Gemini returned empty data for card=${card}`);
  }

  // 3. Check duplicate against latest record for this card
  const latestRecord = await DataModel.findOne({ card }).sort({ date: -1 });
  const latestData = latestRecord?.data?.[0];
  const isDuplicate = latestData ? isSamePromotion(latestData, newData) : false;

  // 4. Save if changed
  if (isDuplicate) {
    return { card, saved: false, message: 'Data already exists - skipped' };
  }

  const newRecord = new DataModel({
    card,
    date: Date.now(),
    data: parsedData
  });
  await newRecord.save();

  return { card, saved: true, message: 'New data saved!' };
}

export default async function handler(req, res) {
  // Verify this is a cron request (optional security)
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    await connectDB();

    const robotApiKey = process.env.VITE_ROBOT_API_KEY;
    const geminiApiKey = process.env.VITE_GEMINI_API_KEY;
    const robotConfigs = getRobotConfigs();

    if (!robotApiKey || !geminiApiKey) {
      return res.status(500).json({ error: 'Missing VITE_ROBOT_API_KEY or VITE_GEMINI_API_KEY' });
    }

    if (robotConfigs.length === 0) {
      return res.status(500).json({
        error: 'No robot configs found. Add api/cards.config.json with robotIdEnv keys, or set CARD_ROBOTS_JSON, or VITE_<CARD_NAME>_ROBOT_ID env vars.'
      });
    }

    const results = [];
    for (const config of robotConfigs) {
      try {
        const result = await processCard({
          card: config.card,
          robotId: config.robotId,
          taskIndex: config.taskIndex,
          promotionSource: config.promotionSource,
          robotApiKey,
          geminiApiKey
        });
        console.log(`[cron-update] ${config.card}: ${result.message}`);
        results.push({ ...result, ok: true });
      } catch (cardError) {
        console.error(`[cron-update] ${config.card} failed:`, cardError.message);
        results.push({ card: config.card, ok: false, error: cardError.message });
      }
    }

    const hasFailure = results.some((item) => !item.ok);
    return res.status(hasFailure ? 207 : 200).json({
      message: hasFailure ? 'Completed with some failures' : 'All cards processed',
      results
    });
  } catch (error) {
    console.error('Cron job error:', error);
    return res.status(500).json({ error: error.message });
  }
}
