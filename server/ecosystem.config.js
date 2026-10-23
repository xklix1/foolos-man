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
        SUPABASE_INTERNAL_URL: process.env.SUPABASE_INTERNAL_URL || 'http://127.0.0.1:8000',
        SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzkwOTY4MjU5LCJleHAiOjIyNjQwMDgyNTl9.x3wRfLfk3UDMIlVf5JmBU7OhrHG_-CkccOfiV7H-Ad0',
        SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3OTA5NjgyNTksImV4cCI6MjI2NDAwODI1OX0._IEwkBwWBGYLdgMTM_f0czJkaBq7GuzDHJAo5SqofQc',
        AUTOSAVE_INTERVAL_MS: 30000,
        RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL || 'Ras ALmal Tycoon <auth@rasalmal.online>'
      }
    }
  ]
};
