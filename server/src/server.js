/**
 * Ras ALmal Tycoon — Authoritative Backend Server Entry Point
 * Framework: Fastify (Ultra-low latency, <2ms event execution)
 */

const Fastify = require('fastify');
const config = require('./config/env');
const { sanitizePlayerState } = require('./engine/state-sanitizer');
const fs = require('fs');
const path = require('path');
const dbService = require('./services/db-service');
const sessionManager = require('./services/session-manager');

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
  hook: 'preHandler', // Runs after body parser so request.body.username is available
  max: 600, // 600 requests per minute per user/IP (generous 10 requests/sec baseline)
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
    autosaveIntervalSeconds: config.AUTOSAVE_INTERVAL_MS / 1000
  };
});

// Cached live globals reader (2s TTL) for system-status & globals endpoints
let _cachedSystemGlobals = null;
let _cachedSystemGlobalsAt = 0;
const SYSTEM_GLOBALS_TTL_MS = 2000;

app.decorate('invalidateSystemGlobalsCache', () => {
  _cachedSystemGlobalsAt = 0;
});

async function getLiveSystemGlobals() {
  const now = Date.now();
  if (_cachedSystemGlobals && (now - _cachedSystemGlobalsAt) < SYSTEM_GLOBALS_TTL_MS) {
    return _cachedSystemGlobals;
  }

  let dynamicReloadTs = 0;
  try {
    const vPath = path.join(__dirname, '../../version.json');
    if (fs.existsSync(vPath)) {
      const v = JSON.parse(fs.readFileSync(vPath, 'utf8'));
      dynamicReloadTs = Number(v.timestamp) || 0;
    }
  } catch (_) {}

  const result = {
    force_reload: {
      timestamp: dynamicReloadTs || now
    },
    maintenance: {
      active: Boolean(config.MAINTENANCE_MODE),
      enabled: Boolean(config.MAINTENANCE_MODE),
      message: 'اللعبة تحت الصيانة حالياً. سنعود قريباً إن شاء الله 🛠️'
    },
    standby_mode: {
      active: false,
      enabled: false,
      message: 'يجري حالياً التحضير النهائي ووضع الاستعداد قبل فتح الخوادم رسمياً لجميع اللاعبين.',
      facebook_url: 'https://www.facebook.com'
    }
  };

  if (process.env.NODE_ENV !== 'test') {
    try {
      const res = await dbService.resilientFetch('/rest/v1/globals?id=in.(force_reload,maintenance,standby_mode)&select=id,data');
      if (res && res.ok) {
        const rows = await res.json();
        if (Array.isArray(rows)) {
          for (const row of rows) {
            if (!row || !row.id || !row.data) continue;
            if (row.id === 'force_reload') {
              const dbTs = Number(row.data.timestamp) || 0;
              result.force_reload = {
                ...row.data,
                timestamp: Math.max(dynamicReloadTs, dbTs) || now
              };
            } else if (row.id === 'maintenance') {
              const isMaint = Boolean(config.MAINTENANCE_MODE || row.data.active || row.data.enabled);
              result.maintenance = {
                ...row.data,
                active: isMaint,
                enabled: isMaint,
                message: row.data.message || result.maintenance.message
              };
            } else if (row.id === 'standby_mode') {
              const isStandby = Boolean(row.data.active || row.data.enabled);
              result.standby_mode = {
                ...row.data,
                active: isStandby,
                enabled: isStandby,
                message: row.data.message || result.standby_mode.message,
                facebook_url: row.data.facebook_url || result.standby_mode.facebook_url
              };
            }
          }
        }
      }
    } catch (_) {}
  }

  _cachedSystemGlobals = result;
  _cachedSystemGlobalsAt = now;
  return result;
}

// GET /api/public/system-status (Instant unified status check for client watchdogs)
app.get('/api/public/system-status', async (request, reply) => {
  const sys = await getLiveSystemGlobals();
  return {
    success: true,
    force_reload: sys.force_reload,
    maintenance: sys.maintenance,
    standby_mode: sys.standby_mode,
    serverTime: Date.now()
  };
});

// GET /api/public/globals (Serves public global configurations from cache/RAM)
app.get('/api/public/globals', async (request, reply) => {
  const { id } = request.query || {};
  const sys = await getLiveSystemGlobals();

  const globalsMap = {
    force_reload: sys.force_reload,
    maintenance: sys.maintenance,
    standby_mode: sys.standby_mode,
    airdrop: { active: false, timestamp: Date.now() },
    market_event: { active: false, timestamp: Date.now() },
    taxConfig: { rate: 0.05 },
    serverConfig: { maxCps: config.MAX_CPS }
  };

  if (id && globalsMap[id]) {
    return { success: true, id, data: globalsMap[id] };
  }
  return { success: true, data: globalsMap };
});

// GET /api/public/read (Server-side resilient proxy for read-only database queries)
app.get('/api/public/read', async (request, reply) => {
  const queryPath = (request.query && (request.query.path || request.query.endpoint)) || '';
  if (!queryPath || typeof queryPath !== 'string') {
    return reply.code(400).send({ error: 'Missing path parameter' });
  }

  const cleanPath = queryPath.replace(/^\/+/, '');
  // Security whitelist: only allow safe public tables
  if (!cleanPath.startsWith('globals') && !cleanPath.startsWith('players') && !cleanPath.startsWith('mailbox') && !cleanPath.startsWith('corporations')) {
    return reply.code(403).send({ error: 'Disallowed read target' });
  }

  // Attempt database query via server-authenticated dbService
  try {
    const res = await dbService.resilientFetch(`/rest/v1/${cleanPath}`);
    if (res && res.ok) {
      const data = await res.json();
      return reply.send(data);
    }
  } catch (_) {}

  // Resilient graceful fallback so client polling never receives 401 or throws
  let dynamicReloadTs = Date.now();
  try {
    const vPath = path.join(__dirname, '../../version.json');
    if (fs.existsSync(vPath)) {
      const v = JSON.parse(fs.readFileSync(vPath, 'utf8'));
      dynamicReloadTs = Number(v.timestamp) || dynamicReloadTs;
    }
  } catch (_) {}

  if (cleanPath.includes('globals')) {
    if (cleanPath.includes('force_reload')) {
      return reply.send([{ id: 'force_reload', data: { timestamp: dynamicReloadTs } }]);
    }
    if (cleanPath.includes('maintenance')) {
      return reply.send([{ id: 'maintenance', data: { active: Boolean(config.MAINTENANCE_MODE), enabled: Boolean(config.MAINTENANCE_MODE), message: 'اللعبة تحت الصيانة حالياً.' } }]);
    }
    if (cleanPath.includes('standby_mode')) {
      return reply.send([{ id: 'standby_mode', data: { active: false } }]);
    }
    if (cleanPath.includes('chat_feed')) {
      return reply.send([{ id: 'chat_feed', data: { messages: [] }, updated_at: Date.now() }]);
    }
    if (cleanPath.includes('broadcast')) {
      return reply.send([{ id: 'broadcast', data: { active: false }, updated_at: Date.now() }]);
    }
    if (cleanPath.includes('airdrop')) {
      return reply.send([{ id: 'airdrop', data: { active: false } }]);
    }
    if (cleanPath.includes('market_event')) {
      return reply.send([{ id: 'market_event', data: { active: false } }]);
    }
    if (cleanPath.includes('taxConfig')) {
      return reply.send([{ id: 'taxConfig', data: { rate: 0.05 } }]);
    }
    if (cleanPath.includes('serverConfig')) {
      return reply.send([{ id: 'serverConfig', data: { maxCps: config.MAX_CPS } }]);
    }
    if (cleanPath.includes('topup_payment_settings')) {
      return reply.send([{ id: 'topup_payment_settings', data: {} }]);
    }
    if (cleanPath.includes('topup_requests')) {
      return reply.send([{ id: 'topup_requests', data: {} }]);
    }
  }

  if (cleanPath.startsWith('players')) {
    const userMatch = cleanPath.match(/username=(?:ilike|eq)\.([^&]+)/i);
    if (userMatch) {
      const u = decodeURIComponent(userMatch[1]).trim();
      const session = sessionManager.getSession(u);
      if (session && session.state) {
        return reply.send([{
          username: u,
          cash: Number(session.state.cash || 0),
          bank: Number(session.state.bank || 0),
          dirty_cash: Number(session.state.dirtyCash || 0),
          net_worth: Number(session.state.netWorth || 0),
          xp: Number(session.state.xp || 0),
          title: session.state.title || 'عامل مبتدئ',
          job_id: session.state.jobId || 'worker',
          is_admin: Boolean(session.isAdmin || session.state.isAdmin),
          is_banned: Boolean(session.isBanned || session.state.isBanned),
          jail_timer: Number(session.jailTimer || session.state.jailTimer || 0),
          admin_modified_timestamp: 0,
          state: session.state
        }]);
      }
    }
    return reply.send([]);
  }

  return reply.send([]);
});

// ─── Maintenance Mode Endpoints ───────────────────────────────────────────────

// GET /api/maintenance — يرجع حالة الصيانة (بدون كشف الكود أبداً)
app.get('/api/maintenance', async (request, reply) => {
  return {
    maintenance: config.MAINTENANCE_MODE,
    message: 'اللعبة تحت الصيانة حالياً. سنعود قريباً إن شاء الله 🛠️'
  };
});

// POST /api/maintenance/verify — يتحقق من كود التيستر بشكل آمن
app.post('/api/maintenance/verify', {
  config: { rateLimit: { max: 10, timeWindow: 60 * 1000 } } // 10 محاولات فقط كل دقيقة
}, async (request, reply) => {
  const { code } = request.body || {};
  if (!code || typeof code !== 'string') {
    return reply.status(400).send({ valid: false, error: 'كود غير صالح' });
  }

  // لو الصيانة مش مفعلة أصلاً — الكود مش مطلوب
  if (!config.MAINTENANCE_MODE) {
    return { valid: true };
  }

  // timingSafeEqual لمنع timing attacks
  const crypto = require('crypto');
  const expected = config.TESTER_CODE;
  if (!expected) {
    return reply.status(503).send({ valid: false, error: 'لا يوجد كود تيستر مضبوط على السيرفر' });
  }

  const inputBuf = Buffer.from(code.trim());
  const expectedBuf = Buffer.from(expected.trim());

  const isValid = inputBuf.length === expectedBuf.length &&
    crypto.timingSafeEqual(inputBuf, expectedBuf);

  if (!isValid) {
    return reply.status(401).send({ valid: false, error: 'الكود غير صحيح' });
  }

  return { valid: true };
});


// Register Action, Airport, Auction, Session, Admin, Auth OTP, and Push API routes
app.register(require('./routes/session-routes'));
app.register(require('./routes/action-routes'));
app.register(require('./routes/airport-routes'));
app.register(require('./routes/space-routes'));
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

    const dbBase = config.SUPABASE_INTERNAL_URL || 'http://127.0.0.1:8000';
    const playersRes = await fetch(`${dbBase}/rest/v1/players?select=username,cash,bank,net_worth,title,job_id,is_admin,is_banned&is_banned=eq.false&username=not.in.(newu,khaled,Khaled,خالد,rasalmal,rasalmal1,rasalmal2,Rasalmal,Rasalmal1,Rasalmal2,asd,Asd,ASD,7ablas,7Ablas,osos,Osos,OSOS,tito2761,Tito2761,TITO2761)&order=net_worth.desc&limit=35`, {
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

    await fetch(`${dbBase}/rest/v1/globals`, {
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
