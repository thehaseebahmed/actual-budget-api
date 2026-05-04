import { Router } from 'express';
import * as api from '@actual-app/api';
import { mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { serverUrl, serverPassword, budgetId, budgetPassword } from '../config.js';

const router = Router();

const DATA_DIR = join(process.cwd(), 'data', budgetId.replace(/[^a-zA-Z0-9_-]/g, '_'));
mkdirSync(DATA_DIR, { recursive: true });

let sessionOpen = false;

// Single global lock — the API is a process-level singleton.
let globalLock = Promise.resolve();

async function withLock(fn) {
  let release;
  const next = new Promise(r => { release = r; });
  const prior = globalLock;
  globalLock = next;
  await prior;
  try {
    return await fn();
  } finally {
    release();
  }
}

// getBudgetMonth sometimes rejects via an unhandled promise (a fire-and-forget
// path inside the API's IPC layer) instead of through the returned promise.
// This wrapper races both rejection channels so the caller always gets a proper error.
function getBudgetMonthSafe(month) {
  return new Promise((resolve, reject) => {
    const handler = (reason) => {
      const msg = reason?.message ?? (typeof reason === 'string' ? reason : JSON.stringify(reason));
      reject(Object.assign(new Error(msg), { isApiError: true, apiReason: reason }));
    };
    process.on('unhandledRejection', handler);
    api.getBudgetMonth(month)
      .then(resolve, reject)
      .finally(() => process.off('unhandledRejection', handler));
  });
}

async function openSession() {
  const downloadOpts = budgetPassword ? { password: budgetPassword } : {};
  await api.init({ dataDir: DATA_DIR, serverURL: serverUrl, password: serverPassword });
  try {
    await api.downloadBudget(budgetId, downloadOpts);
  } catch {
    // Corrupt local cache — wipe and retry once.
    await api.shutdown().catch(() => {});
    rmSync(DATA_DIR, { recursive: true, force: true });
    mkdirSync(DATA_DIR, { recursive: true });
    await api.init({ dataDir: DATA_DIR, serverURL: serverUrl, password: serverPassword });
    await api.downloadBudget(budgetId, downloadOpts);
  }
  sessionOpen = true;
}

/**
 * GET /:year/:month
 * e.g. GET /2025/03
 */
router.get('/:year/:month', async (req, res) => {
  const { year, month } = req.params;

  if (!/^\d{4}$/.test(year) || !/^\d{2}$/.test(month)) {
    return res.status(400).json({ error: 'URL must be in the format /YYYY/MM e.g. /2025/03' });
  }

  const budgetMonth = `${year}-${month}`;

  try {
    const result = await withLock(async () => {
      if (!sessionOpen) {
        await openSession();
      } else {
        // Sync latest data; re-open if the session was dropped server-side.
        const downloadOpts = budgetPassword ? { password: budgetPassword } : {};
        try {
          await api.downloadBudget(budgetId, downloadOpts);
        } catch {
          await api.shutdown().catch(() => {});
          sessionOpen = false;
          await openSession();
        }
      }

      return await getBudgetMonthSafe(budgetMonth);
    });

    res.json({ month: budgetMonth, budget: result });
  } catch (err) {
    if (sessionOpen) {
      await api.shutdown().catch(() => {});
      sessionOpen = false;
    }
    const message = err?.message ?? String(err);
    if (message.toLowerCase().includes('no budget exists for month')) {
      return res.status(404).json({ error: `No budget data for ${year}/${month}` });
    }
    res.status(502).json({ error: `Actual API error: ${message}` });
  }
});

export default router;
