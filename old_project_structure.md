# Old Project Structure and Dependencies: ver2-isuzu-racing-engineering

The previous iteration of the platform (`NextJS-ISUZU-Platform-main`) was built using the following core technologies and structure:

## Core Dependencies
* **Framework**: Next.js (latest version at the time), using React 19.
* **Styling**: TailwindCSS 3.4.3, `autoprefixer`, `postcss`.
* **UI Components/Icons**: `lucide-react`, `tailwind-merge`, `clsx`.
* **Data Visualization**: `recharts`.
* **Layout Management**: `react-grid-layout`.
* **Real-time Communication**: `socket.io` and `socket.io-client` alongside an `express` custom server setup.

## Project Structure
* **`app/`**: Next.js App Router directory containing the main pages and routing logic.
* **`components/`**: Directory for React components.
* **`public/`**: Static assets.
* **Root configuration files**: `tailwind.config.ts`, `postcss.config.mjs`, `next.config.mjs`, `tsconfig.json`.

This provides context on the baseline features (real-time data via websockets, dashboard layouts with react-grid-layout, and charting with recharts) that need to be migrated or improved upon in the new architecture.
