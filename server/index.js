const express = require ('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config({ path: __dirname + '/.env' });
const dotenv = require('dotenv');


console.log('Mongo URI:', process.env.MONGO_URI);

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Connect to MongoDB

mongoose.connect(process.env.MONGO_URI, {
}).then(() => {
  console.log('MongoDB connected');
}).catch(err => {
  console.error('Mongo error:', err);
});

// Sample schema

const DataSchema = new mongoose.Schema({
  card: String,
  date: String,
  data: Array
});

const DataModel = mongoose.model('Data', DataSchema);

// API route

app.get('/api/data', async (req, res) => {
  try {
    const { card } = req.query;
    if (!card) {
      const results = await DataModel.find({}).sort({ date: 1 });
      return res.json(results);
    }

    const collection = mongoose.connection.collection(card);
    const directResults = await collection.find({}).sort({ date: 1 }).toArray();
    if (directResults.length > 0) {
      return res.json(directResults);
    }

    const legacyResults = await DataModel.find({ card }).sort({ date: 1 });
    return res.json(legacyResults);
  } catch (error) {
    console.error('API error:', error);
    return res.status(500).json({ error: error.message });
  }
});

app.post('/api/data', async (req, res) => {
  const newData = new DataModel(req.body);
  await newData.save();
  res.json({ message: 'Saved!' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
