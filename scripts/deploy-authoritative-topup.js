const fs = require('fs');
const path = require('path');

// 1. Update server/src/routes/admin-routes.js
const adminRoutesPath = path.join(__dirname, '../server/src/routes/admin-routes.js');
let ar = fs.readFileSync(adminRoutesPath, 'utf8');

// Fix safeCompare to be case-insensitive
const oldSafeCompare = `function safeCompare(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}`;

const newSafeCompare = `function safeCompare(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const cleanA = String(a).trim().toLowerCase();
  const cleanB = String(b).trim().toLowerCase();
  const bufA = Buffer.from(cleanA);
  const bufB = Buffer.from(cleanB);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}`;

if (ar.includes(oldSafeCompare)) {
  ar = ar.replace(oldSafeCompare, newSafeCompare);
  console.log(' [1/3] Fixed safeCompare case sensitivity in admin-routes.js');
}

// Add /process-topup endpoint in admin-routes.js
const targetAnchor = ` fastify.post('/verify', {`;
const processTopupEndpoint = ` /**
   * POST /api/admin/process-topup
   * Authoritatively processes a top-up request on the server using service_role key.
   */
  fastify.post('/process-topup', {
    config: { rateLimit: adminRateLimit },
    preHandler: [requireAdminAuth]
  }, async (request, reply) => {
    const { requestId, action, reviewerNote = '' } = request.body || {};
    if (!requestId || !['approved', 'rejected'].includes(action)) {
      return reply.status(400).send({ error: 'Bad Request', message: 'requestId and valid action (approved/rejected) are required.' });
    }

    const serviceKey = config.SUPABASE_SERVICE_ROLE_KEY;
    const ts = Date.now();

    try {
      // 1. Fetch topup_requests from globals
      const gUrl = \`\${config.SUPABASE_URL}/rest/v1/globals?id=eq.topup_requests\`;
      const gRes = await fetch(gUrl, {
        headers: { 'apikey': serviceKey, 'Authorization': \`Bearer \${serviceKey}\` }
      });
      const gRows = await gRes.json();
      if (!gRows || !gRows[0] || !gRows[0].data || !Array.isArray(gRows[0].data.requests)) {
        return reply.status(404).send({ error: 'Not Found', message: 'سجل طلبات الشحن غير موجود.' });
      }

      const requests = gRows[0].data.requests;
      const reqIndex = requests.findIndex(r => r.id === requestId);
      if (reqIndex === -1) {
        return reply.status(404).send({ error: 'Not Found', message: 'طلب الشحن غير موجود.' });
      }

      const req = requests[reqIndex];
      if (req.status !== 'pending') {
        return reply.status(400).send({ error: 'Already Processed', message: \`تمت معالجة هذا الطلب مسبقاً (\${req.status === 'approved' ? 'مقبول' : 'مرفوض'}).\` });
      }

      const targetUser = req.username;

      if (action === 'approved') {
        // 2. Fetch player data
        const pUrl = \`\${config.SUPABASE_URL}/rest/v1/players?username=ilike.\${encodeURIComponent(targetUser)}&limit=1\`;
        const pRes = await fetch(pUrl, {
          headers: { 'apikey': serviceKey, 'Authorization': \`Bearer \${serviceKey}\` }
        });
        const pRows = await pRes.json();
        if (!pRows || pRows.length === 0) {
          return reply.status(404).send({ error: 'Player Not Found', message: \`حساب اللاعب "\${targetUser}" غير موجود بقاعدة البيانات.\` });
        }

        const playerDoc = pRows[0];
        const pState = (typeof playerDoc.state === 'object' && playerDoc.state) ? playerDoc.state : {};
        const rewards = req.rewards || {};
        
        const addedCash = Number(rewards.cash) || 0;
        const addedBank = Number(rewards.bank) || 0;
        const addedXP = Number(rewards.xp) || 0;
        const addedGold = Number(rewards.gold) || 0;
        const customBadge = rewards.customBadge || '';
        const badgeTitle = rewards.badgeTitle || req.packageName;

        const updatedCash = (Number(playerDoc.cash) || 0) + addedCash;
        const updatedBank = (Number(playerDoc.bank) || 0) + addedBank;
        const updatedXP = (Number(playerDoc.xp) || 0) + addedXP;
        const updatedGold = (Number(playerDoc.gold) || 0) + addedGold;
        const updatedNetworth = updatedCash + updatedBank;

        pState.cash = updatedCash;
        pState.bank = updatedBank;
        pState.xp = updatedXP;
        pState.gold = updatedGold;
        pState.netWorth = updatedNetworth;

        if (customBadge) {
          pState.customBadge = customBadge;
          pState.badgeTitle = badgeTitle;
        }

        // Handle VIP glow packages
        if (req.packageId === 'pkg_vip_chat_glow') {
          pState.chatGlow = 'gold_neon';
          pState.hasChatGlow = true;
          pState.activePackage = 'pkg_vip_chat_glow';
        } else if (req.packageId === 'pkg_vip_royal_ultimate') {
          pState.chatGlow = 'cyber_rainbow';
          pState.hasChatGlow = true;
          pState.isVerified = true;
          pState.vipVerified = true;
          pState.activePackage = 'pkg_vip_royal_ultimate';
        } else if (req.packageId === 'pkg_vip_crimson_flame') {
          pState.chatGlow = 'crimson_flame';
          pState.hasChatGlow = true;
          pState.activePackage = 'pkg_vip_crimson_flame';
        } else if (req.packageId === 'pkg_vip_svip_blue_flame') {
          pState.chatGlow = 'blue_flame';
          pState.hasChatGlow = true;
          pState.customBadge = 'SVIP';
          pState.badgeTitle = 'SVIP';
          pState.activePackage = 'pkg_vip_svip_blue_flame';
        } else if (req.packageId === 'pkg_vip_verified') {
          pState.isVerified = true;
          pState.vipVerified = true;
          pState.activePackage = 'pkg_vip_verified';
        }

        pState.hasPurchasedTopup = true;
        pState.purchasedTopups = (pState.purchasedTopups || 0) + 1;
        pState.adminModifiedTimestamp = ts;

        // Update player row in Supabase
        const updatePlayerUrl = \`\${config.SUPABASE_URL}/rest/v1/players?username=ilike.\${encodeURIComponent(targetUser)}\`;
        await fetch(updatePlayerUrl, {
          method: 'PATCH',
          headers: {
            'apikey': serviceKey,
            'Authorization': \`Bearer \${serviceKey}\`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          },
          body: JSON.stringify({
            cash: updatedCash,
            bank: updatedBank,
            gold: updatedGold,
            xp: updatedXP,
            net_worth: updatedNetworth,
            state: pState,
            admin_modified_timestamp: ts
          })
        });

        // Update in-memory session if player is active
        if (sessionManager) {
          const session = sessionManager.getSession(targetUser);
          if (session) {
            session.state.cash = updatedCash;
            session.state.bank = updatedBank;
            session.state.gold = updatedGold;
            session.state.xp = updatedXP;
            session.state.netWorth = updatedNetworth;
            session.state.adminModifiedTimestamp = ts;
            if (customBadge) {
              session.state.customBadge = customBadge;
              session.state.badgeTitle = badgeTitle;
            }
            session.dirty = false;
          }
        }

        // Send topup receipt mail
        const topupReceiptData = {
          packageId: req.packageId,
          packageName: req.packageName,
          price: req.price,
          cash: addedCash,
          bank: addedBank,
          gold: addedGold,
          xp: addedXP,
          newCash: updatedCash,
          newBank: updatedBank,
          newGold: updatedGold,
          newXp: updatedXP,
          newWorth: updatedNetworth,
          isPreApplied: true,
          customBadge: customBadge,
          badgeTitle: badgeTitle,
          items: rewards.items || {},
          status: 'approved',
          date: ts,
          receiptNumber: req.receiptNumber || '',
          senderPhoneOrName: req.senderPhoneOrName || '',
          reviewerNote: reviewerNote || 'تم الاعتماد والشحن بنجاح بواسطة الإدارة'
        };

        await fetch(\`\${config.SUPABASE_URL}/rest/v1/mailbox\`, {
          method: 'POST',
          headers: {
            'apikey': serviceKey,
            'Authorization': \`Bearer \${serviceKey}\`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          },
          body: JSON.stringify({
            sender: 'إدارة اللعبة (Financial Team)',
            recipient: targetUser,
            type: 'topup_receipt',
            payload: topupReceiptData,
            status: 'unread',
            created_at: ts
          })
        });

        if (addedCash > 0 || addedBank > 0) {
          await fetch(\`\${config.SUPABASE_URL}/rest/v1/mailbox\`, {
            method: 'POST',
            headers: {
              'apikey': serviceKey,
              'Authorization': \`Bearer \${serviceKey}\`,
              'Content-Type': 'application/json',
              'Prefer': 'return=representation'
            },
            body: JSON.stringify({
              sender: 'إدارة اللعبة (Financial Team)',
              recipient: targetUser,
              type: 'admin_balance_grant',
              payload: {
                addedCash,
                addedBank,
                totalAmount: addedCash + addedBank,
                target: targetUser,
                newCash: updatedCash,
                newBank: updatedBank,
                newXp: updatedXP,
                isPreApplied: true,
                timestamp: ts,
                note: \`شحن فوري معتمد: [\${req.packageName}]\`
              },
              status: 'unread',
              created_at: ts
            })
          });
        }

        if (addedGold > 0) {
          await fetch(\`\${config.SUPABASE_URL}/rest/v1/mailbox\`, {
            method: 'POST',
            headers: {
              'apikey': serviceKey,
              'Authorization': \`Bearer \${serviceKey}\`,
              'Content-Type': 'application/json',
              'Prefer': 'return=representation'
            },
            body: JSON.stringify({
              sender: 'إدارة اللعبة (Financial Team)',
              recipient: targetUser,
              type: 'admin_gold_grant',
              payload: {
                addedGold,
                newGold: updatedGold,
                isPreApplied: true,
                timestamp: ts,
                note: \`شحن سبائك الذهب: [\${req.packageName}]\`
              },
              status: 'unread',
              created_at: ts
            })
          });
        }

        req.status = 'approved';
        req.reviewedAt = ts;
        req.reviewerNote = reviewerNote || 'تم الاعتماد والشحن بنجاح بواسطة الإدارة';
      } else {
        req.status = 'rejected';
        req.reviewedAt = ts;
        req.reviewerNote = reviewerNote || 'تم رفض الطلب لعدم تطابق بيانات التحويل';

        await fetch(\`\${config.SUPABASE_URL}/rest/v1/mailbox\`, {
          method: 'POST',
          headers: {
            'apikey': serviceKey,
            'Authorization': \`Bearer \${serviceKey}\`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          },
          body: JSON.stringify({
            sender: 'إدارة اللعبة (Financial Team)',
            recipient: targetUser,
            type: 'topup_receipt',
            payload: {
              packageId: req.packageId,
              packageName: req.packageName,
              price: req.price,
              status: 'rejected',
              date: ts,
              receiptNumber: req.receiptNumber || '',
              senderPhoneOrName: req.senderPhoneOrName || '',
              reviewerNote: req.reviewerNote
            },
            status: 'unread',
            created_at: ts
          })
        });
      }

      // Update globals.topup_requests
      await fetch(\`\${config.SUPABASE_URL}/rest/v1/globals?id=eq.topup_requests\`, {
        method: 'PATCH',
        headers: {
          'apikey': serviceKey,
          'Authorization': \`Bearer \${serviceKey}\`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          data: { requests, updatedAt: ts },
          updated_at: ts
        })
      });

      return reply.send({
        success: true,
        request: req
      });
    } catch (err) {
      request.log.error(err, '[Admin Process Topup Error]');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: err.message
      });
    }
  });

  fastify.post('/verify', {`;

if (ar.includes(targetAnchor) && !ar.includes('/process-topup')) {
  ar = ar.replace(targetAnchor, processTopupEndpoint);
  console.log(' [2/3] Added POST /api/admin/process-topup to admin-routes.js');
}

fs.writeFileSync(adminRoutesPath, ar, 'utf8');

// 2. Update db.js processTopupRequest to call /api/admin/process-topup first
const dbPath = path.join(__dirname, '../db.js');
let db = fs.readFileSync(dbPath, 'utf8');

const oldProcessTopupFunc = ` async function processTopupRequest(requestId, action, reviewerNote ='') {
    const ts = Date.now();`;

const newProcessTopupFunc = ` async function processTopupRequest(requestId, action, reviewerNote ='') {
    const ts = Date.now();
    const adminToken = (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('rasalmal_admin_auth_token')) ||
                       (typeof localStorage !== 'undefined' && localStorage.getItem('rasalmal_admin_auth_token'));

    // Try authoritative server endpoint first
    if (adminToken) {
      try {
        const res = await fetch('/api/admin/process-topup', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-admin-token': adminToken
          },
          body: JSON.stringify({ requestId, action, reviewerNote })
        });
        if (res.ok) {
          const data = await res.json();
          if (data && data.success && data.request) {
            console.log('[DB] Authoritative topup process succeeded via /api/admin/process-topup');
            return data.request;
          }
        } else {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.message || \`Server process topup failed: HTTP \${res.status}\`);
        }
      } catch (srvErr) {
        if (!srvErr.message.includes('404') && !srvErr.message.includes('Failed to fetch')) {
          throw srvErr;
        }
        console.warn('[DB] Fallback from /api/admin/process-topup:', srvErr.message);
      }
    }`;

if (db.includes(oldProcessTopupFunc)) {
  db = db.replace(oldProcessTopupFunc, newProcessTopupFunc);
  console.log(' [3/3] Integrated authoritative /api/admin/process-topup call into db.js processTopupRequest');
}

fs.writeFileSync(dbPath, db, 'utf8');
console.log(' Server-side Authoritative Topup Approval deployed successfully!');
