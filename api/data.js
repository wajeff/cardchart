import mongoose from "mongoose";

const DataSchema = new mongoose.Schema({
  card: String,
  date: String,
  data: Array,
});

let DataModel;
let isConnected = false;

async function connectDB() {
  if (isConnected) return;
  await mongoose.connect(process.env.MONGO_URI);
  DataModel = mongoose.models.Data || mongoose.model("Data", DataSchema);
  isConnected = true;
}

export default async function handler(req, res) {
  try {
    await connectDB();
    const { card } = req.query;
    console.log(card)
    if (!card) return res.status(400).json({ error: "Missing card" });

    const collection = mongoose.connection.collection(card);
    const results = await collection.find({}).sort({ date: 1 }).toArray();

    return res.status(200).json(results);
  } catch (error) {
    console.error("API error:", error);
    return res.status(500).json({ error: error.message });
  }
}
