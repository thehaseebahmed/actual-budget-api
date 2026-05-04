import './config.js';
import express from 'express';
import { port } from './config.js';
import budgetRouter from './routes/budget.js';

// The @actual-app/api package spawns internal workers that can reject promises
// after our await chain has already returned (e.g. background sync). Absorb
// these so Node 24's strict unhandled-rejection mode doesn't crash the process.
process.on('unhandledRejection', (reason) => {
  console.error('[actual-api] unhandled rejection (internal API):', reason);
});

const app = express();

app.use('/budget', budgetRouter);

app.use((req, res) => res.status(404).json({ error: 'Not found' }));

app.listen(port, () => {
  console.log(`actual-api listening on port ${port}`);
});
