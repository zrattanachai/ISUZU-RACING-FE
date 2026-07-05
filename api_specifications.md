# API & Telemetry Specifications

This document outlines the API specifications and the frontend API architecture for seamless, scalable integration with the backend, adhering to Next.js 16+ best practices.

## API Integration Architecture Policy
**CRITICAL LIMITATIONS**:
1. **No Hardcoding**: Do not hardcode any API base URLs, WebSocket endpoints, or specific tokens anywhere in the codebase.
2. **Environment Variables**: Every endpoint base URL must be loaded from `.env` files (e.g., `process.env.NEXT_PUBLIC_API_BASE_URL`).

### Data Fetching Strategy (Next.js 16+)
* **Server-Side Preferred**: Utilize React Server Components (RSC) to fetch data on the server natively using the extended `fetch` API. This prevents exposing API secrets to the client and optimizes caching and performance.
* **Client-Side Fetching**: For data that mutates often from user interaction (non-streaming), create a centralized API client instance (e.g., Axios instance or custom Fetch wrapper).
* **Route Handlers**: Use Next.js Route Handlers (`app/api/.../route.ts`) to act as a proxy for sensitive external API calls where we do not want to expose the true backend URL or API keys to the browser.
* **Dynamic Endpoints**: Backend variables should dictate path parameters dynamically (e.g., `[id]`).

---

## 1. Real-Time Telemetry (WebSocket)
The platform heavily relies on real-time data streaming using `socket.io-client`.

* **Endpoint**: Initiated via environment variable. 
  * *Example config*: `NEXT_PUBLIC_WS_ENDPOINT=ws://api.racing-intelligence.local/telemetry`
* **Connection Lifecycle**:
  * Establish connection in a dedicated custom hook (`useTelemetrySocket`).
  * Ensure connection cleanup upon component unmount.
* **Events**:
  * `subscribe_car`: Request telemetry for a specific vehicle. Payload: `{ carId: string }`
  * `telemetry_update`: Receives live data stream.
    ```json
    {
      "carId": "car-12",
      "timestamp": 1712048593,
      "speed": 245.5,
      "rpm": 12500,
      "temperatures": { "engine": 110.5 }
    }
    ```

## 2. REST API Endpoints (Dynamic Structure)
All endpoints must be relative to `NEXT_PUBLIC_API_BASE_URL`.

### Authentication
* **POST /auth/login**
  * Req: `{ username, password }`
  * Res: `{ token, user: { id, role } }`
  * *Security*: Tokens must be stored securely (e.g., HTTP-only cookies managed via Next.js Route handlers, not local storage).

### Historical Data & Analysis
* **GET /sessions/[sessionId]**
  * Fetches historical telemetry for a completed race session used for dynamic dashboard charts.

### Fleet Management
* **GET /fleet**
  * Fetches the status of all active racing vehicles.

## 3. Error Handling and Interceptors
* Implement global error handling (e.g., using Axios interceptors or fetch wrapper) to catch standard HTTP status codes (200, 400, 401, 403, 500).
* Automatically trigger a token refresh or redirect to login on a `401 Unauthorized` response.
* Standard backend error envelope:
```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Dynamic API rejection: Invalid car ID parameter."
  }
}
```
