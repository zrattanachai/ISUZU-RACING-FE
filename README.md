This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Environment Variables

Create a `.env.local` file and configure at least:

```bash
API_BASE_URL=http://localhost:4001
WS_ENDPOINT=http://localhost:4001
NEXT_PUBLIC_VIOLATION_HIGHLIGHT_MS=3000
PLATFORM_NAME="ISUZU CUP"
LOGO_URL="/logo.png"
FILE_DELETE_ADMIN_PASSWORD=change-me
```

- `API_BASE_URL` should point to the combined mock server on `4001`, which serves fleet/drivers data directly and proxies the remaining OpenAPI endpoints to Prism on `4000`.
- `WS_ENDPOINT` is the server-side WebSocket endpoint and is passed into the client app at runtime by the root layout.
- `NEXT_PUBLIC_VIOLATION_HIGHLIGHT_MS` controls how long the Director car number stays highlighted after a new backend violation (milliseconds).
- `PLATFORM_NAME` and `LOGO_URL` customize branding and are injected at runtime from the server.
- `FILE_DELETE_ADMIN_PASSWORD` is required by `POST /api/files/verify-delete` and is never exposed to client bundles.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
