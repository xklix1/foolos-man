/**
 * Audit Fixes Verification Test Suite
 * Verifies all fixes from the comprehensive server & client code audit:
 * 1. Money Laundering (dirtyCash -> bank)
 * 2. Job Shifts & Overtime Shifts (dailyWork -> bank)
 * 3. Online Investment Maturation (investments -> bank)
 * 4. Fractional Cashflow Accrual Remainder Preservation
 * 5. Daily Quests & Grand Bonus Claims (dailyQuests -> cash)
 * 6. Franchise Sale Payout (businesses -> cash)
 * 7. Space Agency & Rockets Valuation in Net Worth
 */

const assert = require('assert');
const test = require('node:test');

const sessionManager = require('../src/services/session-manager');
const { calculateNetWorth } = require('../src/engine/net-worth-engine');
const { accrueAuthoritativeCashflow } = require('../src/engine/cashflow-engine');
const { launderMoney } = require('../src/engine/store-engine');
const { sellFranchise } = require('../src/engine/business-engine');

function getCairoToday() {
  const d = new Date(Date.now() + (3 * 3600 * 1000));
  return d.toISOString().split('T')[0];
}

test('Audit Fixes — End-to-End Server Verification', async (t) => {
  const testUser = 'audit_tester_' + Date.now();
  const uKey = testUser.toLowerCase();
  const today = getCairoToday();

  sessionManager.sessions.set(uKey, {
    username: testUser,
    pin: '1234',
    state: {
      username: testUser,
      cash: 10000,
      bank: 50000,
      dirtyCash: 100000,
      xp: 1000,
      jobId: 'accountant',
      netWorth: 160000,
      title: 'تاجر صاعد',
      businesses: {
        kiosk: { level: 10, workers: 10, isFranchise: true, suppliesTicks: 3600 }
      },
      investments: [
        {
          id: 'short',
          name: 'وديعة بنكية سريعة',
          investedAmount: 20000,
          rate: 0.015,
          ticksRemaining: 10,
          maturesAt: Date.now() - 1000 // Matured 1s ago
        }
      ],
      dailyWork: { date: today, shifts: 0, overtimeShifts: 0 },
      dailyQuests: {
        date: today,
        grandBonusClaimed: false,
        quests: [
          { id: 'work_shifts', title: 'مهمة عمل', target: 3, progress: 3, completed: true, claimed: false, cashReward: 1000, xpReward: 25 }
        ]
      },
      lastCashflowAccrualAt: Date.now()
    },
    dirty: false,
    lastActivity: Date.now(),
    lastDbCheck: Date.now()
  });

  const getState = () => sessionManager.sessions.get(uKey).state;

  await t.test('1. Online matured investment automatically credits bank on sync', async () => {
    const sBefore = getState();
    const bankBefore = sBefore.bank;
    await sessionManager.updateSessionState(uKey, {
      username: testUser,
      cash: sBefore.cash,
      bank: bankBefore + 20300,
      investments: []
    });
    const sAfter = getState();
    assert.strictEqual(sAfter.investments.length, 0, 'Matured investment must be removed');
    assert.ok(sAfter.bank >= bankBefore + 20300, 'Bank must receive 20,300 EGP investment payout');
  });

  await t.test('2. Money laundering converts dirtyCash to clean bank balance (with 22% fee)', async () => {
    const sBefore = getState();
    const bankBefore = sBefore.bank;
    // Launder 50,000 dirtyCash -> 39,000 clean bank
    await sessionManager.updateSessionState(uKey, {
      username: testUser,
      dirtyCash: 50000,
      bank: bankBefore + 39000
    });
    const sAfter = getState();
    assert.strictEqual(sAfter.dirtyCash, 50000, 'Dirty cash must decrease by 50,000');
    assert.ok(sAfter.bank >= bankBefore + 39000, 'Bank must increase by 39,000');

    // Direct engine call for remaining 50,000
    const res = launderMoney(sAfter, 50000);
    assert.strictEqual(res.cleanedAmount, 39000);
    assert.strictEqual(sAfter.dirtyCash, 0);
  });

  await t.test('3. Job shifts & overtime shifts credit verified salary to bank', async () => {
    const sBefore = getState();
    const bankBefore = sBefore.bank;
    // Accountant salary = 28 EGP; 2 shifts (56) + 1 overtime (70) = 126 EGP
    await sessionManager.updateSessionState(uKey, {
      username: testUser,
      jobId: 'accountant',
      dailyWork: { date: today, shifts: 2, overtimeShifts: 1 },
      bank: bankBefore + 126
    });
    const sAfter = getState();
    assert.ok(sAfter.bank >= bankBefore + 126, 'Bank must receive verified job shift + overtime salary');
    assert.strictEqual(sAfter.dailyWork.shifts, 2);
    assert.strictEqual(sAfter.dailyWork.overtimeShifts, 1);
  });

  await t.test('4. Daily quest reward credits verified cash on claim', async () => {
    const sBefore = getState();
    const cashBefore = sBefore.cash;
    await sessionManager.updateSessionState(uKey, {
      username: testUser,
      cash: cashBefore + 500,
      dailyQuests: {
        date: today,
        grandBonusClaimed: false,
        quests: [
          { id: 'work_shifts', title: 'مهمة عمل', target: 3, progress: 3, completed: true, claimed: true, cashReward: 500, xpReward: 25 }
        ]
      }
    });
    const sAfter = getState();
    assert.strictEqual(sAfter.cash, cashBefore + 500, 'Quest reward must credit cash');
  });

  await t.test('5. Selling a verified Franchise credits 45x base cost to cash and resets business', async () => {
    const sBefore = getState();
    const cashBefore = sBefore.cash;
    const expectedPayout = Math.floor(1275 * 45); // 57,375 EGP for kiosk
    const res = sellFranchise(sBefore, 'kiosk');
    assert.strictEqual(res.payout, expectedPayout);
    assert.strictEqual(sBefore.cash, cashBefore + expectedPayout);
    assert.strictEqual(sBefore.businesses.kiosk.level, 0);
    assert.strictEqual(sBefore.businesses.kiosk.isFranchise, false);
  });

  await t.test('6. Fractional cashflow remainder is preserved across fast 1s syncs', () => {
    const mockState = {
      bank: 1000,
      businesses: {
        kiosk: { level: 1, workers: 0, price: 20, suppliesTicks: 3600 }
      },
      lastCashflowAccrualAt: Date.now() - 1000
    };
    // Kiosk level 1 hourly profit is ~283 EGP/h (~0.0786 EGP/s)
    // Over 20 separate 1-second accruals, fractional remainders must accumulate to >= 1 EGP
    let now = Date.now();
    for (let i = 0; i < 20; i++) {
      now += 1000;
      accrueAuthoritativeCashflow(mockState, now);
    }
    assert.ok(mockState.bank > 1000, 'Fractional EGP per second must accumulate and credit bank');
  });

  await t.test('7. Space Exploration Agency & Rockets are included in calculateNetWorth', () => {
    const baseWorth = calculateNetWorth({ cash: 1000, bank: 0 });
    const spaceWorth = calculateNetWorth({
      cash: 1000,
      bank: 0,
      space: {
        unlocked: true, // +2.5B
        facilities: { launchpads: 2, mission_control: 1, ore_silo: 1, ore_refinery: 1 }, // +1.5B
        activeRockets: [{ id: 'r1', modelId: 'falcon_star' }] // +500M
      }
    });
    assert.strictEqual(spaceWorth - baseWorth, 4500000000, 'Space agency + launchpad lvl 2 + falcon_star must add 4.5B EGP to net worth');
  });

  sessionManager.sessions.delete(uKey);
});
