// Test script to run cron logic locally without Vercel
import axios from 'axios';
import { GoogleGenAI } from '@google/genai';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables from root .env
dotenv.config();

// MongoDB Schema
const DataSchema = new mongoose.Schema({
  card: String,
  date: String,
  data: Array
});

let DataModel;
let isConnected = false;

// Connect to MongoDB
async function connectDB() {
  if (isConnected) {
    return;
  }

  await mongoose.connect(process.env.MONGO_URI);
  DataModel = mongoose.models.Data || mongoose.model('Data', DataSchema);
  isConnected = true;
}

async function runCron() {
  try {
    await connectDB();

    const ROBOT_ID = process.env.VITE_AMEX_COBALT_ROBOT_ID;
    const ROBOT_API_KEY = process.env.VITE_ROBOT_API_KEY;
    const GEMINI_API_KEY = process.env.VITE_GEMINI_API_KEY;

    console.log('🚀 Starting cron job test...\n');

    // 1. Fetch data from Browse.ai
    console.log('📡 Fetching from Browse.ai...');
    const browseResponse = await axios.get(
      `https://api.browse.ai/v2/robots/${ROBOT_ID}/tasks`,
      {
        headers: {
          Authorization: `Bearer ${ROBOT_API_KEY}`
        }
      }
    );

    const promotionData = browseResponse.data?.result?.robotTasks?.items?.[2];

    // Log raw promotion text to see format
    console.log('\n📋 Raw promotion from BrowseAI:');
    console.log(promotionData?.capturedTexts?.Promotion);
    console.log('\n⏰ Finished at:', promotionData?.finishedAt);

    const promotionText = promotionData?.capturedTexts?.Promotion || 'No promotion found';
    const promotion = `${promotionText} Data was gathered at ${promotionData.finishedAt}`;

    console.log('\n📝 Combined promotion data:');
    console.log(promotion);

    // 2. Parse with Gemini
    console.log('\n🤖 Parsing with Gemini...');
    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

    const geminiResponse = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `${promotion}

Please extract the following promotional information:
- totalPoints: Total bonus points offered in the promotion
- totalSpendRequired: Total spending required to earn all bonus points
- monthlySpendRequired: Monthly spending required to earn monthly bonus
- monthlyPoints: Points earned per month when meeting spend requirement
- promotionDurationMonths: How many months the promotion lasts
- totalMembershipFee: Annual membership fee (IMPORTANT: Use exact amount with decimals, NOT 15588)
- monthlyFee: Monthly membership fee
- dataGatheredAt: Timestamp from when data was gathered (in the last sentence)

Extract accurate values from the text. If a field is not mentioned, use 0.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "array",
          items: {
            type: "object",
            properties: {
              totalPoints: { type: "integer" },
              totalSpendRequired: { type: "integer" },
              monthlySpendRequired: { type: "integer" },
              monthlyPoints: { type: "integer" },
              promotionDurationMonths: { type: "integer" },
              totalMembershipFee: { type: "number" },
              monthlyFee: { type: "number" },
              dataGatheredAt: { type: "integer" }
            }
          }
        },
        propertyOrdering: ["totalPoints", "totalSpendRequired", "monthlySpendRequired", "monthlyPoints", "promotionDurationMonths", "totalMembershipFee", "monthlyFee", "dataGatheredAt"]
      }
    });

    const parsedData = JSON.parse(geminiResponse.text);

    // Round fees to ceiling and add promotion text
    parsedData.forEach(item => {
      item.totalMembershipFee = Math.ceil(item.totalMembershipFee);
      item.monthlyFee = Math.ceil(item.monthlyFee * 100) / 100; // Round to 2 decimals
      item.promotionText = promotionText; // Add raw promotion text
      item.dataGatheredAt = Date.now(); // Use server time instead of Gemini-parsed timestamp
    });

    console.log('\n✅ Parsed Gemini data:');
    console.log(JSON.stringify(parsedData, null, 2));

    // 3. Check for duplicates (ignore promotionText and dataGatheredAt)
    console.log('\n🔍 Checking for duplicates...');
    const existingData = await DataModel.find({});

    const isDuplicate = existingData.some(record => {
      if (record.card !== 'amex_cobalt') return false;
      if (!record.data || record.data.length === 0) return false;

      const existing = record.data[0];
      const newData = parsedData[0];

      return existing.totalPoints === newData.totalPoints &&
             existing.totalSpendRequired === newData.totalSpendRequired &&
             existing.monthlySpendRequired === newData.monthlySpendRequired &&
             existing.monthlyPoints === newData.monthlyPoints &&
             existing.promotionDurationMonths === newData.promotionDurationMonths &&
             existing.totalMembershipFee === newData.totalMembershipFee &&
             existing.monthlyFee === newData.monthlyFee;
    });

    // 4. Save to MongoDB if new
    if (isDuplicate) {
      console.log('\n⚠️  Data already exists - skipping save');
    } else {
      const newRecord = new DataModel({
        card: 'amex_cobalt',
        date: Date.now(),
        data: parsedData
      });

      await newRecord.save();
      console.log('\n💾 New data saved to MongoDB!');
    }

    console.log('\n✨ Cron job test completed successfully!\n');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Cron job error:', error);
    process.exit(1);
  }
}

runCron();
