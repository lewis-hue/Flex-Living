# Flex Living - AI Property-Management Analytics

Flex Living helps property managers understand their portfolio from guest reviews. It
ingests reviews, runs LLM-based sentiment and topic analysis, and surfaces the results
in real-time dashboards so a manager can see which properties are trending up or down and
why.

Built as a full-stack app (FastAPI + React) and deployed on Google Cloud Run.

> Note: AI coding agents were used during development. The description below reflects what
> the code in this repository actually does; see **Limitations** for what it does not.

## What it does

- **Review sentiment analysis.** Each review is scored for sentiment and has topics
  extracted using a Groq-hosted LLM (Llama 3.1). Results are stored per review and rolled
  up per property.
- **Real-time updates.** MongoDB change streams push new reviews and analytics to the UI
  over WebSocket, so dashboards update without a manual refresh.
- **Analytics dashboards.** A React + TypeScript frontend (Recharts, shadcn/ui, Tailwind,
  React Query) renders per-property ratings, sentiment distribution, and common topics.
- **Property sync.** Optional integration with the HostAway property-management API to
  pull properties and reviews.
- **Auth.** JWT authentication with role-based access (admin, manager, viewer, user).

## Stack

| Layer | Technology |
|---|---|
| Backend | Python, FastAPI, Motor (async MongoDB) |
| Data | MongoDB (documents + change streams) |
| AI | Groq LLM (Llama 3.1) for sentiment and topic extraction |
| Frontend | React 18, TypeScript, Vite, Tailwind, shadcn/ui, React Query, Recharts |
| Realtime | WebSocket |
| Infra | Docker, Nginx, Google Cloud Run, Cloud Build |

## Layout

```
backend/flex_back/     FastAPI app (routes, services, models, core/config)
frontend/              React + Vite client (pages, components, hooks, contexts)
database/              seed and schema helpers
docker/ , nginx/       container + reverse-proxy config
cloudbuild.yaml        GCP Cloud Build pipeline
```

## Running locally

```bash
# Backend
cd backend/flex_back
pip install -r requirements.txt
cp .env.example .env          # set MONGODB_URL, GROQ_API_KEY, JWT_SECRET (see below)
python run.py

# Frontend
cd frontend
npm install
cp .env.example .env
npm run dev
```

## Configuration

All secrets come from environment variables; nothing is committed. See the backend and
frontend `.env.example` files. Required: `MONGODB_URL`, `GROQ_API_KEY`, `JWT_SECRET`.
HostAway and SendGrid integrations require their own keys when enabled.

## Limitations

- Performance has not been formally load-tested; no throughput or uptime numbers are
  claimed here.
- The multi-language pieces in the codebase are scaffolding, not a production translation
  engine, and are not enabled by default.
- This is a solo project built as a portfolio and product prototype, not a
  multi-tenant production deployment.
