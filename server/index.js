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
  const { card } = req.query;

  // Filter by card if provided, otherwise return all
  const query = card ? { card } : {};
  const results = await DataModel.find(query).sort({ date: 1 });

  res.json(results);
});

app.post('/api/data', async (req, res) => {
  const newData = new DataModel(req.body);
  await newData.save();
  res.json({ message: 'Saved!' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
