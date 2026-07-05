'use client';

import React, { useState, useCallback, useEffect } from 'react';
import {
  User,
  Bell,
  Palette,
  Ruler,
  CreditCard,
  ShieldCheck,
  Check,
  ChevronRight,
  Sparkles,
  Zap,
  Globe,
  Save,
  AlertTriangle,
  Mail,
} from 'lucide-react';
import { usePlatform } from '@/context/PlatformContext';
import { PageHeader } from '@/components/layout/PageHeader';
import { updateAlertThresholds } from '@/lib/services/alertThresholdService';
import { fetchUsers } from '@/lib/services/administrationService';
import { fetchWithAuth } from '@/lib/authClient';
import { useEffect as useAsyncEffect } from 'react';
import {
  canEditLayouts,
  getAccessibleNavigationLabels,
} from '@/lib/navigationAccess';
import type { AlertThreshold, AdminUser } from '@/types';

// Save user theme colors to backend
async function saveUserThemeColors(
  userId: string,
  colors: Record<string, string | undefined>
) {
  await fetchWithAuth(
    `/api/users/${encodeURIComponent(userId)}/preferences/race-control-layout`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        theme: {
          primary: colors.userPrimaryColor,
          accent: colors.userAccentColor,
          accentGlow: colors.userAccentGlow,
          brandGradientEnd: colors.userBrandGradientEnd,
        },
      }),
    }
  );
}

type SettingsTab = 'display' | 'thresholds' | 'units' | 'billing' | 'profile';

function toDisplayRoleLabel(role: string) {
  return role.replace(/_/g, ' ');
}

export default function SettingsPage() {
  const {
    alertThresholds,
    setAlertThresholds,
    currentRole,
    currentUser,
    isAdmin,
  } = usePlatform();

  // Local state for 4 theme variables
  const [primaryColor, setPrimaryColor] = useState('#ff3333');
  const [accentColor, setAccentColor] = useState('#ff3333');
  const [accentGlow, setAccentGlow] = useState('rgba(255,51,51,0.4)');
  const [brandGradientEnd, setBrandGradientEnd] = useState('#2a0505');

  const [pendingPrimary, setPendingPrimary] = useState(primaryColor);
  const [pendingAccent, setPendingAccent] = useState(accentColor);
  const [pendingAccentGlow, setPendingAccentGlow] = useState(accentGlow);
  const [pendingBrandGradientEnd, setPendingBrandGradientEnd] =
    useState(brandGradientEnd);

  const [saveStatus, setSaveStatus] = useState<
    'idle' | 'saving' | 'saved' | 'error'
  >('idle');

  // Save all colors
  const handleSaveAll = async () => {
    if (!currentUser?.id) return;
    setSaveStatus('saving');
    try {
      await saveUserThemeColors(currentUser.id, {
        userPrimaryColor: pendingPrimary,
        userAccentColor: pendingAccent,
        userAccentGlow: pendingAccentGlow,
        userBrandGradientEnd: pendingBrandGradientEnd,
      });
      setPrimaryColor(pendingPrimary);
      setAccentColor(pendingAccent);
      setAccentGlow(pendingAccentGlow);
      setBrandGradientEnd(pendingBrandGradientEnd);
      document.documentElement.style.setProperty(
        '--user-primary-color',
        pendingPrimary
      );
      document.documentElement.style.setProperty(
        '--user-accent-color',
        pendingAccent
      );
      document.documentElement.style.setProperty(
        '--user-accent-glow',
        pendingAccentGlow
      );
      document.documentElement.style.setProperty(
        '--user-brand-gradient-end',
        pendingBrandGradientEnd
      );
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 2000);
    }
  };

  // Reset functions
  const resetPrimary = () => {
    setPendingPrimary('#ff3333');
    document.documentElement.style.removeProperty('--user-primary-color');
  };
  const resetAccent = () => {
    setPendingAccent('#ff3333');
    document.documentElement.style.removeProperty('--user-accent-color');
  };
  const resetAccentGlow = () => {
    setPendingAccentGlow('rgba(255,51,51,0.4)');
    document.documentElement.style.removeProperty('--user-accent-glow');
  };
  const resetBrandGradientEnd = () => {
    setPendingBrandGradientEnd('#2a0505');
    document.documentElement.style.removeProperty('--user-brand-gradient-end');
  };
  // Load colors from backend on mount (if available)
  useAsyncEffect(() => {
    if (!currentUser?.id) return;
    fetchWithAuth(
      `/api/users/${encodeURIComponent(currentUser.id)}/preferences/race-control-layout`
    )
      .then((res) => res.json())
      .then((data) => {
        if (data?.theme) {
          if (data.theme.primary) {
            setPrimaryColor(data.theme.primary);
            setPendingPrimary(data.theme.primary);
            document.documentElement.style.setProperty(
              '--user-primary-color',
              data.theme.primary
            );
          }
          if (data.theme.accent) {
            setAccentColor(data.theme.accent);
            setPendingAccent(data.theme.accent);
            document.documentElement.style.setProperty(
              '--user-accent-color',
              data.theme.accent
            );
          }
          if (data.theme.accentGlow) {
            setAccentGlow(data.theme.accentGlow);
            setPendingAccentGlow(data.theme.accentGlow);
            document.documentElement.style.setProperty(
              '--user-accent-glow',
              data.theme.accentGlow
            );
          }
          if (data.theme.brandGradientEnd) {
            setBrandGradientEnd(data.theme.brandGradientEnd);
            setPendingBrandGradientEnd(data.theme.brandGradientEnd);
            document.documentElement.style.setProperty(
              '--user-brand-gradient-end',
              data.theme.brandGradientEnd
            );
          }
        }
      })
      .catch(() => {});
  }, [currentUser?.id]);
  const [units, setUnits] = useState<'METRIC' | 'IMPERIAL'>('METRIC');
  const unitsSelectionLocked = true;
  const [activePlan, setActivePlan] = useState('PRO');
  const [activeTab, setActiveTab] = useState<SettingsTab>('thresholds');
  const [isSaving, setIsSaving] = useState(false);
  // Remove duplicate saveStatus, keep only one for theme color saving
  const [alertSaveStatus, setAlertSaveStatus] = useState<
    'idle' | 'saved' | 'error'
  >('idle');
  const [teamMembers, setTeamMembers] = useState<AdminUser[]>([]);

  // Local copy of thresholds for editing before committing
  const [draftThresholds, setDraftThresholds] =
    useState<AlertThreshold[]>(alertThresholds);

  const currentProfile: AdminUser | null = currentUser
    ? {
        id: currentUser.id,
        name: currentUser.name,
        role: currentRole,
        email: currentUser.email,
        access: currentUser.access,
      }
    : null;
  const currentCapabilities = currentUser
    ? [
        ...getAccessibleNavigationLabels(currentRole),
        ...(canEditLayouts(currentRole) ? ['Layout Editing'] : []),
      ]
    : [];

  const handleThresholdChange = useCallback(
    (id: string, field: 'warningValue' | 'criticalValue', raw: string) => {
      const value = parseFloat(raw);
      if (Number.isNaN(value)) return;
      setDraftThresholds((prev) =>
        prev.map((t) => (t.id === id ? { ...t, [field]: value } : t))
      );
    },
    []
  );

  const handleSaveThresholds = async () => {
    setIsSaving(true);
    setAlertSaveStatus('idle');
    try {
      await updateAlertThresholds(draftThresholds);
      setAlertThresholds(draftThresholds);
      setAlertSaveStatus('saved');
    } catch {
      setAlertSaveStatus('error');
    } finally {
      setIsSaving(false);
      setTimeout(() => setAlertSaveStatus('idle'), 3000);
    }
  };

  useEffect(() => {
    if (!isAdmin) {
      setTeamMembers([]);
      return;
    }

    void fetchUsers()
      .then(setTeamMembers)
      .catch(() => {
        setTeamMembers([]);
      });
  }, [isAdmin]);

  const plans = [
    {
      id: 'BASIC',
      name: 'Standard',
      price: '$0',
      features: ['Real-time Telemetry', '3 Car Maximum', '7-Day History'],
    },
    {
      id: 'PRO',
      name: 'Team Pro',
      price: '$49/mo',
      features: [
        'Advanced Analytics',
        'Unlimited Cars',
        'Cloud Vault Access',
        'Priority Support',
      ],
    },
    {
      id: 'ENTERPRISE',
      name: 'Works Team',
      price: '$299/mo',
      features: [
        'Dedicated Server',
        'Predictive AI',
        'API Connectivity',
        'White Labeling',
      ],
    },
  ];

  const navItems: {
    id: SettingsTab;
    icon: React.ElementType;
    label: string;
  }[] = [
    { id: 'thresholds', icon: Bell, label: 'Alert Thresholds' },
    { id: 'display', icon: Palette, label: 'Interface' },
    { id: 'units', icon: Ruler, label: 'Measurements' },
    { id: 'billing', icon: CreditCard, label: 'Subscription' },
    { id: 'profile', icon: User, label: 'User Profile' },
  ];

  return (
    <div className="flex h-screen w-full flex-col gap-4 overflow-hidden p-6 text-white">
      <PageHeader
        title="System Configuration"
        subtitle="Preferences & Account Management"
        actions={
          <div className="flex items-center gap-2 rounded-full border border-green-500/20 bg-green-500/10 px-3 py-1 text-[10px] font-black tracking-widest text-green-500 uppercase">
            <ShieldCheck className="h-3 w-3" /> Configuration Active
          </div>
        }
      />

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-7xl space-y-8 pb-8">
          <div className="grid grid-cols-1 gap-8 xl:grid-cols-12">
            {/* Sidebar nav */}
            <div className="space-y-1 xl:col-span-3">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex w-full items-center justify-between rounded-xl px-4 py-3 text-xs font-bold transition-all ${
                    activeTab === item.id
                      ? 'bg-isuzu-red shadow-isuzu-red/20 text-white shadow-lg'
                      : 'text-zinc-500 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </div>
                  {activeTab === item.id && (
                    <ChevronRight className="h-3 w-3" />
                  )}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="space-y-8 xl:col-span-9">
              {/* ── Alert Thresholds ── */}
              {activeTab === 'thresholds' && (
                <section className="rounded-2xl border border-white/10 bg-zinc-900/30 p-6">
                  <div className="mb-6 flex items-center justify-between">
                    <h3 className="text-isuzu-red flex items-center gap-3 text-sm font-black tracking-widest uppercase">
                      <Bell className="h-4 w-4" /> Alert Thresholds
                    </h3>
                    <div className="flex items-center gap-2">
                      {alertSaveStatus === 'saved' && (
                        <span className="text-[10px] font-bold tracking-widest text-green-500 uppercase">
                          Saved
                        </span>
                      )}
                      {alertSaveStatus === 'error' && (
                        <span className="flex items-center gap-1 text-[10px] font-bold tracking-widest text-red-500 uppercase">
                          <AlertTriangle className="h-3 w-3" /> Save Failed
                        </span>
                      )}
                      <button
                        onClick={() => void handleSaveThresholds()}
                        disabled={isSaving}
                        className="bg-isuzu-red flex items-center gap-2 rounded-xl px-4 py-2 text-[10px] font-black tracking-widest text-white uppercase transition-opacity hover:opacity-80 disabled:opacity-50"
                      >
                        <Save className="h-3 w-3" />
                        {isSaving ? 'Saving…' : 'Save'}
                      </button>
                    </div>
                  </div>

                  <p className="mb-6 text-[10px] font-medium tracking-widest text-zinc-500 uppercase">
                    These values sync across all sensor pages. Warning fires
                    first; critical triggers elevated alerts.
                  </p>

                  <div className="space-y-3">
                    {/* Header row */}
                    <div className="grid grid-cols-12 gap-3 px-2 text-[9px] font-bold tracking-widest text-zinc-600 uppercase">
                      <span className="col-span-4">Parameter</span>
                      <span className="col-span-1 text-center">Unit</span>
                      <span className="col-span-3 text-center text-yellow-600">
                        Warning
                      </span>
                      <span className="col-span-3 text-center text-red-600">
                        Critical
                      </span>
                    </div>

                    {draftThresholds.map((t) => (
                      <div
                        key={t.id}
                        className="grid grid-cols-12 items-center gap-3 rounded-xl border border-white/5 bg-black/20 px-4 py-3"
                      >
                        <span className="col-span-4 text-[10px] font-bold tracking-widest text-white uppercase">
                          {t.label}
                        </span>
                        <span className="col-span-1 text-center font-mono text-[10px] text-zinc-500">
                          {t.unit}
                        </span>
                        <div className="col-span-3">
                          <input
                            type="number"
                            value={t.warningValue}
                            onChange={(e) =>
                              handleThresholdChange(
                                t.id,
                                'warningValue',
                                e.target.value
                              )
                            }
                            className="w-full rounded-lg border border-yellow-600/30 bg-yellow-600/5 px-3 py-2 text-center font-mono text-xs text-yellow-400 focus:border-yellow-500 focus:outline-none"
                          />
                        </div>
                        <div className="col-span-3">
                          <input
                            type="number"
                            value={t.criticalValue}
                            onChange={(e) =>
                              handleThresholdChange(
                                t.id,
                                'criticalValue',
                                e.target.value
                              )
                            }
                            className="w-full rounded-lg border border-red-600/30 bg-red-600/5 px-3 py-2 text-center font-mono text-xs text-red-400 focus:border-red-500 focus:outline-none"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* ── Interface / Theme ── */}
              {activeTab === 'display' && (
                <section className="rounded-2xl border border-white/10 bg-zinc-900/30 p-6">
                  <h3 className="text-isuzu-red mb-6 flex items-center gap-3 text-sm font-black tracking-widest uppercase">
                    <Palette className="h-4 w-4" /> Visual Identity
                  </h3>
                  <div className="flex flex-col gap-6">
                    {/* PRIMARY */}
                    <div className="flex items-center gap-4">
                      <label className="text-xs font-bold tracking-widest text-zinc-400 uppercase">
                        Primary
                      </label>
                      <input
                        type="color"
                        value={pendingPrimary}
                        onChange={(e) => setPendingPrimary(e.target.value)}
                        className="h-10 w-20 rounded border-2 border-white/20 bg-transparent"
                      />
                      <span className="ml-2 font-mono text-xs text-zinc-400">
                        {pendingPrimary}
                      </span>
                      <button
                        onClick={resetPrimary}
                        className="ml-2 rounded bg-zinc-700 px-3 py-1 text-xs font-bold text-white uppercase hover:bg-zinc-600"
                      >
                        Reset
                      </button>
                    </div>
                    {/* ACCENT */}
                    <div className="flex items-center gap-4">
                      <label className="text-xs font-bold tracking-widest text-zinc-400 uppercase">
                        Accent
                      </label>
                      <input
                        type="color"
                        value={pendingAccent}
                        onChange={(e) => setPendingAccent(e.target.value)}
                        className="h-10 w-20 rounded border-2 border-white/20 bg-transparent"
                      />
                      <span className="ml-2 font-mono text-xs text-zinc-400">
                        {pendingAccent}
                      </span>
                      <button
                        onClick={resetAccent}
                        className="ml-2 rounded bg-zinc-700 px-3 py-1 text-xs font-bold text-white uppercase hover:bg-zinc-600"
                      >
                        Reset
                      </button>
                    </div>
                    {/* ACCENT GLOW */}
                    <div className="flex items-center gap-4">
                      <label className="text-xs font-bold tracking-widest text-zinc-400 uppercase">
                        Accent Glow
                      </label>
                      <input
                        type="color"
                        value={(() => {
                          // Convert rgba or hex to hex for color input
                          if (pendingAccentGlow.startsWith('#'))
                            return pendingAccentGlow;
                          const match = pendingAccentGlow.match(
                            /rgba?\((\d+), ?(\d+), ?(\d+)(?:, ?([\d.]+))?\)/
                          );
                          if (match) {
                            const r = parseInt(match[1]);
                            const g = parseInt(match[2]);
                            const b = parseInt(match[3]);
                            return (
                              '#' +
                              [r, g, b]
                                .map((x) => x.toString(16).padStart(2, '0'))
                                .join('')
                            );
                          }
                          return '#ff3333';
                        })()}
                        onChange={(e) => {
                          // Keep alpha if present, else default to 0.4
                          let alpha = 0.4;
                          const match = pendingAccentGlow.match(
                            /rgba?\((\d+), ?(\d+), ?(\d+), ?([\d.]+)\)/
                          );
                          if (match && match[4]) alpha = parseFloat(match[4]);
                          const hex = e.target.value;
                          const r = parseInt(hex.slice(1, 3), 16);
                          const g = parseInt(hex.slice(3, 5), 16);
                          const b = parseInt(hex.slice(5, 7), 16);
                          setPendingAccentGlow(`rgba(${r},${g},${b},${alpha})`);
                        }}
                        className="h-10 w-20 rounded border-2 border-white/20 bg-transparent"
                      />
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.01}
                        value={(() => {
                          const match = pendingAccentGlow.match(
                            /rgba?\((\d+), ?(\d+), ?(\d+), ?([\d.]+)\)/
                          );
                          if (match && match[4]) return match[4];
                          return 0.4;
                        })()}
                        onChange={(e) => {
                          // Update alpha only
                          const alpha = parseFloat(e.target.value);
                          const match = pendingAccentGlow.match(
                            /rgba?\((\d+), ?(\d+), ?(\d+)(?:, ?([\d.]+))?\)/
                          );
                          let r = 255,
                            g = 51,
                            b = 51;
                          if (match) {
                            r = parseInt(match[1]);
                            g = parseInt(match[2]);
                            b = parseInt(match[3]);
                          }
                          setPendingAccentGlow(`rgba(${r},${g},${b},${alpha})`);
                        }}
                        className="w-24"
                        aria-label="Accent Glow Alpha"
                      />
                      <span className="ml-2 font-mono text-xs text-zinc-400">
                        {pendingAccentGlow}
                      </span>
                      <button
                        onClick={resetAccentGlow}
                        className="ml-2 rounded bg-zinc-700 px-3 py-1 text-xs font-bold text-white uppercase hover:bg-zinc-600"
                      >
                        Reset
                      </button>
                    </div>
                    {/* BRAND GRADIENT END */}
                    <div className="flex items-center gap-4">
                      <label className="text-xs font-bold tracking-widest text-zinc-400 uppercase">
                        Brand Gradient End
                      </label>
                      <input
                        type="color"
                        value={pendingBrandGradientEnd}
                        onChange={(e) =>
                          setPendingBrandGradientEnd(e.target.value)
                        }
                        className="h-10 w-20 rounded border-2 border-white/20 bg-transparent"
                      />
                      <span className="ml-2 font-mono text-xs text-zinc-400">
                        {pendingBrandGradientEnd}
                      </span>
                      <button
                        onClick={resetBrandGradientEnd}
                        className="ml-2 rounded bg-zinc-700 px-3 py-1 text-xs font-bold text-white uppercase hover:bg-zinc-600"
                      >
                        Reset
                      </button>
                    </div>
                    {/* SAVE BUTTON */}
                    <div className="mt-4 flex items-center gap-4">
                      <button
                        onClick={handleSaveAll}
                        disabled={saveStatus === 'saving'}
                        className={`rounded-lg px-6 py-2 text-xs font-bold uppercase transition-colors ${
                          saveStatus === 'saving'
                            ? 'cursor-not-allowed bg-zinc-700 text-zinc-400'
                            : 'bg-green-600 text-white hover:bg-green-700'
                        }`}
                      >
                        Save All
                      </button>
                      {saveStatus === 'saved' && (
                        <span className="flex items-center gap-1 text-xs font-bold text-green-400">
                          <Check className="h-4 w-4" /> Saved
                        </span>
                      )}
                      {saveStatus === 'saving' && (
                        <span className="text-xs font-bold text-yellow-400">
                          Saving…
                        </span>
                      )}
                      {saveStatus === 'error' && (
                        <span className="text-xs font-bold text-red-400">
                          Save Failed
                        </span>
                      )}
                    </div>
                  </div>
                </section>
              )}

              {/* ── Units ── */}
              {activeTab === 'units' && (
                <section className="rounded-2xl border border-white/10 bg-zinc-900/30 p-6">
                  <h3 className="text-isuzu-red mb-6 flex items-center gap-3 text-sm font-black tracking-widest uppercase">
                    <Ruler className="h-4 w-4" /> Regional Units
                  </h3>
                  <div className="flex gap-4">
                    {(['METRIC', 'IMPERIAL'] as const).map((u) => (
                      <button
                        key={u}
                        type="button"
                        disabled={unitsSelectionLocked}
                        onClick={() => {
                          if (!unitsSelectionLocked) setUnits(u);
                        }}
                        className={`flex-1 rounded-xl border p-6 text-center transition-all ${
                          units === u
                            ? 'border-isuzu-red bg-isuzu-red/10 text-white'
                            : 'border-white/5 bg-black/40 text-zinc-500 hover:border-white/20'
                        } ${unitsSelectionLocked ? 'cursor-not-allowed opacity-80' : ''}`}
                      >
                        <span className="block text-xl font-black tracking-tighter uppercase">
                          {u}
                        </span>
                        <span className="mt-1 text-[10px] font-bold opacity-60">
                          {u === 'METRIC'
                            ? 'KM/H • CELSIUS • BAR'
                            : 'MPH • FAHRENHEIT • PSI'}
                        </span>
                      </button>
                    ))}
                  </div>
                  {unitsSelectionLocked && (
                    <p className="mt-3 text-xs font-semibold tracking-wide text-zinc-500 uppercase">
                      Unit switching is temporarily locked.
                    </p>
                  )}
                </section>
              )}

              {/* ── Billing ── */}
              {activeTab === 'billing' && (
                <section className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-isuzu-red flex items-center gap-3 text-sm font-black tracking-widest uppercase">
                      <CreditCard className="h-4 w-4" /> Access Level
                    </h3>
                    <div className="bg-isuzu-red/10 text-isuzu-red flex items-center gap-2 rounded-full px-3 py-1 text-[10px] font-black tracking-widest uppercase">
                      <Sparkles className="h-3 w-3" /> Professional Active
                    </div>
                  </div>
                  <div className="grid gap-3">
                    {plans.map((plan) => (
                      <div
                        key={plan.id}
                        onClick={() => setActivePlan(plan.id)}
                        className={`group relative cursor-pointer overflow-hidden rounded-2xl border p-6 transition-all ${
                          activePlan === plan.id
                            ? 'border-isuzu-red bg-isuzu-red/5'
                            : 'border-white/5 bg-zinc-900/30 hover:border-white/10'
                        }`}
                      >
                        {activePlan === plan.id && (
                          <div className="bg-isuzu-red absolute top-0 right-0 rounded-bl-xl px-3 py-1 text-[8px] font-black text-white uppercase">
                            Current
                          </div>
                        )}
                        <div className="flex items-center justify-between gap-6">
                          <div className="space-y-4">
                            <div>
                              <h4 className="text-xs font-black tracking-widest text-white uppercase">
                                {plan.name}
                              </h4>
                              <p className="mt-1 font-mono text-2xl font-black text-white">
                                {plan.price}
                              </p>
                            </div>
                            <div className="flex flex-wrap gap-x-4 gap-y-1">
                              {plan.features.map((f) => (
                                <div
                                  key={f}
                                  className="flex items-center gap-1.5 text-[9px] font-bold text-zinc-500"
                                >
                                  <Check className="text-isuzu-red h-3 w-3" />{' '}
                                  {f}
                                </div>
                              ))}
                            </div>
                          </div>
                          <div
                            className={`hidden h-12 w-12 items-center justify-center rounded-xl transition-all sm:flex ${
                              activePlan === plan.id
                                ? 'bg-isuzu-red text-white'
                                : 'bg-white/5 text-zinc-700'
                            }`}
                          >
                            {plan.id === 'BASIC' ? (
                              <Zap className="h-6 w-6" />
                            ) : plan.id === 'PRO' ? (
                              <Sparkles className="h-6 w-6" />
                            ) : (
                              <Globe className="h-6 w-6" />
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {activeTab === 'profile' && (
                <section className="rounded-2xl border border-white/10 bg-zinc-900/30 p-6">
                  <div className="mb-6 flex items-center justify-between">
                    <h3 className="text-isuzu-red flex items-center gap-3 text-sm font-black tracking-widest uppercase">
                      <User className="h-4 w-4" /> Current Session
                    </h3>
                    {currentProfile ? (
                      <span className="rounded-full border border-white/10 bg-black/30 px-3 py-1 text-[10px] font-black tracking-widest text-zinc-400 uppercase">
                        {currentProfile.role}
                      </span>
                    ) : null}
                  </div>

                  <div className="space-y-4">
                    {currentProfile ? (
                      <div className="rounded-xl border border-white/5 bg-black/20 p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="text-sm font-bold text-white">
                              {currentProfile.name}
                            </div>
                            <div className="mt-1 flex items-center gap-2 text-[11px] text-zinc-400">
                              <Mail className="h-3 w-3" />
                              {currentProfile.email}
                            </div>
                            <div className="mt-3 text-[10px] font-bold tracking-widest text-zinc-500 uppercase">
                              Role: {toDisplayRoleLabel(currentProfile.role)}
                            </div>
                          </div>
                          <span className="rounded border border-white/10 bg-black/40 px-2 py-1 text-[10px] font-bold tracking-widest text-zinc-300 uppercase">
                            Active Session
                          </span>
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2">
                          {currentCapabilities.length > 0 ? (
                            currentCapabilities.map((capability) => (
                              <span
                                key={capability}
                                className="rounded border border-white/10 bg-black/40 px-2 py-1 text-[10px] font-bold tracking-widest text-zinc-300 uppercase"
                              >
                                {capability}
                              </span>
                            ))
                          ) : (
                            <span className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase">
                              No capabilities available.
                            </span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-xl border border-dashed border-white/10 bg-black/20 p-6 text-[11px] text-zinc-500">
                        Current session data is unavailable. Sign in again to
                        refresh the active identity.
                      </div>
                    )}

                    {isAdmin ? (
                      <>
                        <div className="flex items-center justify-between pt-2">
                          <h4 className="text-[10px] font-black tracking-widest text-zinc-500 uppercase">
                            User Directory
                          </h4>
                          <span className="rounded-full border border-white/10 bg-black/30 px-3 py-1 text-[10px] font-black tracking-widest text-zinc-400 uppercase">
                            {teamMembers.length} Accounts
                          </span>
                        </div>

                        {teamMembers.length > 0 ? (
                          teamMembers.map((member) => (
                            <div
                              key={member.id}
                              className="rounded-xl border border-white/5 bg-black/20 p-4"
                            >
                              <div className="flex items-start justify-between gap-4">
                                <div>
                                  <div className="text-sm font-bold text-white">
                                    {member.name}
                                  </div>
                                  <div className="mt-1 flex items-center gap-2 text-[11px] text-zinc-400">
                                    <Mail className="h-3 w-3" />
                                    {member.email}
                                  </div>
                                  <div className="mt-3 text-[10px] font-bold tracking-widest text-zinc-500 uppercase">
                                    Role: {toDisplayRoleLabel(member.role)}
                                  </div>
                                </div>
                                <span className="rounded border border-white/10 bg-black/40 px-2 py-1 text-[10px] font-bold tracking-widest text-zinc-300 uppercase">
                                  {member.access}
                                </span>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="rounded-xl border border-dashed border-white/10 bg-black/20 p-6 text-[11px] text-zinc-500">
                            No user data available from the Administration API.
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-[11px] text-amber-200">
                        Team directory visibility is restricted to administrator
                        accounts. Non-admin users only see their active session
                        identity here.
                      </div>
                    )}
                  </div>
                </section>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
