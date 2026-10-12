# Task List: Permanent Fix for Disappearing Money and State Rollbacks

## Phase 1: Client & Server State Synchronization Alignment

### Task 1: Fix `>=` operator bug in `checkLiveUserStatus` ([ui.js](file:///c:/Users/khale/.gemini/antigravity-ide/scratch/foolos-man-tycoon/ui.js))
**Description:** Replace `freshAdminTs >= currentAdminTs` with `freshAdminTs > currentAdminTs` at line 8693 of `ui.js`. When timestamps are equal, no new admin action has occurred, and the 25-second poll must not overwrite live player earnings.
**Acceptance criteria:**
- [x] `checkLiveUserStatus` only executes balance overrides when `freshAdminTs > currentAdminTs`.
- [x] Regular gameplay earnings are untouched by the 25s polling loop.
**Verification:**
- [x] Manual inspection of line 8693.
- [x] Run client script verifying timestamps equality does not trigger state overwriting.
**Dependencies:** None
**Files likely touched:**
- `ui.js`
**Estimated scope:** XS (1 file)

---

### Task 2: Accept legitimate bank balance increments in `session-manager.js`
**Description:** Update `updateSessionState` in [session-manager.js](file:///c:/Users/khale/.gemini/antigravity-ide/scratch/foolos-man-tycoon/server/src/services/session-manager.js) to accept legitimate increases in `incomingBank` (from passive ticks, jobs, farm contracts, investments) up to the standard velocity threshold, instead of ignoring `incomingBank` and forcing the old bank balance back to the client.
**Acceptance criteria:**
- [x] When `bankDiff > 0` and it is not a cash withdrawal, `s.bank` is credited up to `maxAllowedJump`.
- [x] `authoritativeState.bank` returned to client reflects the credited amount instead of rolling back.
**Verification:**
- [x] Run `node server/tests/bank_precision_withdraw.test.js`.
- [x] Add unit test verifying `syncState({ bank: oldBank + 5000 })` persists.
**Dependencies:** None
**Files likely touched:**
- `server/src/services/session-manager.js`
**Estimated scope:** S (1 file)

---

### Task 3: Reconcile bank balance in `claim-income` route & client bridge
**Description:** Modify `/api/action/claim-income` in [action-routes.js](file:///c:/Users/khale/.gemini/antigravity-ide/scratch/foolos-man-tycoon/server/src/routes/action-routes.js) to return `bank: session.state.bank`, and update `ServerBridge.claimIncome` in [server-client-bridge.js](file:///c:/Users/khale/.gemini/antigravity-ide/scratch/foolos-man-tycoon/server-client-bridge.js) to reconcile `s.bank = res.bank`.
**Acceptance criteria:**
- [x] Response of `/api/action/claim-income` includes `bank`.
- [x] Client `ServerBridge.claimIncome` updates `s.bank` and invokes UI renderers.
**Verification:**
- [x] Run claim-income server test.
**Dependencies:** Task 2
**Files likely touched:**
- `server/src/routes/action-routes.js`
- `server-client-bridge.js`
**Estimated scope:** S (2 files)

---

## Checkpoint: Foundation Sync Integrity
- [x] Run server tests
- [x] Ensure bank actions and income claiming retain balances across sync cycles

---

## Phase 2: Lockout Protection & Direct DB Fallback Guard

### Task 4: Refine `hasRecentBankAction` lockout in `session-manager.js`
**Description:** Isolate `hasRecentBankAction` in [session-manager.js](file:///c:/Users/khale/.gemini/antigravity-ide/scratch/foolos-man-tycoon/server/src/services/session-manager.js) so it only protects the bank balance from stale withdrawal race conditions, without discarding unrelated cash earnings gained during the 15-second window.
**Acceptance criteria:**
- [x] Cash increases during the 15-second window after a bank action are accepted.
- [x] Stale bank withdrawals are still protected from double-spend.
**Verification:**
- [x] Run bank withdrawal tests.
**Dependencies:** Task 2
**Files likely touched:**
- `server/src/services/session-manager.js`
**Estimated scope:** S (1 file)

---

### Task 5: Guard against destructive RLS fallback rollbacks in `db.js`
**Description:** In `db.js` `_pushStateToCloud` line 2466, avoid calling `getPlayerState` and overwriting live memory state when a direct Supabase PATCH returns `[]` solely because RLS revoked anon updates.
**Acceptance criteria:**
- [x] If `ServerBridge` is online, direct fallback is completely bypassed.
- [x] If direct fallback runs and returns `[]`, it logs a warning without overwriting client state.
**Verification:**
- [x] Code inspection and test sync execution.
**Dependencies:** None
**Files likely touched:**
- `db.js`
**Estimated scope:** S (1 file)

---

## Phase 3: Bundle Rebuild & Test Verification

### Task 6: Rebuild production bundle and verify all test suites
**Description:** Execute `node scripts/build-bundle.js` to compile all fixes into `core.bundle.js`, sync version constants across `index.html`, `version.json`, and `sw.js`, and run the comprehensive test suite (`server/tests/`).
**Acceptance criteria:**
- [x] `core.bundle.js` successfully builds with minification.
- [x] All test scripts pass cleanly without errors.
**Verification:**
- [x] `node scripts/build-bundle.js` exits 0.
- [x] `node server/tests/farm.test.js` exits 0.
- [x] `node server/tests/claim_collections.test.js` exits 0.
**Dependencies:** Tasks 1-5
**Files likely touched:**
- `core.bundle.js`
- `version.json`
- `index.html`
- `sw.js`
**Estimated scope:** M (4 files)

---

## Checkpoint: Final Resolution
- [x] All tasks completed
- [x] Production bundle up to date
- [x] Full end-to-end verification passing
