# ISUZU Racing Platform — Frontend Agent Instructions

Racing telemetry dashboard built with **Next.js 16 App Router + React 19 + Tailwind CSS 4**. The frontend proxies all API calls to a combined mock/backend server and streams realtime telemetry via Socket.IO.

## Quick Start

```bash
# Frontend dev server (port 3000)
npm run dev

# Component explorer
npm run storybook

# Tests (Vitest + Playwright/Chromium against Storybook stories)
npx vitest

# Lint
npm run lint
```

**Required `.env.local`** (see [README.md](README.md)):

```
API_BASE_URL=http://localhost:4001
WS_ENDPOINT=http://localhost:4001
NEXT_PUBLIC_VIOLATION_HIGHLIGHT_MS=3000
PLATFORM_NAME="ISUZU CUP"
LOGO_URL="/logo.png"
FILE_DELETE_ADMIN_PASSWORD=change-me
```

## Architecture

```
src/app/            → Next.js App Router pages + Route Handlers
src/components/     → common/ features/ layout/
src/hooks/          → 16 WebSocket + REST hooks (one per channel)
src/context/        → PlatformContext (global fleet/role/threshold state)
src/lib/            → websocket singleton, services/, authClient, utils
src/types/          → Canonical TypeScript types (index.ts, dashboard.ts)
```

The full project structure is documented in [old_project_structure.md](old_project_structure.md).

## Key Conventions

### Route Handlers — always proxy, never access DB

All `src/app/api/**/route.ts` files call `proxyBackendRequest()` or `proxyRealtimeRequest()` from [`src/lib/services/backendProxy.ts`](src/lib/services/backendProxy.ts). Do **not** add business logic inside route handlers.

### WebSocket — one singleton, channel subscriptions

- `initWebSocket()` called once in `PlatformContext` at app mount.
- All realtime hooks call `getWebSocket()` from [`src/lib/websocket.ts`](src/lib/websocket.ts) and subscribe/unsubscribe inside `useEffect`.
- **Do not create new `io()` connections** inside components or hooks.
- Available channels: `vehicle.telemetry`, `vehicle.sensors`, `vehicle.location`, `vehicle.status`, `vehicle.biometric`, `vehicle.anomaly`, `vehicle.alert` (see [asyncapi.yaml](asyncapi.yaml)).

### Hooks — one hook per channel

Use purpose-built hooks; `useTelemetrySocket` is **deprecated**.

| Need                     | Hook                                                   |
| ------------------------ | ------------------------------------------------------ |
| Single-vehicle telemetry | `useVehicleTelemetry(vehicleId)`                       |
| Fleet telemetry          | `useFleetTelemetry()`                                  |
| Alerts                   | `useVehicleAlerts(vehicleId)` or `useCarAlerts(carId)` |
| GPS/lap                  | `useVehicleLocation(vehicleId)` / `useFleetLocation()` |
| Driver health            | `useVehicleBiometrics(vehicleId)`                      |
| Anomaly counters         | `useVehicleAnomaly(vehicleId)`                         |
| Sensor categories        | `useVehicleSensors(vehicleId)`                         |
| Camera stream URL        | `useVehicleStream(vehicleId)`                          |

### Global State — PlatformContext

Access via `usePlatform()`. Contains: `cars`, `drivers`, `activeCarId`, `currentRole`, `alertThresholds`, `directorThresholds`, `isDarkMode`. Do **not** duplicate this state in components.

### Components

- Interactivity → `'use client'` + hooks for data.
- Static server-rendered content → RSC (no `'use client'`).
- `cn()` from `src/lib/utils.ts` for conditional Tailwind classes (clsx + tailwind-merge).
- Imports use `@/` alias (resolves to `src/`).

### RBAC

`canAccessRoute()` and `canEditLayouts()` from [`src/lib/navigationAccess.ts`](src/lib/navigationAccess.ts). Four roles: `ADMIN`, `DIRECTOR`, `ENGINEER`, `COMPETITOR`.

### Mock credentials (dev only)

| Role       | Email                | Password       | Landing page       |
| ---------- | -------------------- | -------------- | ------------------ |
| Admin      | admin@isuzu.com      | Admin@123      | /administration    |
| Director   | director@isuzu.com   | Director@123   | /overview-director |
| Engineer   | engineer@isuzu.com   | Engineer@123   | /engineering       |
| Competitor | competitor@isuzu.com | Competitor@123 | /director          |

## API Contracts

- REST: [openapi.yaml](openapi.yaml) — served by mock at `http://localhost:4001`
- WebSocket: [asyncapi.yaml](asyncapi.yaml) — Socket.IO on `ws://localhost:4001`
- Detailed integration notes: [backend_integration_dashboard_api.md](backend_integration_dashboard_api.md), [api_specifications.md](api_specifications.md)

## Testing

Tests are Vitest projects running Storybook stories in headless Chromium (see [vitest.config.ts](vitest.config.ts)). Write component tests as `.stories.tsx` files alongside components.

## Available Skills

Load these skills when relevant tasks arise:

| Skill                         | When to use                                                  |
| ----------------------------- | ------------------------------------------------------------ |
| `racing-telemetry-frontend`   | Telemetry dashboards, WebSocket charts, race-control widgets |
| `racing-api-contracts`        | Route handlers, API integration, auth-aware fetches          |
| `next-best-practices`         | RSC boundaries, data fetching, metadata, routing             |
| `vercel-react-best-practices` | Performance, bundle optimization, React patterns             |
| `tailwind-css-patterns`       | Responsive layouts, component styling                        |
| `typescript-advanced-types`   | Complex generic types, utility types                         |
| `playwright-best-practices`   | E2E tests, browser automation                                |
| `vitest`                      | Unit/component test authoring                                |
