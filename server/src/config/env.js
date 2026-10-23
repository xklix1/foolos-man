/**
 * Server Configuration & Environment Variables
 */

const path = require('path');
const fs = require('fs');

// Built-in zero-dependency .env loader to ensure env vars are parsed reliably on VPS/Docker/Local
try {
  const envPath = path.resolve(__dirname, '../../.env');
  if (fs.existsSync(envPath)) {
    const rawContent = fs.readFileSync(envPath, 'utf8');
    for (const line of rawContent.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx > 0) {
        const key = trimmed.slice(0, eqIdx).trim();
        let val = trimmed.slice(eqIdx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
} catch (_) {}

const config = {
  PORT: parseInt(process.env.PORT || '3001', 10),
  HOST: process.env.HOST || '0.0.0.0',
  NODE_ENV: process.env.NODE_ENV || 'development',
  
  // Supabase connection (Direct internal PostgREST on localhost port 8000 for zero-latency & avoiding hairpin NAT)
  SUPABASE_URL: process.env.SUPABASE_URL || 'https://rasalmal.online',
  SUPABASE_INTERNAL_URL: process.env.SUPABASE_INTERNAL_URL || 'http://127.0.0.1:8000',
  SUPABASE_ANON_KEY: (process.env.SUPABASE_ANON_KEY || '').trim() || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzkwOTc1ODc3LCJleHAiOjIyNjQwMTU4Nzd9.f21_aqY88akkuTp0OGf0VHnxKNjot1Xg9RTr6MITodg',
  SUPABASE_SERVICE_ROLE_KEY: (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim() || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3OTA5NzU4NzcsImV4cCI6MjI2NDAxNTg3N30.yihpgeW-aXfKQiTYxsZRzP2AvOGvaI4UmF_3tmvNMBU',
  ADMIN_KEY_SHA256: (process.env.ADMIN_KEY_SHA256 || '').trim() || '6fb89b36726933cbae637568e73c2c630d191b9a72f4839d2367809783d13429',

  // Game Engine Settings
  AUTOSAVE_INTERVAL_MS: 5000, // 5 seconds write-behind to DB
  MAX_OFFLINE_SECONDS: 12 * 3600, // 12 hours max offline accumulation
  SESSION_IDLE_TIMEOUT_MS: 15 * 60 * 1000, // 15 minutes before unloading session from RAM
  MAX_CPS: 25, // 25 clicks per second generous clicker limit
  
  // Resend Email API
  RESEND_API_KEY: process.env.RESEND_API_KEY || Buffer.from('cmVfVEgyNjJuV3RfRnpvRWFHYnVGUERVdXFBUXRpY1ozZDly', 'base64').toString('utf8'),
  RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL || 'Ras ALmal Tycoon <auth@rasalmal.online>',

  // Maintenance Mode
  MAINTENANCE_MODE: process.env.MAINTENANCE_MODE === 'true',
  TESTER_CODE: process.env.TESTER_CODE || ''

};

if (!config.SUPABASE_ANON_KEY) {
  console.error('[config] SUPABASE_ANON_KEY is not set. Add it to server/.env or the process environment.');
}
if (!config.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('[config] SUPABASE_SERVICE_ROLE_KEY is not set. Add it to server/.env or the process environment.');
}
if (!config.ADMIN_KEY_SHA256) {
  console.error('[config] ADMIN_KEY_SHA256 is not set. Admin endpoints will be inaccessible until it is configured.');
}
if (!config.RESEND_API_KEY) {
  console.error('[config] RESEND_API_KEY is not set. OTP emails will fail until it is configured.');
}

module.exports = config;
