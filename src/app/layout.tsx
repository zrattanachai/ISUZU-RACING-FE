import type { Metadata } from 'next';
import { Inter, Roboto_Mono } from 'next/font/google';
import './globals.css';
import { PlatformProvider } from '@/context/PlatformContext';
import { AuthenticatedShell } from '@/components/layout/AuthenticatedShell';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
});

const robotoMono = Roboto_Mono({
  variable: '--font-roboto-mono',
  subsets: ['latin'],
  weight: ['300', '400', '500', '700'],
});

export const metadata: Metadata = {
  title: 'Racing Engineering Dashboard',
  description: 'High-performance racing telemetry and engineering dashboard',
};

export const dynamic = 'force-dynamic';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const wsEndpoint = process.env.WS_ENDPOINT ?? process.env.API_BASE_URL ?? '';
  const platformName = process.env.PLATFORM_NAME ?? 'Racing Platform';
  const logoUrl = process.env.LOGO_URL ?? '/logo.png';

  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${robotoMono.variable} text-white antialiased`}
      >
        <PlatformProvider
          wsEndpoint={wsEndpoint}
          platformName={platformName}
          logoUrl={logoUrl}
        >
          <AuthenticatedShell>{children}</AuthenticatedShell>
        </PlatformProvider>
      </body>
    </html>
  );
}
