'use client';

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { usePlatform } from '@/context/PlatformContext';
import { RecordingProvider } from '@/context/RecordingContext';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { LoginPanel } from '@/components/features/LoginPanel';
import {
  clearStoredAccessToken,
  decodeJwtClaims,
  fetchAuthenticatedSession,
  getStoredAccessToken,
  hasValidJwtClaims,
  loginWithCredential,
  storeAccessToken,
} from '@/lib/authClient';
import { canAccessRoute, getDefaultLandingPage } from '@/lib/navigationAccess';

export function AuthenticatedShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const {
    isAuthenticated,
    currentRole,
    setCurrentUser,
    setIsAuthenticated,
    setIsAdmin,
    setCurrentRole,
  } = usePlatform();
  const pathname = usePathname();
  const router = useRouter();
  const [isBootstrappingAuth, setIsBootstrappingAuth] = useState(true);

  useEffect(() => {
    let isCancelled = false;

    async function bootstrapAuth() {
      const token = getStoredAccessToken();
      if (!token) {
        if (!isCancelled) {
          setCurrentUser(null);
          setCurrentRole('ENGINEER');
          setIsAdmin(false);
          setIsAuthenticated(false);
          setIsBootstrappingAuth(false);
        }
        return;
      }

      const localClaims = decodeJwtClaims(token);
      if (!hasValidJwtClaims(localClaims)) {
        clearStoredAccessToken();
        if (!isCancelled) {
          setCurrentUser(null);
          setCurrentRole('ENGINEER');
          setIsAdmin(false);
          setIsAuthenticated(false);
          setIsBootstrappingAuth(false);
        }
        return;
      }

      try {
        const session = await fetchAuthenticatedSession(token);
        if (!session || !hasValidJwtClaims(session.claims)) {
          clearStoredAccessToken();
          if (!isCancelled) {
            setCurrentUser(null);
            setCurrentRole('ENGINEER');
            setIsAdmin(false);
            setIsAuthenticated(false);
            setIsBootstrappingAuth(false);
          }
          return;
        }

        if (!isCancelled) {
          setCurrentUser(session.user);
          setCurrentRole(session.user.role);
          setIsAdmin(session.user.permissions.administration);
          setIsAuthenticated(true);
          setIsBootstrappingAuth(false);
        }
      } catch {
        clearStoredAccessToken();
        if (!isCancelled) {
          setCurrentUser(null);
          setCurrentRole('ENGINEER');
          setIsAdmin(false);
          setIsAuthenticated(false);
          setIsBootstrappingAuth(false);
        }
      }
    }

    void bootstrapAuth();

    return () => {
      isCancelled = true;
    };
  }, [setCurrentRole, setCurrentUser, setIsAdmin, setIsAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated || isBootstrappingAuth) return;
    if (canAccessRoute(pathname, currentRole)) return;

    router.replace(getDefaultLandingPage(currentRole));
  }, [currentRole, isAuthenticated, isBootstrappingAuth, pathname, router]);

  if (isBootstrappingAuth) {
    return (
      <div className="flex h-screen items-center justify-center bg-black text-xs font-bold tracking-widest text-zinc-500 uppercase">
        Validating Session
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <LoginPanel
        onLogin={async (email, password) => {
          const session = await loginWithCredential(email, password);
          if (!session || !session.accessToken) {
            return false;
          }

          const claims = decodeJwtClaims(session.accessToken);
          if (!hasValidJwtClaims(claims)) {
            clearStoredAccessToken();
            return false;
          }

          storeAccessToken(session.accessToken);
          setCurrentUser(session.user);
          setCurrentRole(session.user.role);
          setIsAdmin(session.user.permissions.administration);
          setIsAuthenticated(true);
          router.replace(
            session.landingPage || getDefaultLandingPage(session.user.role)
          );
          return true;
        }}
      />
    );
  }

  return (
    <RecordingProvider>
      <div className="selection:bg-accent bg-surface-deep relative flex h-screen overflow-hidden selection:text-white">
        <div className="to-brand-gradient-end pointer-events-none absolute inset-0 z-0 bg-linear-to-br from-zinc-900 via-black"></div>
        <div className="pointer-events-none absolute top-[-20%] left-[-10%] z-0 h-[50%] w-[50%] rounded-full bg-zinc-600/10 blur-[150px]"></div>
        <div className="bg-accent/10 pointer-events-none absolute right-[-10%] bottom-[-20%] z-0 h-[50%] w-[50%] rounded-full blur-[150px]"></div>
        <div
          className="pointer-events-none absolute inset-0 z-0 opacity-[0.03]"
          style={{
            backgroundImage: 'radial-gradient(#999 1px, transparent 1px)',
            backgroundSize: '30px 30px',
          }}
        ></div>

        <AppSidebar />

        <main className="relative z-10 flex flex-1 flex-col overflow-y-auto">
          {children}
        </main>
      </div>
    </RecordingProvider>
  );
}
