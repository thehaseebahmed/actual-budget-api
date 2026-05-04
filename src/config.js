import 'dotenv/config';

const {
  ACTUAL_SERVER_URL,
  ACTUAL_SERVER_PASSWORD,
  ACTUAL_BUDGET_ID,
  ACTUAL_BUDGET_PASSWORD,
  PORT = '3000',
} = process.env;

const missing = ['ACTUAL_SERVER_URL', 'ACTUAL_SERVER_PASSWORD', 'ACTUAL_BUDGET_ID']
  .filter(k => !process.env[k]);

if (missing.length) {
  throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
}

export const serverUrl = ACTUAL_SERVER_URL;
export const serverPassword = ACTUAL_SERVER_PASSWORD;
export const budgetId = ACTUAL_BUDGET_ID;
export const budgetPassword = ACTUAL_BUDGET_PASSWORD || null;
export const port = parseInt(PORT, 10);
