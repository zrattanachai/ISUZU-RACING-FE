# Race Control Backend Integration API

This document defines the backend contract needed to replace the mock data currently used by the Race Control dashboard in [src/app/page.tsx](src/app/page.tsx).

Import-ready REST spec: [openapi.yaml](openapi.yaml)
Import-ready realtime spec: [asyncapi.yaml](asyncapi.yaml)

## Goals

- Provide an initial server-fetched dashboard snapshot for the active vehicle.
- Stream live telemetry updates safely over WebSocket without hardcoded endpoints.
- Keep secrets and privileged backend calls behind Next.js Route Handlers when required.
- Standardize payloads for vehicle selection, sensor panels, alerts, and telemetry link state.

## Environment Variables

- `NEXT_PUBLIC_API_BASE_URL`: public REST base URL for browser-safe endpoints.
- `NEXT_PUBLIC_WS_ENDPOINT`: public WebSocket endpoint for telemetry subscriptions.
- `BACKEND_API_TOKEN`: optional server-only token for Route Handler proxy calls.

## Frontend Integration Model

1. Use a server component or Route Handler to fetch the initial Race Control snapshot before rendering interactive widgets.
2. Hydrate the client page with the selected car, driver, sensor categories, active alerts, and connection status.
3. Use `useTelemetrySocket` only for live updates and subscription changes after the page is mounted.
4. Persist user-customized grid layouts through a Route Handler instead of writing directly to the backend from the browser.

## Recommended REST Endpoints

### 1. Fleet Summary

- Method: `GET`
- Path: `/fleet`
- Purpose: populate the active vehicle selector.

Example response:

```json
{
  "cars": [
    {
      "id": 12,
      "number": "12",
      "model": "Isuzu D-Max Proto",
      "status": "Active"
    }
  ]
}
```

### 2. Driver Assignments

- Method: `GET`
- Path: `/drivers`
- Query params: `carIds=1,2,3`
- Purpose: resolve the driver name shown for each vehicle.

Example response:

```json
{
  "drivers": [
    {
      "id": 8,
      "name": "Driver 12",
      "carId": 12,
      "license": "FIA-A"
    }
  ]
}
```

### 3. Race Control Snapshot

- Method: `GET`
- Path: `/race-control/cars/{carId}/snapshot`
- Purpose: return all non-streaming data needed for the initial dashboard render.

Example response:

```json
{
  "car": {
    "id": 12,
    "number": "12",
    "model": "Isuzu D-Max Proto",
    "status": "Active"
  },
  "driver": {
    "id": 8,
    "name": "Driver 12",
    "carId": 12,
    "license": "FIA-A"
  },
  "sensorCategories": {
    "POWERTRAIN": [
      {
        "name": "Engine Oil Pressure",
        "value": "4.2 bar",
        "status": "ok",
        "channel": "CH-1"
      }
    ],
    "CHASSIS": [],
    "AERO": [],
    "ELECTRONICS": []
  },
  "alerts": [
    {
      "id": "alert-1",
      "message": "Front Left Brake Temp High",
      "level": "warning",
      "time": "2026-03-16T10:42:01Z",
      "acknowledged": false
    }
  ],
  "connection": {
    "state": "synchronized",
    "latencyMs": 24,
    "boxName": "Mini-Telemetry-V2",
    "firmwareVersion": "v3.12"
  }
}
```

### 4. Active Alerts

- Method: `GET`
- Path: `/cars/{carId}/alerts`
- Query params: `state=active`
- Purpose: refresh the alerts panel independently from the main snapshot when needed.

### 5. Alert Acknowledgement

- Method: `POST`
- Path: `/cars/{carId}/alerts/acknowledge`
- Purpose: back the `ACKNOWLEDGE ALL` action.

Example request:

```json
{
  "alertIds": ["alert-1", "alert-2"]
}
```

### 6. Dashboard Layout Persistence

- Method: `PUT`
- Path: `/users/{userId}/preferences/race-control-layout`
- Purpose: persist the draggable sensor widget arrangement.

Example request:

```json
{
  "mainLayout": [{ "i": "sensors", "x": 0, "y": 0, "w": 9, "h": 5 }],
  "sensorLayouts": {
    "POWERTRAIN": [{ "i": "0", "x": 0, "y": 0, "w": 4, "h": 2 }]
  }
}
```

## WebSocket Contract

- Transport: `socket.io-client`
- Endpoint source: `NEXT_PUBLIC_WS_ENDPOINT`

### Client events

- `subscribe_car`

```json
{
  "carId": "12"
}
```

- `unsubscribe_car`

```json
{
  "carId": "12"
}
```

### Server events

- `telemetry_update`

```json
{
  "carId": "12",
  "timestamp": 1773657721,
  "speed": 245.5,
  "rpm": 12500,
  "temperatures": {
    "engine": 110.5
  },
  "sensorCategories": {
    "POWERTRAIN": [
      {
        "name": "Engine Oil Pressure",
        "value": "4.3 bar",
        "status": "ok",
        "channel": "CH-1"
      }
    ]
  },
  "connection": {
    "state": "synchronized",
    "latencyMs": 24
  }
}
```

- `alert_update`

```json
{
  "carId": "12",
  "alerts": [
    {
      "id": "alert-1",
      "message": "Front Left Brake Temp High",
      "level": "warning",
      "time": "2026-03-16T10:42:01Z",
      "acknowledged": false
    }
  ]
}
```

## Next.js Routing Recommendation

- Use a server component or Route Handler such as `src/app/api/race-control/[carId]/route.ts` to proxy privileged snapshot requests.
- Keep WebSocket setup in a client hook such as [src/hooks/useTelemetrySocket.ts](src/hooks/useTelemetrySocket.ts).
- Do not expose private API keys or internal hostnames to the browser.

## Error Envelope

All backend endpoints should return a consistent error shape:

```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Invalid car ID parameter.",
    "details": {
      "field": "carId"
    }
  }
}
```

## Implementation Notes For This Repo

- Replace the mock sensor and alert constants with the snapshot response once the backend is available.
- Keep the page composition in [src/app/page.tsx](src/app/page.tsx) and move data access into Route Handlers or shared service utilities.
- Update [src/hooks/useTelemetrySocket.ts](src/hooks/useTelemetrySocket.ts) to handle re-subscription when the active car changes and to avoid localhost fallbacks in production paths.
