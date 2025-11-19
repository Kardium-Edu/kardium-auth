const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
app.use(cors());

app.get('/validate-email', async (req, res) => {
  const { email } = req.query;
  
  if (!email) {
    return res.status(400).json({ error: 'Email required' });
  }

  try {
    const API_KEY = 'ac02713ef78e4565b9a9802f1443de2e';
    const url = `https://emailreputation.abstractapi.com/v1/?api_key=${API_KEY}&email=${encodeURIComponent(email)}`;
    
    console.log('Validating email:', email);
    
    const response = await fetch(url);
    const data = await response.json();
    
    console.log('API Response:', data);
    
    res.json(data);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Validation failed' });
  }
});

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ status: 'Server is running' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Email validation server running on port ${PORT}`);
});