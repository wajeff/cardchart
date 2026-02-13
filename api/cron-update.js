// Vercel Serverless Function - Runs daily at 12AM
// Fetches BrowseAI data → Parses with Gemini → Saves to MongoDB

import axios from 'axios';
import { GoogleGenAI } from '@google/genai';
import mongoose from 'mongoose';

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

export default async function handler(req, res) {
  // Verify this is a cron request (optional security)
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    await connectDB();

    const ROBOT_ID = process.env.VITE_AMEX_COBALT_ROBOT_ID;
    const ROBOT_API_KEY = process.env.VITE_ROBOT_API_KEY;
    const GEMINI_API_KEY = process.env.VITE_GEMINI_API_KEY;

    // 1. Fetch data from Browse.ai
    const browseResponse = await axios.get(
      `https://api.browse.ai/v2/robots/${ROBOT_ID}/tasks`,
      {
        headers: {
          Authorization: `Bearer ${ROBOT_API_KEY}`
        }
      }
    );

    const promotionData = browseResponse.data?.result?.robotTasks?.items?.[2];
    const promotion = `${promotionData?.capturedTexts?.Promotion} Data was gathered at ${promotionData.finishedAt}` || 'No promotion found';

    console.log('Fetched Browse.ai data:', promotion);

    // 2. Parse with Gemini
    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

    const geminiResponse = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `${promotion} please fill out membership fee to its exact amount - you always forget the decimal point IT IS NOT 15588, DOUBLE CHECK. please fill out when the data was gathered (it's in the last sentence), do not respond until all of the structured response has been filled out`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "array",
          items: {
            type: "object",
            properties: {
              totalPoints: { type: "integer" },
              totalSpendRequired: { type: "integer" },
              totalMembershipFee: { type: "integer" },
              dataGatheredAt: { type: "integer" }
            }
          }
        },
        propertyOrdering: ["totalPoints", "totalSpendRequired", "totalMembershipFee", "dataGatheredAt"]
      }
    });

    const parsedData = JSON.parse(geminiResponse.text);

    // Round membership fee to ceiling
    parsedData.forEach(item => {
      item.totalMembershipFee = Math.ceil(item.totalMembershipFee);
    });

    console.log('Parsed Gemini data:', parsedData);

    // 3. Check for duplicates
    const existingData = await DataModel.find({});

    const isDuplicate = existingData.some(record => {
      if (record.card !== 'amex_cobalt') return false;
      if (!record.data || record.data.length === 0) return false;

      const existing = record.data[0];
      const newData = parsedData[0];

      return existing.totalPoints === newData.totalPoints &&
             existing.totalSpendRequired === newData.totalSpendRequired &&
             existing.totalMembershipFee === newData.totalMembershipFee;
    });

    // 4. Save to MongoDB if new
    if (isDuplicate) {
      console.log('Data already exists - skipping save');
      return res.status(200).json({ message: 'Data already exists - skipped', data: parsedData });
    } else {
      const newRecord = new DataModel({
        card: 'amex_cobalt',
        date: new Date().toISOString(),
        data: parsedData
      });

      await newRecord.save();
      console.log('New data saved to MongoDB!');

      return res.status(200).json({ message: 'New data saved!', data: parsedData });
    }

  } catch (error) {
    console.error('Cron job error:', error);
    return res.status(500).json({ error: error.message });
  }
}
