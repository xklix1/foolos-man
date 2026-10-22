/**
 * PM2 Process Manager Configuration
 * Hostinger VPS Production Daemon
 */

module.exports = {
  apps: [
    {
      name: 'rasalmal-core',
      script: './src/server.js',
      cwd: __dirname,
      instances: 1, // Single instance handles 1500+ CCU; use 'max' or 2 for multi-core clustering
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G', // Restart if memory leaks exceed 1GB (out of 8GB available)
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
        HOST: '127.0.0.1',
        SUPABASE_URL: process.env.SUPABASE_URL || 'https://rasalmal.online',
        SUPABASE_INTERNAL_URL: process.env.SUPABASE_INTERNAL_URL || 'https://rasalmal.online',
        SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzkwOTc1ODc3LCJleHAiOjIyNjQwMTU4Nzd9.f21_aqY88akkuTp0OGf0VHnxKNjot1Xg9RTr6MITodg',
        SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3OTA5NzU4NzcsImV4cCI6MjI2NDAxNTg3N30.yihpgeW-aXfKQiTYxsZRzP2AvOGvaI4UmF_3tmvNMBU',
        AUTOSAVE_INTERVAL_MS: 30000,
        RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL || 'Ras ALmal Tycoon <auth@rasalmal.online>'
      }
    }
  ]
};
