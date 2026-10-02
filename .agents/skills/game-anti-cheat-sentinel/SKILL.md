---
name: game-anti-cheat-sentinel
description: Game-specific cybersecurity, anti-cheat detection, multi-accounting forensics, browser console injection defense, and wealth spike validation for Ras ALmal Tycoon. Use when auditing player accounts, detecting bot auto-clickers, clamping falsified currencies, tracking device fingerprint syndicates, or enforcing game integrity policies.
license: Apache-2.0
metadata:
  author: Ras ALmal Security Core
  version: 1.0.0
---

# Game Anti-Cheat & Integrity Sentinel (درع الحماية ومكافحة الغش والتلاعب)

Comprehensive guide and operational workflows for auditing, detecting, and mitigating game exploits, multi-accounting farms, console injections, and illegitimate wealth spikes in Ras ALmal Tycoon.

---

## 1. Threat Vectors & Defense Mechanisms

### A. Client-Side State Injection (DevTools Console / Tampermonkey)
- **Threat:** Players open browser DevTools console or use user-scripts to write absurd values directly to `GameEngine.state.cash` or `GameEngine.state.bank`.
- **Mitigation Workflow:**
  1. Enforce strict sanity caps in `_sanitizePayloadBeforeCloudPush` in `db.js`:
     - Max currency cap (`MAX_ALLOWED_CURRENCY = 100,000,000,000,000`).
     - If client pushes infinite, NaN, or values above cap, clamp instantly to default baseline (`500,000`) and set `underSuspicion = true`.
  2. Protect sensitive fields from client override (`is_admin`, `is_banned`).
  3. Validate stock shares against `STOCK_MAX_CAPS`.

### B. Multi-Accounting & Device Fingerprint Syndicates
- **Threat:** Players register multiple dummy accounts on the same physical device to farm welcome bonuses, starter packages, and transfer funds to a single main account.
- **Mitigation Workflow:**
  1. Check device clustering using `DeviceFingerprint.getFingerprint()`.
  2. Query `players` where `state->>'initial_device'` or `state->'known_devices'` matches the target.
  3. Detect multi-accounting farms (>2 accounts per device) and check if any account in the cluster is banned.
  4. Block creation of new accounts from blacklisted devices listed in `globals -> banned_devices`.

### C. PIN Hash Forensics (Shared Passcode Clusters)
- **Threat:** Malicious players create new disposable accounts using their habitual PIN code.
- **Mitigation Workflow:**
  1. Hash comparison: query `players` matching `pin = target_pin_hash`.
  2. Identify all alt accounts belonging to the same individual.
  3. Perform batch ban / freeze if the cluster has previous ban records.

### D. Money Funneling & Wire Transfer Laundering
- **Threat:** Dummy accounts funneling cash into main accounts via bank wire transfers.
- **Mitigation Workflow:**
  1. Query `transfers` table for cumulative volume: `SELECT sender, recipient, SUM(amount) FROM transfers GROUP BY sender, recipient`.
  2. If an account receives millions from low-XP or freshly registered accounts (<24h old), flag both accounts for investigation.

---

## 2. Standard Forensic Audit Procedure

When asked to audit a player or investigate cheating:
1. **Load Account Profile:**
   - Check `created_at`, `last_seen`, `net_worth`, `cash`, `bank`, `gold`.
   - Check `xp`, `jobId`, `businesses`, `assets`, `stocks`.
2. **Inspect Activity Logs:**
   - A legitimate account has rich `activityLog` and `transactions` arrays.
   - An empty `activityLog: []` paired with massive wealth is a **100% confirmation of client-side injection**.
3. **Trace Cross-Account Links:**
   - Compare device fingerprint (`initial_device`, `known_devices`).
   - Compare hashed PIN (`pin`).
   - Query `transfers` for inbound/outbound cash flows.
   - Check `mailbox` for suspicious coordination messages.
4. **Enforce Remediation:**
   - Set `is_banned: true`, zero out `cash`, `bank`, `dirty_cash`, `net_worth`.
   - Add hardware fingerprint to `banned_devices` in `globals`.
   - Record incident in `security_audit_logs`.
   - Broadcast server-wide `force_reload` to purge client caches.
