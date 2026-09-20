/**
 * Server Configuration & Environment Variables
 */

const path = require('path');
try {
  require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
} catch (_) {}

const config = {
  PORT: parseInt(process.env.PORT || '3001', 10),
  HOST: process.env.HOST || '0.0.0.0',
  NODE_ENV: process.env.NODE_ENV || 'development',
  
  // Supabase connection
  SUPABASE_URL: process.env.SUPABASE_URL || 'https://rasalmal.online',
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzg5ODYzMDc5LCJleHAiOjIyNjI5MDMwNzl9.1CP85uGrdjSfcQLIa0_2rfR0Y71y3co0Uw25hw3b0ME',
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  ADMIN_KEY_SHA256: process.env.ADMIN_KEY_SHA256 || 'f7bd3e9d5f13264c2dcc635b0f0e7edd3cc732d23d86b1d642e20ce9bd43dd99',

  // Game Engine Settings
  AUTOSAVE_INTERVAL_MS: 30000, // 30 seconds write-behind to DB
  MAX_OFFLINE_SECONDS: 12 * 3600, // 12 hours max offline accumulation
  MAX_CPS: 15, // Maximum validated clicks per second (anti-autoclicker)
  SESSION_IDLE_TIMEOUT_MS: 15 * 60 * 1000 // 15 minutes before unloading session from RAM
};

module.exports = config;
