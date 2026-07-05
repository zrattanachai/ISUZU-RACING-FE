'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { ResponsiveGridLayout, useContainerWidth } from 'react-grid-layout';
import type { Layout } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

import { AlertsPanel } from '@/components/features/dashboard/AlertsPanel';
import { ConnectionPanel } from '@/components/features/dashboard/ConnectionPanel';
import { DashboardHeader } from '@/components/features/dashboard/DashboardHeader';
import { SensorTelemetryPanel } from '@/components/features/dashboard/SensorTelemetryPanel';
import { AccessDeniedState } from '@/components/common/AccessDeniedState';
import { usePlatform } from '@/context/PlatformContext';
import { useCarAlerts } from '@/hooks/useCarAlerts';
import { fetchWithAuth } from '@/lib/authClient';
import { useRaceControlSnapshot } from '@/hooks/useRaceControlSnapshot';
import { useVehicleSensors } from '@/hooks/useVehicleSensors';
import { useVehicleStatus } from '@/hooks/useVehicleStatus';
import {
  createDefaultSensorLayout,
  INITIAL_MAIN_LAYOUT,
} from '@/lib/dashboard';
import { canAccessRoute, canEditLayouts } from '@/lib/navigationAccess';
import { SENSOR_CATEGORY_KEYS } from '@/types/dashboard';
import type { SensorCategoryKey, SensorLayouts } from '@/types/dashboard';

export default function DashboardPage() {
  const { cars, drivers, activeCarId, setActiveCarId, currentRole } =
    usePlatform();
  const { containerRef: mainRef, width: mainWidth } = useContainerWidth();
  const { containerRef: sensorGridRef, width: sensorGridWidth } =
    useContainerWidth();

  const [activeSensorTab, setActiveSensorTab] =
    useState<SensorCategoryKey>('POWERTRAIN');
  const [isEditMode, setIsEditMode] = useState(false);
  const [mainLayout, setMainLayout] = useState<Layout>(INITIAL_MAIN_LAYOUT);
  const [sensorLayouts, setSensorLayouts] = useState<SensorLayouts>({});
  const selectedCarId = activeCarId;
  const canEditLayout = canEditLayouts(currentRole);

  // Load saved layout on mount.
  useEffect(() => {
    fetchWithAuth('/api/users/local/preferences/race-control-layout')
      .then((res) => (res.ok ? res.json() : null))
      .then(
        (
          data: { mainLayout?: Layout; sensorLayouts?: SensorLayouts } | null
        ) => {
          if (data?.mainLayout) setMainLayout(data.mainLayout);
          if (data?.sensorLayouts) setSensorLayouts(data.sensorLayouts);
        }
      )
      .catch(() => {});
  }, []);

  // Save layout when the user exits edit mode.
  const prevEditModeRef = useRef(false);
  useEffect(() => {
    if (prevEditModeRef.current && !isEditMode) {
      fetchWithAuth('/api/users/local/preferences/race-control-layout', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mainLayout, sensorLayouts }),
      }).catch(() => {});
    }
    prevEditModeRef.current = isEditMode;
  }, [isEditMode, mainLayout, sensorLayouts]);

  const activeCar = useMemo(
    () => cars.find((car) => car.id === selectedCarId),
    [cars, selectedCarId]
  );
  const activeDriver = useMemo(
    () => drivers.find((driver) => driver.carId === selectedCarId),
    [drivers, selectedCarId]
  );
  const driverNamesByCarId = useMemo(
    () =>
      new Map(drivers.map((driver) => [driver.carId, driver.name] as const)),
    [drivers]
  );
  const {
    alerts,
    alertIds,
    isLoading: isAlertsLoading,
    refresh: refreshAlerts,
  } = useCarAlerts(selectedCarId);
  const [isAcknowledgingAlerts, setIsAcknowledgingAlerts] = useState(false);
  const { snapshot, isLoading: isSnapshotLoading } =
    useRaceControlSnapshot(selectedCarId);
  const { sensorCategories: liveSensorCategories } =
    useVehicleSensors(selectedCarId);
  const { status: vehicleStatus } = useVehicleStatus(selectedCarId);

  // WS data takes over as soon as the socket delivers; snapshot is the initial paint.
  const activeSensors = useMemo(
    () =>
      (liveSensorCategories ?? snapshot?.sensorCategories)?.[activeSensorTab] ??
      [],
    [liveSensorCategories, snapshot, activeSensorTab]
  );

  const handleSensorLayoutChange = (layout: Layout) => {
    // Only persist user-edited layouts (edit mode).
    // Ignore auto-fired onChange during initial render (width=0) which
    // would corrupt the default 3-column layout for the initial tab.
    if (!isEditMode) return;
    setSensorLayouts((currentLayouts) => ({
      ...currentLayouts,
      [activeSensorTab]: layout,
    }));
  };

  const activeSensorLayout = useMemo(() => {
    const defaultLayout = createDefaultSensorLayout(activeSensors.length);
    const saved = sensorLayouts[activeSensorTab];
    if (!saved) return defaultLayout;
    // Merge: use saved positions for known items, fall back to default for new ones.
    return defaultLayout.map(
      (item) => saved.find((s) => s.i === item.i) ?? item
    );
  }, [activeSensorTab, activeSensors.length, sensorLayouts]);

  const handleAcknowledgeAllAlerts = async () => {
    if (selectedCarId <= 0 || alertIds.length === 0) return;
    setIsAcknowledgingAlerts(true);
    try {
      const response = await fetchWithAuth(
        `/api/cars/${selectedCarId}/alerts/acknowledge`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ alertIds }),
        }
      );
      if (!response.ok) throw new Error('Failed to acknowledge alerts');
      await refreshAlerts();
    } catch {
      await refreshAlerts();
    } finally {
      setIsAcknowledgingAlerts(false);
    }
  };

  if (!canAccessRoute('/', currentRole)) {
    return (
      <AccessDeniedState message="Your role does not have access to the All Sensors dashboard." />
    );
  }

  return (
    <div className="flex h-screen w-full flex-col gap-4 overflow-hidden p-6">
      <DashboardHeader
        activeCarId={selectedCarId}
        activeCar={activeCar}
        activeDriver={activeDriver}
        cars={cars}
        driverNamesByCarId={driverNamesByCarId}
        onActiveCarChange={setActiveCarId}
      />

      <div
        ref={mainRef}
        className="custom-scrollbar relative min-h-0 flex-1 overflow-y-auto"
      >
        <ResponsiveGridLayout
          className="layout"
          layouts={{ lg: mainLayout }}
          breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
          cols={{ lg: 12, md: 12, sm: 6, xs: 4, xxs: 2 }}
          rowHeight={100}
          width={mainWidth}
          dragConfig={{ enabled: false }}
          resizeConfig={{ enabled: false }}
          margin={[16, 16] as const}
          onLayoutChange={(newLayout) => setMainLayout(newLayout)}
        >
          <div key="sensors" className="h-full">
            <SensorTelemetryPanel
              activeTab={activeSensorTab}
              availableTabs={
                SENSOR_CATEGORY_KEYS as unknown as SensorCategoryKey[]
              }
              canEditLayout={canEditLayout}
              isEditMode={isEditMode}
              layout={activeSensorLayout}
              sensorGridRef={sensorGridRef}
              sensorGridWidth={sensorGridWidth}
              sensors={activeSensors}
              onLayoutChange={handleSensorLayoutChange}
              onTabChange={setActiveSensorTab}
              onToggleEditMode={() => {
                if (!canEditLayout) {
                  return;
                }
                setIsEditMode((currentValue) => !currentValue);
              }}
            />
          </div>

          <div key="alerts" className="h-full">
            <AlertsPanel
              alerts={alerts}
              title={
                isAlertsLoading
                  ? 'Active System Alerts (Loading...)'
                  : 'Active System Alerts'
              }
              onAcknowledgeAll={handleAcknowledgeAllAlerts}
              isAcknowledging={isAcknowledgingAlerts || isAlertsLoading}
            />
          </div>

          <div key="connection" className="h-full">
            <ConnectionPanel
              state={
                vehicleStatus?.connectionState ??
                snapshot?.connection.state ??
                'offline'
              }
              latencyMs={
                vehicleStatus?.latencyMs ?? snapshot?.connection.latencyMs ?? 0
              }
              boxName={snapshot?.connection.boxName}
              firmwareVersion={snapshot?.connection.firmwareVersion}
              isLoading={isSnapshotLoading && !vehicleStatus}
            />
          </div>
        </ResponsiveGridLayout>
      </div>
    </div>
  );
}
