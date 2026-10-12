# Implementation Plan: Permanent Fix for Disappearing Money and State Rollbacks

## Overview
A persistent bug in Ras ALmal Tycoon causes earned money (cash or bank) to appear in the UI and then disappear within seconds. A comprehensive code audit revealed the exact technical mechanisms behind this behavior:
1. **The Strict Operator Bug (`ui.js:8693`)**: In `checkLiveUserStatus`, `freshAdminTs >= currentAdminTs` (introduced in commit `09392bc`) triggers on every 25-second poll (and on every transfer check), overwriting client cash/bank with stale database values even when no admin action occurred.
2. **Asymmetric Server-Authoritative Bank Lockdown (`session-manager.js:271-305`)**: The server's `updateSessionState` only accepts bank changes if `cashDiff < 0` (zero-sum deposit). Any profit routed directly to `bank` (passive income, jobs, dividends, farm contracts) is discarded on the server, and the server's old bank balance is returned in `authoritativeState.bank`, overwriting the client's balance.
3. **Broken Income Vault Reconciliation (`action-routes.js:1889` & `server-client-bridge.js:1130`)**: `/api/action/claim-income` credits money to `state.bank` on the server, but omits `bank` from the JSON response, while `server-client-bridge.js` only updates `cash`.
4. **15-Second Bank Lockout (`session-manager.js:228-234`)**: `hasRecentBankAction` marks all incoming syncs as `isClientStale` for 15 seconds after any bank operation, dropping all player earnings during that window.
5. **Direct Supabase RLS Fallback Reversion (`db.js:2466`)**: Direct PATCH calls from the browser return `[]` due to RLS revocation, which triggers an automatic `getPlayerState` pull that overwrites in-memory state.

---

## Architecture Decisions
- **Strict Admin Action Timestamp (`>`)**: Only an admin timestamp strictly greater than `currentAdminTs` represents a genuine external admin balance modification. Identical timestamps must never overwrite live gameplay balances.
- **Bi-directional Cash & Bank Sync**: The server `session-manager.js` must accept legitimate incoming bank growth up to authorized velocity limits, mirroring cash processing.
- **Surgical Server Action Responses**: All server actions (especially `claim-income`) must return both authoritative `cash` and `bank` balances, and `server-client-bridge.js` must reconcile both.
- **Isolate Bank Cooldowns**: `lastServerBankActionAt` must only protect bank withdrawal/deposit race conditions, never suppressing non-bank game profits.

---

## Task List

### Phase 1: Client & Server State Synchronization Alignment
- [ ] **Task 1**: Fix operator in [ui.js](file:///c:/Users/khale/.gemini/antigravity-ide/scratch/foolos-man-tycoon/ui.js#L8693) from `>=` to `>`, preventing periodic polling rollbacks.
- [ ] **Task 2**: Update [session-manager.js](file:///c:/Users/khale/.gemini/antigravity-ide/scratch/foolos-man-tycoon/server/src/services/session-manager.js#L271-L305) to process legitimate bank profit increments during `syncState`.
- [ ] **Task 3**: Fix [action-routes.js](file:///c:/Users/khale/.gemini/antigravity-ide/scratch/foolos-man-tycoon/server/src/routes/action-routes.js#L1889) and [server-client-bridge.js](file:///c:/Users/khale/.gemini/antigravity-ide/scratch/foolos-man-tycoon/server-client-bridge.js#L1130) to return and reconcile `bank` on `claim-income`.

### Checkpoint: Core Sync Integrity
- [ ] Test client sync state with simulated bank profits and verify no rollbacks occur.

### Phase 2: Lockout Protection & Direct DB Fallback Guard
- [ ] **Task 4**: Narrow the scope of `hasRecentBankAction` in [session-manager.js](file:///c:/Users/khale/.gemini/antigravity-ide/scratch/foolos-man-tycoon/server/src/services/session-manager.js#L228) so regular income is not blocked.
- [ ] **Task 5**: Shield [db.js](file:///c:/Users/khale/.gemini/antigravity-ide/scratch/foolos-man-tycoon/db.js#L2466) against destructive `getPlayerState` overwrites when direct Supabase updates return empty rows under RLS.

### Phase 3: Bundle Rebuild & Test Verification
- [ ] **Task 6**: Rebuild `core.bundle.js` using `scripts/build-bundle.js` and verify all tests pass (`server/tests/`).

### Checkpoint: Complete
- [ ] Run test suite (`npm test` in server).
- [ ] Validate end-to-end profit retention.

---

## Risks and Mitigations
| Risk | Impact | Mitigation |
|------|--------|------------|
| Accepting bank increments opens injection vector | High | Apply the same velocity limit formula used for cash (`maxAllowedJump`) to bank increases. |
| Admin balance grants not applying live | High | Retain `freshAdminTs > currentAdminTs` logic so genuine admin modifications apply immediately. |
| Stale browser cache reintroducing old bundle | Medium | Auto-bump version in `version.json` via `build-bundle.js` and update Service Worker cache name. |
