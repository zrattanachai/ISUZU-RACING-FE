'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Activity,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Menu,
  FolderOpen,
  FileBarChart,
  Tv2,
  Eye,
  Crown,
  Shield,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useOptionalPlatform } from '@/context/PlatformContext';
import { DEFAULT_BRAND_CONFIG } from '@/lib/constants';
import { clearStoredAccessToken } from '@/lib/authClient';
import type { UserRole } from '@/lib/authClient';
import { canAccessRoute } from '@/lib/navigationAccess';

interface AppSidebarProps {
  className?: string;
  mockIsAdmin?: boolean;
  onLogout?: () => void;
}

interface NavItem {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}

export function AppSidebar({
  className,
  mockIsAdmin,
  onLogout,
}: AppSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const pathname = usePathname();

  const context = useOptionalPlatform();

  // Allow fallback for isolated Storybook rendering
  let isAdmin = false;
  let currentRole: UserRole = 'ADMIN';
  let handleLogout = onLogout || (() => console.log('Logout triggered'));
  let platformName = DEFAULT_BRAND_CONFIG.platformName;
  let logoUrl = DEFAULT_BRAND_CONFIG.logoUrl;

  if (context) {
    isAdmin = mockIsAdmin !== undefined ? mockIsAdmin : context.isAdmin;
    currentRole = context.currentRole;
    handleLogout =
      onLogout ||
      (() => {
        clearStoredAccessToken();
        context.setCurrentUser(null);
        context.setCurrentRole('ENGINEER');
        context.setIsAdmin(false);
        context.setIsAuthenticated(false);
      });
    platformName = context.platformName;
    logoUrl = context.logoUrl;
  } else {
    isAdmin = mockIsAdmin !== undefined ? mockIsAdmin : true;
    currentRole = isAdmin ? 'ADMIN' : 'ENGINEER';
  }

  const navItems: NavItem[] = [
    { href: '/', icon: LayoutDashboard, label: 'All Sensors' },
    { href: '/engineering', icon: Activity, label: 'Engineering' },
    { href: '/live', icon: Tv2, label: 'Live Stream' },
    { href: '/overview-director', icon: Shield, label: 'Overview Director' },
    {
      href: '/director',
      icon: Eye,
      label: currentRole === 'COMPETITOR' ? 'Driver Graph' : 'Director Graph',
    },
    { href: '/report', icon: FileBarChart, label: 'Report' },
    { href: '/files', icon: FolderOpen, label: 'Video' },
    { href: '/administration', icon: Crown, label: 'Administration' },
  ];

  const filteredNavItems = navItems.filter((item) =>
    canAccessRoute(item.href, currentRole)
  );

  return (
    <aside
      className={cn(
        'glass-panel bg-surface/50 relative z-20 flex h-screen flex-col border-r border-white/10 backdrop-blur-md transition-all duration-300',
        isCollapsed ? 'w-20' : 'w-64',
        className
      )}
    >
      {/* Collapse Toggle */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute top-8 -right-3 z-50 cursor-pointer rounded-full border border-white/20 bg-zinc-900 p-1 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
        aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {isCollapsed ? (
          <ChevronRight className="h-3 w-3" />
        ) : (
          <ChevronLeft className="h-3 w-3" />
        )}
      </button>

      {/* Brand Header */}
      <div className="flex h-20 items-center justify-center overflow-hidden border-b border-white/10 px-4">
        {isCollapsed ? (
          <Menu className="h-6 w-6 text-zinc-400" />
        ) : (
          <div className="relative flex w-full items-center justify-center px-2">
            <div className="pointer-events-none absolute inset-0 scale-110 rounded-full bg-white/5 blur-lg"></div>
            <Image
              src={logoUrl}
              alt={`${platformName} Logo`}
              width={120}
              height={60}
              className="relative z-10 h-10 w-auto object-contain brightness-110 drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]"
              priority
              quality={100}
              unoptimized
            />
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-2 overflow-y-auto px-3 py-6">
        {filteredNavItems.map((item) => {
          const isActive = pathname === item.href;

          const className = cn(
            'w-full flex items-center gap-3 px-3 py-3 rounded-md transition-all duration-200 text-sm font-light group relative',
            isActive
              ? 'bg-white/10 text-white border border-white/5 shadow-inner'
              : 'text-zinc-500 hover:text-white hover:bg-white/5 cursor-pointer',
            isCollapsed && 'justify-center'
          );

          const content = (
            <>
              <item.icon
                className={cn(
                  'h-5 w-5 shrink-0',
                  isActive
                    ? 'text-accent'
                    : 'group-hover:text-zinc-300'
                )}
              />

              {!isCollapsed && (
                <span className="whitespace-nowrap opacity-100 transition-opacity duration-200">
                  {item.label}
                </span>
              )}

              {/* Tooltip for collapsed state */}
              {isCollapsed && (
                <div className="pointer-events-none absolute left-full z-50 ml-4 rounded border border-white/10 bg-zinc-800 px-2 py-1 text-xs whitespace-nowrap text-white opacity-0 group-hover:opacity-100">
                  {item.label}
                </div>
              )}
            </>
          );

          return (
            <Link key={item.href} href={item.href} className={className}>
              {content}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Actions */}
      <div className="space-y-1 border-t border-white/10 p-3">
        {canAccessRoute('/settings', currentRole) ? (
          <Link
            href="/settings"
            className={cn(
              'group flex w-full items-center gap-3 rounded-md px-3 py-3 text-sm font-light transition-all duration-200',
              pathname === '/settings'
                ? 'bg-white/10 text-white'
                : 'text-zinc-500 hover:bg-white/5 hover:text-white',
              isCollapsed && 'justify-center'
            )}
          >
            <Settings className="h-5 w-5 shrink-0" />
            {!isCollapsed && <span>Settings</span>}
          </Link>
        ) : null}
        <button
          onClick={handleLogout}
          className={cn(
            'group flex w-full cursor-pointer items-center gap-3 rounded-md px-3 py-3 text-sm font-light text-zinc-500 transition-all duration-200 hover:bg-red-500/10 hover:text-red-400',
            isCollapsed && 'justify-center'
          )}
        >
          <LogOut className="h-5 w-5 shrink-0" />
          {!isCollapsed && <span>Disconnect</span>}
        </button>
      </div>
    </aside>
  );
}
