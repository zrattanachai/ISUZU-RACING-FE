'use client';

import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
} from 'react';
import { Activity, Brain, HeartPulse, Wind } from 'lucide-react';
import { ResponsiveGridLayout, useContainerWidth } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

import { usePlatform } from '@/context/PlatformContext';
import { MapWidget } from '@/components/features/MapWidget';
import { getCircuit } from '@/lib/circuits';
import { ControlTelemetry } from '@/components/features/ControlTelemetry';
import { TelemetryHubPanel } from '@/components/features/TelemetryHubPanel';
import { StatusPanel } from '@/components/features/StatusPanel';
import { GapAnalysisPanel } from '@/components/features/GapAnalysisPanel';
import { EngineeringHeader } from '@/components/features/EngineeringHeader';
import { AlertsPanel } from '@/components/features/dashboard/AlertsPanel';
import { AccessDeniedState } from '@/components/common/AccessDeniedState';
import { MaximizableView } from '@/components/common/MaximizableView';
import { CameraWidget } from '@/components/features/CameraWidget';
import { ConditionsWidget } from '@/components/features/ConditionsWidget';
import { SaveRecordingModal } from '@/components/features/SaveRecordingModal';
import { useCarAlerts } from '@/hooks/useCarAlerts';
import { useFleetLocation } from '@/hooks/useFleetLocation';
import { useVehicleTelemetry } from '@/hooks/useVehicleTelemetry';
import { useVehicleBiometrics } from '@/hooks/useVehicleBiometrics';
import { useVehicleStatus } from '@/hooks/useVehicleStatus';
import { useVehicleStream } from '@/hooks/useVehicleStream';
import { fetchWithAuth } from '@/lib/authClient';
import { useRecording } from '@/hooks/useRecording';
import { canAccessRoute, canEditLayouts } from '@/lib/navigationAccess';
import { cn } from '@/lib/utils';

import {
  type EngineeringTelemetryPoint,
  type EngineeringLayoutItem,
  type EngineeringStatusData,
  type EngineeringGapRival,
  type EngineeringMapRival,
  DEFAULT_ENG_POINT,
  DEFAULT_ENGINEERING_STATUS,
  INITIAL_ENGINEERING_LAYOUT,
  buildPointFromWs,
} from './types';

const DISABLED_WIDGET_IDS = new Set(['speed_rpm']);
const STATUS_WIDGET_HEIGHT = 2;
const CONTROLS_WIDGET_HEIGHT = 2;
const ENGINEERING_WIDGET_TITLES: Record<string, string> = {
  alerts: 'ALERTS',
  status: 'STATUS',
  telemetry_hub: 'TELEMETRY HUB',
  heart: 'HEART RATE',
  controls: 'CONTROLS',
  map: 'TRACK MAP',
  gap_analysis: 'GAP ANALYSIS',
  cameras: 'CAMERAS',
  respiration: 'RESPIRATION',
  stress: 'STRESS LEVEL',
  conditions: 'CONDITIONS',
  quick_graph: 'QUICK GRAPH',
};

function normalizeEngineeringLayout(layout: EngineeringLayoutItem[]) {
  const normalized = layout
    .filter((item) => !DISABLED_WIDGET_IDS.has(item.i))
    .map((item) =>
      item.i === 'status'
        ? { ...item, h: STATUS_WIDGET_HEIGHT }
        : item.i === 'controls'
          ? {
              ...item,
              h: CONTROLS_WIDGET_HEIGHT,
            }
          : item
    );
  const existingIds = new Set(normalized.map((item) => item.i));
  const missingDefaults = INITIAL_ENGINEERING_LAYOUT.filter(
    (item) => !DISABLED_WIDGET_IDS.has(item.i) && !existingIds.has(item.i)
  );

  return [...normalized, ...missingDefaults];
}

type EngineeringGraphMetricKey =
  | 'speed'
  | 'rpm'
  | 'boost'
  | 'lambda'
  | 'throttle'
  | 'brake'
  | 'heartRate'
  | 'respiration'
  | 'stressLevel'
  | 'gLat'
  | 'gLong';

const ENGINEERING_GRAPH_METRICS: Array<{
  key: EngineeringGraphMetricKey;
  label: string;
  unit: string;
  color: string;
}> = [
  { key: 'speed', label: 'Speed', unit: 'km/h', color: '#ec4899' },
  { key: 'rpm', label: 'RPM', unit: 'rpm', color: '#3b82f6' },
  { key: 'boost', label: 'Boost', unit: 'kPa', color: '#fb923c' },
  { key: 'lambda', label: 'Lambda', unit: 'λ', color: '#eab308' },
  { key: 'throttle', label: 'Throttle', unit: '%', color: '#22c55e' },
  { key: 'brake', label: 'Brake', unit: '%', color: '#ef4444' },
  { key: 'heartRate', label: 'Heart Rate', unit: 'BPM', color: '#f43f5e' },
  { key: 'respiration', label: 'Respiration', unit: 'BR/MIN', color: '#06b6d4' },
  { key: 'stressLevel', label: 'Stress Level', unit: '%', color: '#facc15' },
  { key: 'gLat', label: 'G Lat', unit: 'g', color: '#a855f7' },
  { key: 'gLong', label: 'G Long', unit: 'g', color: '#14b8a6' },
];

export default function EngineeringPage() {
  const toCarNumberKey = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return '';
    const numeric = Number(trimmed);
    return Number.isFinite(numeric)
      ? String(Math.trunc(numeric)).padStart(2, '0')
      : trimmed.toUpperCase();
  };

  const {
    cars,
    currentRole,
    currentUser,
    drivers,
    activeCarId: activeRacerId,
    setActiveCarId: setActiveRacerId,
    activeCircuitId,
  } = usePlatform();
  const { containerRef: gridRef, width: gridWidth } = useContainerWidth();
  const canEditLayout = canEditLayouts(currentRole);

  // --- STATE ---
  const [history, setHistory] = useState<EngineeringTelemetryPoint[]>([]);
  const [isPaused] = useState(false);
  const [playbackIndex, setPlaybackIndex] = useState<number>(0);
  const [editMode, setEditMode] = useState(false);
  const [maximizedSection, setMaximizedSection] = useState<string | null>(null);
  const [hiddenWidgets, setHiddenWidgets] = useState<string[]>([]);
  const [layout, setLayout] = useState<EngineeringLayoutItem[]>(
    normalizeEngineeringLayout(INITIAL_ENGINEERING_LAYOUT)
  );
  const recording = useRecording({
    vehicleId: activeRacerId,
    sourcePage: 'ENGINEERING',
    requestedBy: currentUser?.name ?? 'Engineering Operator',
  });
  const [isAcknowledgingAlerts, setIsAcknowledgingAlerts] = useState(false);
  const [statusData, setStatusData] = useState<EngineeringStatusData>(
    DEFAULT_ENGINEERING_STATUS
  );
  const [circuitName, setCircuitName] = useState('');
  const [rivalComparisons, setRivalComparisons] = useState<
    EngineeringGapRival[]
  >([]);
  const [totalLaps, setTotalLaps] = useState(0);
  const [activeFlag, setActiveFlag] = useState<{
    turn: string;
    type: 'YELLOW' | 'RED' | 'GREEN';
  } | null>(null);
  const [activeCamera, setActiveCamera] = useState<
    'FRONT' | 'COCKPIT' | 'REAR'
  >('COCKPIT');
  const [selectedLap, setSelectedLap] = useState(0);
  const [quickGraphMetric, setQuickGraphMetric] =
    useState<EngineeringGraphMetricKey>('speed');
  const [conditionsData, setConditionsData] = useState({
    airTemp: 0,
    humidity: 0,
    windSpeed: 0,
    pressure: 0,
  });
  const conditionsRef = React.useRef(conditionsData);
  conditionsRef.current = conditionsData;

  const userIdSegment = encodeURIComponent(currentUser?.id ?? 'local');

  const persistLayoutPreference = useCallback(
    (nextLayout: EngineeringLayoutItem[], nextHiddenWidgets: string[]) => {
      fetchWithAuth(
        `/api/users/${userIdSegment}/preferences/engineering-layout`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            layout: normalizeEngineeringLayout(nextLayout),
            hiddenWidgets: nextHiddenWidgets,
          }),
        }
      ).catch(() => {});
    },
    [userIdSegment]
  );

  useEffect(() => {
    fetchWithAuth(`/api/users/${userIdSegment}/preferences/engineering-layout`)
      .then((res) => (res.ok ? res.json() : null))
      .then(
        (
          data: {
            layout?: EngineeringLayoutItem[];
            hiddenWidgets?: string[];
          } | null
        ) => {
          if (Array.isArray(data?.layout) && data.layout.length > 0) {
            setLayout(normalizeEngineeringLayout(data.layout));
          }
          if (Array.isArray(data?.hiddenWidgets)) {
            setHiddenWidgets(data.hiddenWidgets);
          }
        }
      )
      .catch(() => {});
  }, [userIdSegment]);

  const prevEditModeRef = useRef(false);
  useEffect(() => {
    if (prevEditModeRef.current && !editMode) {
      persistLayoutPreference(layout, hiddenWidgets);
    }
    prevEditModeRef.current = editMode;
  }, [editMode, hiddenWidgets, layout, persistLayoutPreference]);

  // --- REALTIME HOOKS ---
  const { telemetry, isConnected: isTelemetryConnected } = useVehicleTelemetry(
    activeRacerId || null
  );
  const { biometrics } = useVehicleBiometrics(activeRacerId || null);
  const { status: vehicleStatus } = useVehicleStatus(activeRacerId || null);
  const { streamUrl: cameraStreamUrl, streamMimeType: cameraStreamMimeType } =
    useVehicleStream(activeRacerId || null, activeCamera);
  const { latestLocations: fleetLocations } = useFleetLocation({ cars });

  // --- DERIVED ---
  const activeRacers = useMemo(() => {
    return (cars || []).map((car) => {
      const driver = (drivers || []).find((d) => d.carId === car.id);
      return {
        id: car.id,
        name: driver?.name || 'Unknown',
        number: car.number,
      };
    });
  }, [cars, drivers]);

  const currentPoint = history[playbackIndex] ?? DEFAULT_ENG_POINT;
  const activeRacer = activeRacers.find((r) => r.id === activeRacerId);
  const {
    alerts,
    alertIds,
    isLoading: isAlertsLoading,
    refresh: refreshAlerts,
  } = useCarAlerts(activeRacerId);
  const liveMapRivals = useMemo(() => {
    const driverByCarId = new Map(drivers.map((d) => [d.carId, d.name]));
    return cars
      .filter((car) => car.id !== activeRacerId)
      .map((car) => {
        const loc = fleetLocations.find((l) => l.vehicleId === car.id);
        return {
          id: car.id,
          name: driverByCarId.get(car.id) ?? car.number,
          color: car.color ?? '#6b7280',
          progress: loc?.lapProgress ?? 0,
        };
      });
  }, [cars, drivers, activeRacerId, fleetLocations]);

  const computedRivalComparisons = useMemo(() => {
    const activeLoc = fleetLocations.find((l) => l.vehicleId === activeRacerId);
    if (!activeLoc) return rivalComparisons;

    const trackLengthMeters = activeLoc.trackLengthMeters ?? 4554;
    const activeProgress =
      activeLoc.progressContinuous ?? activeLoc.lap + activeLoc.lapProgress;

    const progressEntries = fleetLocations
      .map((loc) => ({
        vehicleId: loc.vehicleId,
        progress: loc.progressContinuous ?? loc.lap + loc.lapProgress,
      }))
      .sort((a, b) => b.progress - a.progress);

    const positionByVehicleId = new Map(
      progressEntries.map(
        (entry, index) => [entry.vehicleId, index + 1] as const
      )
    );
    const activePosition = positionByVehicleId.get(activeRacerId) ?? 1;

    return rivalComparisons.map((rival) => {
      const rivalKey = toCarNumberKey(rival.number);
      const rivalCar = cars.find(
        (car) => toCarNumberKey(car.number) === rivalKey
      );
      if (!rivalCar) return rival;

      const rivalLoc = fleetLocations.find(
        (loc) => loc.vehicleId === rivalCar.id
      );
      if (!rivalLoc) return rival;

      const rivalProgress =
        rivalLoc.progressContinuous ?? rivalLoc.lap + rivalLoc.lapProgress;
      const deltaProgress = rivalProgress - activeProgress;
      const gapMeters = Math.abs(deltaProgress) * trackLengthMeters;
      const relation: 'AHEAD' | 'BEHIND' =
        deltaProgress >= 0 ? 'AHEAD' : 'BEHIND';

      const rivalPosition =
        positionByVehicleId.get(rivalCar.id) ?? activePosition;
      const deltaPosition = activePosition - rivalPosition;

      return {
        ...rival,
        gapMeters,
        deltaPosition,
        relation,
        isPos: relation === 'AHEAD',
      };
    });
  }, [activeRacerId, cars, fleetLocations, rivalComparisons]);

  // --- EFFECTS ---

  // Sync vehicle status from WebSocket into status panel
  useEffect(() => {
    if (!vehicleStatus) return;
    setStatusData({
      position: vehicleStatus.position,
      lap: vehicleStatus.lap,
      totalLaps: vehicleStatus.totalLaps,
      currentTime: vehicleStatus.currentTime,
      bestTime: vehicleStatus.bestTime,
    });
    if (vehicleStatus.totalLaps > 0) setTotalLaps(vehicleStatus.totalLaps);
  }, [vehicleStatus]);

  // Append live WS telemetry frames into history buffer
  useEffect(() => {
    if (!telemetry || isPaused) return;
    setHistory((prev) => {
      const point = buildPointFromWs(
        telemetry,
        biometrics ?? null,
        prev[prev.length - 1] ?? DEFAULT_ENG_POINT
      );
      const next = [...prev, point].slice(-600);
      setPlaybackIndex(next.length - 1);
      return next;
    });
  }, [telemetry, biometrics, isPaused]);

  // Clear stale data immediately when switching vehicles
  useEffect(() => {
    setHistory([]);
    setPlaybackIndex(0);
    setStatusData(DEFAULT_ENGINEERING_STATUS);
    setCircuitName('');
    setRivalComparisons([]);
    setTotalLaps(0);
    setActiveFlag(null);
    setConditionsData({ airTemp: 0, humidity: 0, windSpeed: 0, pressure: 0 });
  }, [activeRacerId]);

  // Fetch initial circuit/rival metadata on mount
  useEffect(() => {
    if (activeRacerId <= 0) return;
    const ctrl = new AbortController();
    void (async () => {
      try {
        const res = await fetchWithAuth(
          `/api/engineering/cars/${activeRacerId}/snapshot`,
          { cache: 'no-store', signal: ctrl.signal }
        );
        if (!res.ok) return;
        const payload = (await res.json()) as {
          status?: EngineeringStatusData;
          gapAnalysis?: {
            selectedLap?: number;
            totalLaps?: number;
            rivals?: EngineeringGapRival[];
          };
          map?: {
            circuitName?: string;
            rivals?: EngineeringMapRival[];
            activeFlag?: {
              turn: string;
              type: 'YELLOW' | 'RED' | 'GREEN';
            } | null;
          };
          conditions?: {
            airTemp?: number;
            humidity?: number;
            windSpeed?: number;
            pressure?: number;
          };
        };
        if (payload.status) setStatusData(payload.status);
        if (payload.gapAnalysis) {
          if (typeof payload.gapAnalysis.selectedLap === 'number')
            setSelectedLap(payload.gapAnalysis.selectedLap);
          if (typeof payload.gapAnalysis.totalLaps === 'number')
            setTotalLaps(payload.gapAnalysis.totalLaps);
          if (Array.isArray(payload.gapAnalysis.rivals))
            setRivalComparisons(payload.gapAnalysis.rivals);
        }
        if (payload.map) {
          if (payload.map.circuitName) setCircuitName(payload.map.circuitName);
          if (payload.map.activeFlag !== undefined)
            setActiveFlag(payload.map.activeFlag ?? null);
        }
        if (payload.conditions) {
          setConditionsData({
            airTemp: payload.conditions.airTemp ?? 0,
            humidity: payload.conditions.humidity ?? 0,
            windSpeed: payload.conditions.windSpeed ?? 0,
            pressure: payload.conditions.pressure ?? 0,
          });
        }
      } catch {
        // snapshot unavailable – WS data used exclusively
      }
    })();
    return () => ctrl.abort();
  }, [activeRacerId]);

  // --- HANDLERS ---
  const handleAddRival = (num: string) => {
    const normalizedNumber = num.trim();
    if (!normalizedNumber) {
      return;
    }

    const normalizedKey = toCarNumberKey(normalizedNumber);
    const rivalCar = cars.find(
      (car) => toCarNumberKey(car.number) === normalizedKey
    );
    const displayNumber = rivalCar?.number ?? normalizedKey;
    const displayName =
      activeRacers.find((racer) => racer.id === rivalCar?.id)?.name ??
      `Driver ${displayNumber}`;

    const exists = rivalComparisons.some(
      (rival) => toCarNumberKey(rival.number) === normalizedKey
    );
    if (exists) {
      return;
    }

    setRivalComparisons((prev) => [
      ...prev,
      {
        number: displayNumber,
        name: displayName,
        gap: 2.145,
        isPos: true,
      },
    ]);
  };
  const handleRemoveRival = (num: string) => {
    setRivalComparisons((prev) => prev.filter((rival) => rival.number !== num));
  };

  const handleAcknowledgeAllAlerts = async () => {
    if (activeRacerId <= 0 || alertIds.length === 0) {
      return;
    }

    setIsAcknowledgingAlerts(true);

    try {
      const response = await fetchWithAuth(
        `/api/cars/${activeRacerId}/alerts/acknowledge`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ alertIds }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to acknowledge alerts');
      }

      await refreshAlerts();
    } catch {
      await refreshAlerts();
    } finally {
      setIsAcknowledgingAlerts(false);
    }
  };

  const widgets = INITIAL_ENGINEERING_LAYOUT.filter(
    (l) => !DISABLED_WIDGET_IDS.has(l.i)
  ).map((l) => ({
    id: l.i,
    title:
      ENGINEERING_WIDGET_TITLES[l.i] ?? l.i.replace('_', ' ').toUpperCase(),
  }));

  const visibleWidgetIds = new Set(
    widgets
      .map((widget) => widget.id)
      .filter((id) => !hiddenWidgets.includes(id))
  );

  const visibleLayout = normalizeEngineeringLayout(
    layout.filter((item) => visibleWidgetIds.has(item.i))
  );

  const renderWidget = (id: string) => {
    switch (id) {
      case 'alerts':
        return (
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
        );
      case 'status':
        return (
          <StatusPanel
            position={statusData.position}
            lap={statusData.lap}
            totalLaps={statusData.totalLaps}
            currentTime={statusData.currentTime}
            bestTime={statusData.bestTime}
          />
        );
      case 'telemetry_hub':
        return (
          <TelemetryHubPanel
            speed={currentPoint.speed}
            rpm={currentPoint.rpm}
            oilTemp={currentPoint.oilTemp}
            fuel={currentPoint.fuel}
            lambda={currentPoint.lambda}
            boost={currentPoint.boost}
            drs={currentPoint.drs}
            tires={currentPoint.tires}
          />
        );
      case 'heart':
        return (
          <HealthMetricStat
            title="Heart Rate"
            value={Math.round(currentPoint.heartRate)}
            unit="BPM"
            icon={HeartPulse}
            tone="text-red-400"
          />
        );
      case 'map':
        return (
          <MapWidget
            key={activeRacerId}
            circuit={getCircuit(circuitName || activeCircuitId)}
            circuitName={circuitName}
            activeFlag={activeFlag}
            mainCarProgress={
              fleetLocations.find((l) => l.vehicleId === activeRacerId)
                ?.lapProgress ?? 0
            }
            rivals={liveMapRivals}
            className="border border-white/5"
          />
        );
      case 'gap_analysis':
        return (
          <GapAnalysisPanel
            rivals={computedRivalComparisons}
            onAddRival={handleAddRival}
            onRemoveRival={handleRemoveRival}
            selectedLap={selectedLap}
            totalLaps={totalLaps}
            setSelectedLap={setSelectedLap}
          />
        );
      case 'controls':
        return (
          <ControlTelemetry
            steering={currentPoint.steering}
            throttle={currentPoint.throttle}
            brake={currentPoint.brake}
            gLat={currentPoint.gLat}
            gLong={currentPoint.gLong}
            heading={currentPoint.heading}
          />
        );
      case 'cameras': {
        return (
          <CameraWidget
            key={`${activeRacerId}:${activeCamera}`}
            activeCamera={activeCamera}
            onCameraChange={setActiveCamera}
            streamUrl={cameraStreamUrl}
            streamMimeType={cameraStreamMimeType}
            isLive={isTelemetryConnected}
            resetKey={`${activeRacerId}:${activeCamera}:${cameraStreamUrl ?? 'loading'}`}
          />
        );
      }
      case 'respiration':
        return (
          <HealthMetricStat
            title="Respiration"
            value={Math.round(currentPoint.respiration)}
            unit="BR/MIN"
            icon={Wind}
            tone="text-cyan-400"
          />
        );
      case 'stress':
        return (
          <HealthMetricStat
            title="Stress Level"
            value={Math.round(currentPoint.stressLevel)}
            unit="%"
            icon={Brain}
            tone="text-amber-400"
          />
        );
      case 'conditions':
        return (
          <ConditionsWidget
            airTemp={conditionsData.airTemp}
            humidity={conditionsData.humidity}
            windSpeed={conditionsData.windSpeed}
            pressure={conditionsData.pressure}
          />
        );
      case 'quick_graph':
        return (
          <EngineeringQuickGraph
            history={history}
            metricKey={quickGraphMetric}
            onMetricChange={setQuickGraphMetric}
          />
        );
      default:
        return null;
    }
  };

  if (!canAccessRoute('/engineering', currentRole)) {
    return (
      <AccessDeniedState message="Your role does not have access to the Engineering dashboard." />
    );
  }

  return (
    <div className="relative flex h-screen w-full flex-col overflow-hidden p-6 text-zinc-200">
      <EngineeringHeader
        isPaused={isPaused}
        recState={recording.recState}
        recordingDuration={recording.recordingDuration}
        canEditLayout={canEditLayout}
        editMode={editMode}
        setEditMode={setEditMode}
        hiddenWidgetsCount={hiddenWidgets.length}
        hiddenWidgets={hiddenWidgets}
        onRestoreWidget={(id) =>
          setHiddenWidgets(hiddenWidgets.filter((w) => w !== id))
        }
        activeRacerId={activeRacerId}
        activeRacer={activeRacer}
        activeRacers={activeRacers}
        onSetActiveRacer={setActiveRacerId}
        onStartRacing={() => recording.handleStart('Engineering_Session')}
        onStopRacing={recording.handleStop}
        widgets={widgets}
      />

      <div
        ref={gridRef}
        className="custom-scrollbar relative min-h-0 flex-1 overflow-x-hidden overflow-y-auto"
      >
        <ResponsiveGridLayout
          className="layout"
          layouts={{ lg: visibleLayout }}
          breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
          cols={{ lg: 4, md: 4, sm: 2, xs: 1, xxs: 1 }}
          rowHeight={150}
          width={gridWidth}
          margin={[16, 16]}
          dragConfig={{ enabled: editMode }}
          resizeConfig={{ enabled: editMode }}
          onLayoutChange={(nextLayout) => {
            const normalizedLayout = normalizeEngineeringLayout(
              nextLayout.map((item) => ({
                i: item.i,
                x: item.x,
                y: item.y,
                w: item.w,
                h: item.h,
              }))
            );
            setLayout(normalizedLayout);
            if (editMode) {
              persistLayoutPreference(normalizedLayout, hiddenWidgets);
            }
          }}
        >
          {widgets
            .filter((w) => visibleWidgetIds.has(w.id))
            .map((w) => (
              <div
                key={w.id}
                className={cn(editMode && canEditLayout && 'cursor-move')}
              >
                <MaximizableView
                  title={w.title}
                  isMaximized={maximizedSection === w.id}
                  onToggle={() =>
                    setMaximizedSection(maximizedSection === w.id ? null : w.id)
                  }
                  onHide={() => setHiddenWidgets([...hiddenWidgets, w.id])}
                  editMode={editMode && canEditLayout}
                >
                  {renderWidget(w.id)}
                </MaximizableView>
              </div>
            ))}
        </ResponsiveGridLayout>
      </div>

      {recording.saveModalOpen && (
        <SaveRecordingModal
          recordingName={recording.recordingName}
          selectedFolder={recording.selectedFolder}
          folderOptions={recording.folderOptions}
          isNewFolder={recording.isNewFolder}
          newFolderName={recording.newFolderName}
          onRecordingNameChange={recording.setRecordingName}
          onFolderChange={recording.setSelectedFolder}
          onIsNewFolderChange={recording.setIsNewFolder}
          onNewFolderNameChange={recording.setNewFolderName}
          onCancel={recording.handleCancel}
          onSave={() => void recording.handleSave()}
        />
      )}
    </div>
  );
}

function HealthMetricStat({
  title,
  value,
  unit,
  icon: Icon,
  tone,
}: {
  title: string;
  value: number;
  unit: string;
  icon: React.ElementType;
  tone: string;
}) {
  return (
    <div className="glass-panel flex h-full min-h-[160px] w-full flex-col rounded-xl border border-white/5 bg-[#080808] p-4">
      <div className="flex shrink-0 items-center gap-2">
        <div className="rounded-lg bg-white/5 p-1.5">
          <Icon className={cn('h-4 w-4', tone)} />
        </div>
        <span className="text-[10px] font-bold tracking-wider text-zinc-500 uppercase">
          {title}
        </span>
      </div>
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <div className="font-mono text-6xl leading-none font-black text-white">
          {value}
        </div>
        <div className="mt-3 font-mono text-sm font-black tracking-widest text-zinc-300 uppercase">
          {unit}
        </div>
      </div>
    </div>
  );
}

function EngineeringQuickGraph({
  history,
  metricKey,
  onMetricChange,
}: {
  history: EngineeringTelemetryPoint[];
  metricKey: EngineeringGraphMetricKey;
  onMetricChange: (metricKey: EngineeringGraphMetricKey) => void;
}) {
  const metric =
    ENGINEERING_GRAPH_METRICS.find((item) => item.key === metricKey) ??
    ENGINEERING_GRAPH_METRICS[0];
  const points = history.slice(-120);
  const values = points.map((point) => Number(point[metric.key] ?? 0));
  const currentValue = values[values.length - 1] ?? 0;
  const minValue = Math.min(...values, 0);
  const maxValue = Math.max(...values, 1);
  const range = Math.max(1, maxValue - minValue);
  const chartWidth = 100;
  const chartHeight = 42;
  const polyline = values
    .map((value, index) => {
      const x =
        values.length <= 1 ? 0 : (index / (values.length - 1)) * chartWidth;
      const y = chartHeight - ((value - minValue) / range) * chartHeight;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(' ');
  const baselineY = chartHeight - ((0 - minValue) / range) * chartHeight;
  const formattedValue =
    Math.abs(currentValue) >= 100
      ? Math.round(currentValue).toString()
      : currentValue.toFixed(metric.key === 'lambda' ? 3 : 1);

  return (
    <div className="glass-panel flex h-full min-h-[160px] w-full flex-col rounded-xl border border-white/5 bg-[#080808] p-4">
      <div className="flex shrink-0 items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-white/5 p-1.5">
            <Activity className="h-4 w-4" style={{ color: metric.color }} />
          </div>
          <span className="text-[10px] font-bold tracking-wider text-zinc-500 uppercase">
            Parameter Graph
          </span>
        </div>
        <select
          value={metric.key}
          onChange={(event) =>
            onMetricChange(event.target.value as EngineeringGraphMetricKey)
          }
          className="cursor-pointer rounded border border-white/10 bg-black/50 px-2 py-1 font-mono text-[10px] font-bold tracking-wider text-white uppercase outline-none transition hover:border-white/25 focus:border-cyan-400/60"
        >
          {ENGINEERING_GRAPH_METRICS.map((item) => (
            <option key={item.key} value={item.key} className="bg-zinc-950">
              {item.label}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-3 flex min-h-0 flex-1 items-center gap-4">
        <div className="relative min-h-0 flex-1 self-stretch overflow-hidden rounded-lg border border-white/5 bg-black/20">
          <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-white/5" />
          <svg
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            preserveAspectRatio="none"
            className="absolute inset-0 h-full w-full"
            aria-hidden="true"
          >
            <line
              x1="0"
              x2={chartWidth}
              y1={baselineY}
              y2={baselineY}
              stroke="rgba(255,255,255,0.08)"
              strokeWidth="0.5"
            />
            {polyline ? (
              <polyline
                points={polyline}
                fill="none"
                stroke={metric.color}
                strokeWidth="1.8"
                vectorEffect="non-scaling-stroke"
              />
            ) : null}
          </svg>
          {values.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold tracking-widest text-zinc-700 uppercase">
              Waiting for telemetry
            </div>
          ) : null}
        </div>
        <div className="flex w-28 shrink-0 flex-col items-end justify-center">
          <span className="text-[9px] font-bold tracking-widest text-zinc-500 uppercase">
            Current
          </span>
          <span className="mt-1 font-mono text-4xl leading-none font-black text-white">
            {formattedValue}
          </span>
          <span className="mt-2 font-mono text-xs font-black tracking-widest text-zinc-300 uppercase">
            {metric.unit}
          </span>
        </div>
      </div>
    </div>
  );
}
