require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const port = process.env.PORT || 4000;

// CORS config
const allowedOrigins = ['http://localhost:3000', 'https://your-frontend.vercel.app'];

app.use(cors({
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
  credentials: true,
}));

// Explicitly handle preflight OPTIONS request
app.options('*', cors());

app.use(express.json());
console.log(process.env.SUPABASE_URL)

// Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// POST /api/waitlist
app.post('/api/waitlist', async (req, res) => {
  const { name, email } = req.body;

  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  // Check if email already exists
  const { data: existingUser } = await supabase
    .from('waitlist')
    .select('id')
    .eq('email', email.toLowerCase())
    .single();

  if (existingUser) {
    return res.status(409).json({ error: 'Email already registered' });
  }

  // Insert new user
  const { data, error } = await supabase
    .from('waitlist')
    .insert([
      {
        name: name.trim(),
        email: email.toLowerCase().trim(),
        created_at: new Date().toISOString()
      }
    ])
    .select()
    .single();

  if (error) {
    console.error('Supabase insert error:', error);
    return res.status(500).json({ error: 'Failed to save to database' });
  }

  // Count total
  const { count } = await supabase
    .from('waitlist')
    .select('*', { count: 'exact', head: true });

  res.status(201).json({
    success: true,
    message: 'Successfully joined waitlist',
    data: {
      id: data.id,
      name: data.name,
      position: count || 1
    }
  });
});

// Start server
app.listen(port, () => {
  console.log(`API server running at http://localhost:${port}`);
});
