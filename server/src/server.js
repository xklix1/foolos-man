/**
 * Ras ALmal Tycoon — Authoritative Backend Server Entry Point
 * Framework: Fastify (Ultra-low latency, <2ms event execution)
 */

const Fastify = require('fastify');
const config = require('./config/env');
const { sanitizePlayerState } = require('./engine/state-sanitizer');

const app = Fastify({
  trustProxy: true,
  bodyLimit: 5 * 1024 * 1024, // 5MB limit for base64 avatar uploads
  logger: {
    level: config.NODE_ENV === 'production' ? 'info' : 'info'
  }
});

// Register Global Anti-Lag Dual-Layer Rate Limiting across all endpoints
app.register(require('@fastify/rate-limit'), {
  global: true,
  max: 300, // 300 requests per minute per user/IP (generous 5 requests/sec baseline)
  timeWindow: 60 * 1000,
  cache: 20000,
  keyGenerator: (request) => {
    // 1. If authenticated with Bearer session token, rate-limit by user session
    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7).trim();
      if (token && token.length >= 10) return `usr_tok:${token.slice(0, 32)}`;
    }
    // 2. If request has username in body or query, rate-limit by username
    if (request.body && typeof request.body === 'object' && request.body.username) {
      const u = String(request.body.username).trim().toLowerCase();
      if (u) return `usr:${u}`;
    }
    if (request.query && typeof request.query === 'object' && request.query.username) {
      const u = String(request.query.username).trim().toLowerCase();
      if (u) return `usr:${u}`;
    }
    // 3. Fallback to real IP (respecting Nginx/Cloudflare X-Forwarded-For)
    const xff = request.headers['x-forwarded-for'];
    if (xff) {
      const clientIp = xff.split(',')[0].trim();
      if (clientIp) return `ip:${clientIp}`;
    }
    return `ip:${request.ip || 'unknown'}`;
  },
  errorResponseBuilder: (request, context) => {
    return {
      statusCode: 429,
      error: 'Too Many Requests',
      message: `تم تجاوز معدل الطلبات المسموح به لحماية استقرار السيرفر ومنع اللاج. يرجى التمهل بضع ثوانٍ. (الحد الأقصى ${context.max} طلب لكل ${Math.round(context.ttl / 1000)} ثانية)`,
      retryAfter: Math.ceil(context.ttl / 1000)
    };
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

// Enforce Global Security Headers (Clickjacking & MIME-Sniffing Defense)
app.addHook('onSend', async (request, reply) => {
  reply.header('X-Content-Type-Options', 'nosniff');
  reply.header('X-Frame-Options', 'SAMEORIGIN');
  reply.header('Referrer-Policy', 'strict-origin-when-cross-origin');
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
    autosaveIntervalSeconds: config.AUTOSAVE_INTERVAL_MS / 1000,
    supabaseUrl: config.SUPABASE_URL,
    serviceKeyLength: config.SUPABASE_SERVICE_ROLE_KEY ? config.SUPABASE_SERVICE_ROLE_KEY.length : 0,
    serviceKeyPrefix: config.SUPABASE_SERVICE_ROLE_KEY ? config.SUPABASE_SERVICE_ROLE_KEY.slice(0, 15) : 'none'
  };
});

// Register Action, Airport, Auction, Session, Admin, Auth OTP, and Push API routes
app.register(require('./routes/session-routes'));
app.register(require('./routes/action-routes'));
app.register(require('./routes/airport-routes'));
app.register(require('./routes/auction-routes'));
app.register(require('./routes/museum-routes'));
app.register(require('./routes/push-routes'));
app.register(require('./routes/auth-otp-routes'));
app.register(require('./routes/chat-routes'));
app.register(require('./routes/admin-routes'), { 
  prefix: '/api/admin',
  sessionManager: require('./services/session-manager')
});
app.register(require('./routes/moderator-routes'), {
  prefix: '/api/mod',
  sessionManager: require('./services/session-manager')
});

// Background offline push notification checker (runs every 60 seconds)
const pushService = require('./services/push-service');
const dbService = require('./services/db-service');
const sessionManager = require('./services/session-manager');

const OFFLINE_PUSH_CHECK_INTERVAL_MS = 60 * 1000;
const pushCheckerTimer = setInterval(async () => {
  try {
    await pushService.checkOfflineSubscribersAndNotify(dbService, sessionManager);
  } catch (err) {
    // Non-fatal background check
  }
}, OFFLINE_PUSH_CHECK_INTERVAL_MS);

if (pushCheckerTimer.unref) {
  pushCheckerTimer.unref(); // Prevents timer from keeping Node process alive during test runs
}

// Background Authoritative Hourly Leaderboard Updater (runs every 10 minutes)
async function updateAuthoritativeLeaderboardSnapshot() {
  try {
    const serviceKey = config.SUPABASE_SERVICE_ROLE_KEY || config.SUPABASE_ANON_KEY;
    if (!serviceKey) return;

    const now = Date.now();
    const cycleMs = 60 * 60 * 1000;
    const date = new Date(now);
    const msIntoCurrentHour = (date.getMinutes() * 60 + date.getSeconds()) * 1000 + date.getMilliseconds();
    const nextUpdateAt = now + (cycleMs - msIntoCurrentHour);
    const updatedAt = nextUpdateAt - cycleMs;

    const playersRes = await fetch(`${config.SUPABASE_URL}/rest/v1/players?select=username,cash,bank,net_worth,title,job_id,is_admin,is_banned&is_banned=eq.false&username=not.in.(newu,khaled,Khaled,خالد,rasalmal,rasalmal1,rasalmal2,Rasalmal,Rasalmal1,Rasalmal2,asd,Asd,ASD,7ablas,7Ablas,osos,Osos,OSOS,tito2761,Tito2761,TITO2761)&order=net_worth.desc&limit=35`, {
      headers: {
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`
      }
    });

    if (!playersRes.ok) return;
    const rows = await playersRes.json();
    if (!Array.isArray(rows) || rows.length === 0) return;

    const hiddenList = new Set(['newu', 'khaled', 'خالد', 'rasalmal', 'rasalmal1', 'rasalmal2', 'asd', '7ablas', 'osos', 'tito2761']);
    const topPlayers = rows
      .filter(r => r && !hiddenList.has(String(r.username || '').trim().toLowerCase()))
      .slice(0, 10)
      .map(r => ({
        username: r.username,
        cash: Number(r.cash || 0),
        bank: Number(r.bank || 0),
        netWorth: Number(r.net_worth || 0),
        net_worth: Number(r.net_worth || 0),
        title: r.title || 'عامل مبتدئ',
        jobId: r.job_id || 'worker',
        isAdmin: r.is_admin === true,
        facebookVerified: false
      }));

    const docPayload = {
      id: 'leaderboard',
      data: {
        updatedAt: updatedAt,
        nextUpdateAt: nextUpdateAt,
        cycleMinutes: 60,
        topPlayers: topPlayers
      },
      updated_at: now
    };

    await fetch(`${config.SUPABASE_URL}/rest/v1/globals`, {
      method: 'POST',
      headers: {
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates'
      },
      body: JSON.stringify(docPayload)
    });
  } catch (err) {
    // Non-fatal background maintenance
  }
}

updateAuthoritativeLeaderboardSnapshot();
const leaderboardUpdaterTimer = setInterval(updateAuthoritativeLeaderboardSnapshot, 10 * 60 * 1000);
if (leaderboardUpdaterTimer.unref) {
  leaderboardUpdaterTimer.unref();
}

async function start() {
  try {
    await app.listen({ port: config.PORT, host: config.HOST });
    console.log(`\n======================================================`);
    console.log(` Ras ALmal Authoritative Server Running on port ${config.PORT}`);
    console.log(` Health Check: http://localhost:${config.PORT}/health`);
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
