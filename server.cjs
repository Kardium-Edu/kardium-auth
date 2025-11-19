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
    
    console.log('Validating email:', email);  // ADD THIS
    
    const response = await fetch(url);
    const data = await response.json();
    
    console.log('API Response:', data);  // ADD THIS
    
    res.json(data);
  } catch (error) {
    console.error('Error:', error);  // ADD THIS
    res.status(500).json({ error: 'Validation failed' });
  }
});

app.listen(3001, () => {
  console.log('Email validation server running on http://localhost:3001');
});