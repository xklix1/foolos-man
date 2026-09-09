/**
 * Server Configuration & Environment Variables
 */

const path = require('path');

const config = {
  PORT: parseInt(process.env.PORT || '3001', 10),
  HOST: process.env.HOST || '0.0.0.0',
  NODE_ENV: process.env.NODE_ENV || 'development',
  
  // Supabase connection
  SUPABASE_URL: process.env.SUPABASE_URL || 'https://rasalmal.online',
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzg4NTU5NzUzLCJleHAiOjIxMDM5MTk3NTN9.2465KGfimfRI4L3fZ6L6kXSOjPt6AC-0eHtchpt7F08',
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || '',

  // Game Engine Settings
  AUTOSAVE_INTERVAL_MS: 30000, // 30 seconds write-behind to DB
  MAX_OFFLINE_SECONDS: 12 * 3600, // 12 hours max offline accumulation
  MAX_CPS: 15, // Maximum validated clicks per second (anti-autoclicker)
  SESSION_IDLE_TIMEOUT_MS: 15 * 60 * 1000 // 15 minutes before unloading session from RAM
};

module.exports = config;
