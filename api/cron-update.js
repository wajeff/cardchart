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
- promotionDurationMonths: How many months the promotion lasts
- totalMembershipFee: Annual membership fee (IMPORTANT: Use exact amount with decimals, NOT 15588)
- dataGatheredAt: Timestamp from when data was gathered (in the last sentence)

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
         existing.promotionDurationMonths === incoming.promotionDurationMonths &&
         existing.totalMembershipFee === incoming.totalMembershipFee;
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

function buildCombinedPromotionText(promotionData, promotionSource = null) {
  const segments = [];

  const pushSegment = (label, value) => {
    const normalizedValue = normalizePromotionValue(value);
    if (!normalizedValue) {
      return;
    }
    segments.push(label ? `${label}: ${normalizedValue}` : normalizedValue);
  };

  const addCapturedValue = (label, value) => {
    if (value === null || value === undefined) {
      return;
    }

    if (Array.isArray(value)) {
      value.forEach((item, index) => addCapturedValue(`${label}[${index}]`, item));
      return;
    }

    if (typeof value === 'object') {
      Object.entries(value).forEach(([key, child]) => addCapturedValue(`${label}.${key}`, child));
      return;
    }

    pushSegment(label, value);
  };

  // Keep configured/primary source first (useful when one field is the canonical promo field).
  const primaryPromotionText = extractPromotionText(promotionData, promotionSource);
  pushSegment('primary', primaryPromotionText);

  // Include every captured payload from Browse task:
  // capturedTexts, capturedLists, capturedData, capturedAttributes, etc.
  Object.entries(promotionData || {}).forEach(([key, value]) => {
    if (!key.startsWith('captured')) {
      return;
    }
    addCapturedValue(key, value);
  });

  return segments.join('\n');
}

function collectCapturedFromTasks(tasks = []) {
  const merged = {};

  tasks.forEach((task) => {
    Object.entries(task || {}).forEach(([key, value]) => {
      if (!key.startsWith('captured') || value === null || value === undefined) {
        return;
      }

      if (Array.isArray(value)) {
        const existing = Array.isArray(merged[key]) ? merged[key] : [];
        merged[key] = existing.concat(value);
        return;
      }

      if (typeof value === 'object') {
        const existing = merged[key] && typeof merged[key] === 'object' && !Array.isArray(merged[key])
          ? merged[key]
          : {};
        merged[key] = { ...existing, ...value };
        return;
      }

      merged[key] = value;
    });
  });

  return merged;
}

function parseCurrencyLikeNumber(value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value !== 'string') {
    return 0;
  }

  const normalized = value.replace(/,/g, '');
  const match = normalized.match(/-?\d+(\.\d+)?/);
  if (!match) {
    return 0;
  }

  const parsed = Number(match[0]);
  return Number.isFinite(parsed) ? parsed : 0;
}

function findNumericByKey(capturedTexts = {}, candidateKeys = []) {
  const keyMap = new Map(
    Object.entries(capturedTexts).map(([key, value]) => [key.toLowerCase(), value])
  );

  for (const key of candidateKeys) {
    const raw = keyMap.get(key.toLowerCase());
    const parsed = parseCurrencyLikeNumber(raw);
    if (parsed > 0) {
      return parsed;
    }
  }

  return 0;
}

function inferPromotionDurationMonths(promotionText, geminiDuration) {
  const text = String(promotionText || '');

  // Highest confidence: explicit cardmembership ranges, e.g. "between 15 and 17 months of Cardmembership".
  const cardMembershipRangeRegexes = [
    /between\s+(\d+)\s+and\s+(\d+)\s+months?\s+of\s+cardmembership/gi,
    /(\d+)\s*(?:-|to)\s*(\d+)\s+months?\s+of\s+cardmembership/gi
  ];

  const rangeCandidates = [];
  cardMembershipRangeRegexes.forEach((regex) => {
    for (const match of text.matchAll(regex)) {
      const high = Number(match[2]);
      if (Number.isFinite(high) && high > 0) {
        rangeCandidates.push(high);
      }
    }
  });
  if (rangeCandidates.length > 0) {
    return Math.max(...rangeCandidates);
  }

  // Next: explicit single cardmembership mention.
  const cardMembershipSingleRegex = /(\d+)\s+months?\s+of\s+cardmembership/gi;
  const singleCandidates = [];
  for (const match of text.matchAll(cardMembershipSingleRegex)) {
    const value = Number(match[1]);
    if (Number.isFinite(value) && value > 0) {
      singleCandidates.push(value);
    }
  }
  if (singleCandidates.length > 0) {
    return Math.max(...singleCandidates);
  }

  // Fallback to model output.
  const parsedGeminiDuration = Number(geminiDuration) || 0;
  if (parsedGeminiDuration > 0) {
    return parsedGeminiDuration;
  }

  return 0;
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

  const taskItems = browseResponse.data?.result?.robotTasks?.items || [];
  const resolvedTaskIndex = Number.isInteger(taskIndex)
    ? taskIndex
    : Number(process.env.BROWSE_TASK_INDEX ?? 2);
  const promotionData = taskItems?.[resolvedTaskIndex];

  if (!promotionData) {
    throw new Error(`No Browse.ai task found for card=${card} at index=${resolvedTaskIndex}`);
  }

  // Merge captured payload across returned tasks so fields split across tasks are still available.
  const mergedCapturedPayload = collectCapturedFromTasks(taskItems);
  const mergedPromotionData = { ...promotionData, ...mergedCapturedPayload };

  const promotionText = buildCombinedPromotionText(mergedPromotionData, promotionSource);
  if (!promotionText) {
    throw new Error(`No promotion text found for card=${card}. Check capturedTexts/capturedLists and promotionSource config.`);
  }
  const capturedPayload = Object.fromEntries(
    Object.entries(mergedPromotionData || {}).filter(([key]) => key.startsWith('captured'))
  );
  const promotion = `${promotionText}

RAW_CAPTURED_PAYLOAD_JSON:
${JSON.stringify(capturedPayload)}
Data was gathered at ${promotionData.finishedAt}`;

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
            promotionDurationMonths: { type: 'integer' },
            totalMembershipFee: { type: 'number' },
            dataGatheredAt: { type: 'integer' }
          }
        }
      },
      propertyOrdering: ['totalPoints', 'totalSpendRequired', 'monthlySpendRequired', 'promotionDurationMonths', 'totalMembershipFee', 'dataGatheredAt']
    }
  });

  const parsedData = JSON.parse(geminiResponse.text);
  const fallbackAnnualFee = findNumericByKey(mergedPromotionData?.capturedTexts, [
    'Annual Fee',
    'Annual Membership Fee',
    'Membership Fee',
    'Yearly Fee'
  ]);
  parsedData.forEach((item) => {
    const promotionDurationMonths = inferPromotionDurationMonths(
      promotionText,
      item.promotionDurationMonths
    );
    item.promotionDurationMonths = promotionDurationMonths;
    let baseTotalMembershipFee = Number(item.totalMembershipFee) || 0;
    if (baseTotalMembershipFee <= 0 && fallbackAnnualFee > 0) {
      baseTotalMembershipFee = fallbackAnnualFee;
    }

    const baseTotalSpendRequired = Number(item.totalSpendRequired) || 0;

    const yearsOfFees = Math.max(1, Math.ceil(promotionDurationMonths / 12));
    const adjustedMembershipFee = baseTotalMembershipFee * yearsOfFees;

    item.totalMembershipFee = Math.ceil(adjustedMembershipFee);
    item.totalSpendRequired = Math.ceil(baseTotalSpendRequired + item.totalMembershipFee);
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
