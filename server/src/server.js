/**
 * Ras ALmal Tycoon — Authoritative Backend Server Entry Point
 * Framework: Fastify (Ultra-low latency, <2ms event execution)
 */

const Fastify = require('fastify');
const config = require('./config/env');
const { sanitizePlayerState } = require('./engine/state-sanitizer');

const app = Fastify({
  logger: {
    level: config.NODE_ENV === 'production' ? 'info' : 'info'
  }
});

// Register CORS for live domain and local development
app.register(require('@fastify/cors'), {
  origin: (origin, cb) => {
    // Allow rasalmal.online, localhost, and internal requests
    if (!origin || origin.includes('rasalmal.online') || origin.includes('localhost') || origin.includes('127.0.0.1')) {
      cb(null, true);
      return;
    }
    cb(new Error('CORS Not Allowed'), false);
  }
});

// Health check endpoint
app.get('/health', async (request, reply) => {
  const mem = process.memoryUsage();
  return {
    status: 'ok',
    service: 'Ras ALmal Core Engine',
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: Date.now(),
    memory: {
      heapUsedMB: Math.round(mem.heapUsed / 1024 / 1024 * 100) / 100,
      rssMB: Math.round(mem.rss / 1024 / 1024 * 100) / 100
    }
  };
});

// System status & configuration endpoint
app.get('/api/status', async (request, reply) => {
  return {
    architecture: 'Server-Authoritative',
    engineModel: 'Action-Driven Delta-Time',
    maxCpsLimit: config.MAX_CPS,
    maxOfflineHours: config.MAX_OFFLINE_SECONDS / 3600,
    autosaveIntervalSeconds: config.AUTOSAVE_INTERVAL_MS / 1000
  };
});

// Register Action and Session API routes
app.register(require('./routes/session-routes'));
app.register(require('./routes/action-routes'));

async function start() {
  try {
    await app.listen({ port: config.PORT, host: config.HOST });
    console.log(`\n======================================================`);
    console.log(`🚀 Ras ALmal Authoritative Server Running on port ${config.PORT}`);
    console.log(`   Health Check: http://localhost:${config.PORT}/health`);
    console.log(`======================================================\n`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

if (require.main === module) {
  start();
}

module.exports = app;
