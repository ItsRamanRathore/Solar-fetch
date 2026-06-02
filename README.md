# Solar-fetch

Solar-fetch is a local energy marketplace and simulation platform focused on managing, metering, trading, and settling distributed solar energy between participants. It includes a React + TypeScript frontend (Vite), an Express-based API and server logic, and small microservices for gateway, identity, metering, trading and settlement. The project also contains simulation and engine components for market arbitrage, fraud detection, and grid simulation.

**Key goals:** provide a developer-friendly platform for experimenting with peer-to-peer energy markets, grid state simulation, demand forecasting, and settlement flows.

**Features**
- Frontend dashboard and tools: live bidding, neighborhood discovery/map, spatial visualization, energy charts, transaction table, green certificate display, notification drawer, and admin views.
- Real-time communication via WebSockets for live bidding and grid updates.
- REST API and server routes for authentication, users, markets, assets, grid state, predictions, and ledger operations.
- Modular services: gateway, identity, metering, trading, settlement (each with its own entry in `services/`).
- Simulation and engines: `ArbitrageEngine`, `FraudEngine`, and `SimulationEngine` to run market and grid scenarios.
- Database models for `User`, `Asset`, `GridState`, `Usage`, `Order`, `Transaction`, `Conflict`, and `Governance`.
- Seed and utility scripts for creating admin users and seeding historical usage and simulation data.

**Main highlights**
- Full-stack, local energy marketplace: browser UI, REST API, and independent services working together for realistic simulations.
- Real-time market mechanics: live bidding, socket-driven grid updates, and transaction streaming.
- Pluggable simulation engines: run arbitrage, fraud detection, and grid simulation scenarios out-of-the-box.
- Modular microservices: run services independently or together (`gateway`, `identity`, `metering`, `trading`, `settlement`).
- Developer-friendly seeds and scripts: quick admin creation, reseed, and historical usage imports for reproducible testing.
- Production-aware layout: services are container-friendly and configured via environment variables for easy deployment.

Architecture overview
- Monorepo-style layout with a single root tooling and multiple lightweight services in `services/`.
- Frontend app in `src/` (React + TypeScript, Vite).
- Backend server and API in `server/` and `api/` for different deployment topologies.
- Services expose small HTTP servers (see `services/*/index.js`) that can be run individually or together via root scripts.

Quick start (development)
Prerequisites:
- Node.js (>=18 recommended)
- npm or yarn

1. Install dependencies

```bash
npm install
```

2. Start the UI and services together (root workspace)

```bash
npm run dev
```

This runs the Vite UI plus the local services concurrently. Individual services can be run with `npm run start:gateway`, `npm run start:identity`, `npm run start:metering`, `npm run start:trading`, and `npm run start:settlement`.

Environment
- Copy `.env.example` (if present) or provide environment variables used by the services (PORT, MONGODB_URI, JWT secrets, Kafka settings if used). Many services accept `PORT` to override the default ports defined in `package.json` scripts.

Database & seed scripts
- The repository includes helper scripts in `scripts/`:
  - `create_admin.js` — create or seed an admin user
  - `seed_history.js`, `seed_historical_usage.js` — seed usage and historical records
  - `reseed_db.js` — wipe and reseed dev database
  - `verify_db.js` — run simple DB verification checks

Run seeds (example)

```bash
node scripts/create_admin.js
node scripts/seed_historical_usage.js
```

Testing
- Run unit and integration tests with:

```bash
npm test
```

Project structure (high-level)
- `src/` — React frontend (TypeScript)
  - UI components: `src/components/` (LiveBidding, SpatialMap, EnergyCharts, etc.)
  - Contexts and hooks: `src/contexts/`, `src/useSocket.ts`, `src/useSettings.ts`
- `server/` — main server app and route handlers (`server/index.js`, `server/routes/`)
- `services/` — small service processes (gateway, identity, metering, trading, settlement)
- `scripts/` — dev and seeding utilities
- `models/` — shared Mongo/Mongoose models used by server and services

Notable files
- `server/index.js` — main server entry and routes
- `api/index.js` — alternate API entry
- `services/*/index.js` — service entry points
- `scripts/create_admin.js` — admin seeding helper

Deployment notes
- The project is arranged to allow running services independently (useful for containerization). Each `services/*` contains its own `package.json` so it can be packaged or deployed separately.
- For production, ensure proper env vars for MongoDB, JWT secrets, CORS origins, and any message brokers (Kafka) used by the services.

Contributing
- Please open issues or PRs for bug fixes and features. Follow the existing code style and run `npm run lint` and `npm test` before submitting.

License
- This repository does not include an explicit license file. Add a `LICENSE` file if you intend to publish or open-source this project.

Where to look next
- Frontend: `src/` to explore components and views
- Backend: `server/routes/` for API endpoints and `models/` for data shape
- Services: `services/` for individual process responsibilities

Enjoy exploring Solar-fetch — if you'd like, I can also open a PR with this README, run the dev environment, or generate a minimal `.env.example` for local development.

