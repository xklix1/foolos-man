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
        SUPABASE_URL: 'https://rasalmal.online',
        AUTOSAVE_INTERVAL_MS: 30000
      }
    }
  ]
};
