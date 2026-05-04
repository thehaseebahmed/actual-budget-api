# actual-api

A minimal REST API that exposes [Actual Budget](https://actualbudget.org) data over HTTP.

## Endpoint

```
GET /budget/:year/:month
```

Returns the budget for the given month.

**Example:**
```
GET /budget/2025/03
```

**Response:**
```json
{
  "month": "2025-03",
  "budget": { ... }
}
```

**Error responses:**
- `400` — invalid year/month format
- `404` — no budget data exists for that month in Actual
- `502` — could not reach the Actual server

---

## Configuration

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

| Variable | Required | Description |
|---|---|---|
| `ACTUAL_SERVER_URL` | Yes | Full URL of your Actual server e.g. `http://localhost:5006` |
| `ACTUAL_SERVER_PASSWORD` | Yes | Your Actual server password |
| `ACTUAL_BUDGET_ID` | Yes | Sync ID from Actual → Settings → Advanced |
| `ACTUAL_BUDGET_PASSWORD` | No | End-to-end encryption password (leave blank if not used) |
| `PORT` | No | Port to listen on (default: `3000`) |

---

## Dev environment

**Prerequisites:** Node.js 20+

```bash
# Install dependencies
npm install

# Start with auto-reload on file changes
npm run dev

# Or start without auto-reload
npm start
```

The API will be available at `http://localhost:3000`.

---

## Docker Compose

**Prerequisites:** Docker and Docker Compose

Create a `docker-compose.yml` in the project root:

```yaml
services:
  actual-api:
    build: .
    ports:
      - "3000:3000"
    env_file:
      - .env
    volumes:
      - actual-data:/app/data
    restart: unless-stopped

volumes:
  actual-data:
```

Create a `Dockerfile` in the project root:

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY src ./src
EXPOSE 3000
CMD ["node", "src/index.js"]
```

Then run:

```bash
# Build and start
docker compose up -d

# View logs
docker compose logs -f

# Stop
docker compose down
```

The `actual-data` volume persists the local Actual database cache between restarts.
