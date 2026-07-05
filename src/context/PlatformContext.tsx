'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import { Car, Driver, FileItem, Thresholds, AlertThreshold } from '@/types';
import { INITIAL_FILES } from '@/lib/constants';
import { initWebSocket } from '@/lib/websocket';
import {
  fetchWithAuth,
  type AuthenticatedUser,
  type UserRole,
} from '@/lib/authClient';
import {
  fetchDirectorRefreshRate,
  fetchDirectorThresholds,
  fetchEvents,
} from '@/lib/services/administrationService';
import { DEFAULT_CIRCUIT } from '@/lib/circuits';

// Mirrors administration page mapping. Kept here so any page can resolve the
// active circuit even before /administration has been visited.
const TRACK_NAME_TO_CIRCUIT_ID: Record<string, string> = {
  'Buriram International Circuit': 'buriram',
  'Bira International Circuit': 'bira',
};

type UserVehicleScope = AuthenticatedUser & {
  assignedCarIds?: number[];
  vehicleIds?: number[];
  carIds?: number[];
  carId?: number;
  vehicleId?: number;
};

const DEFAULT_ALERT_THRESHOLDS: AlertThreshold[] = [
  // ── POWERTRAIN ──
  {
    id: 'engineTemp',
    metric: 'engineTemp',
    label: 'Engine Temp',
    unit: '°C',
    warningValue: 105,
    criticalValue: 120,
  },
  {
    id: 'oilPressure',
    metric: 'oilPressure',
    label: 'Engine Oil Pressure',
    unit: 'bar',
    warningValue: 3.5,
    criticalValue: 2.5,
  },
  {
    id: 'fuelPressure',
    metric: 'fuelPressure',
    label: 'Fuel Pressure',
    unit: 'bar',
    warningValue: 1.5,
    criticalValue: 1.0,
  },
  {
    id: 'fuelFlow',
    metric: 'fuelFlow',
    label: 'Fuel Flow Rate',
    unit: 'kg/h',
    warningValue: 95,
    criticalValue: 105,
  },
  {
    id: 'turboBoost',
    metric: 'turboBoost',
    label: 'Turbo Boost',
    unit: 'bar',
    warningValue: 2.5,
    criticalValue: 2.8,
  },
  {
    id: 'gearboxTemp',
    metric: 'gearboxTemp',
    label: 'Gearbox Temp',
    unit: '°C',
    warningValue: 115,
    criticalValue: 130,
  },
  {
    id: 'exhaustTemp',
    metric: 'exhaustTemp',
    label: 'Exhaust Gas Temp',
    unit: '°C',
    warningValue: 880,
    criticalValue: 950,
  },
  {
    id: 'coolantTemp',
    metric: 'coolantTemp',
    label: 'Coolant Temp',
    unit: '°C',
    warningValue: 105,
    criticalValue: 115,
  },
  // ── CHASSIS ──
  {
    id: 'tireTemp',
    metric: 'tireTemp',
    label: 'Tire Temp',
    unit: '°C',
    warningValue: 110,
    criticalValue: 125,
  },
  {
    id: 'tirePressure',
    metric: 'tirePressure',
    label: 'Tire Pressure',
    unit: 'bar',
    warningValue: 1.0,
    criticalValue: 0.8,
  },
  {
    id: 'brakePressure',
    metric: 'brakePressure',
    label: 'Brake Line Pressure',
    unit: 'bar',
    warningValue: 50,
    criticalValue: 60,
  },
  // ── GENERAL ──
  {
    id: 'fuelLevel',
    metric: 'fuelLevel',
    label: 'Fuel Low',
    unit: 'L',
    warningValue: 15,
    criticalValue: 5,
  },
  {
    id: 'rpm',
    metric: 'rpm',
    label: 'RPM High',
    unit: 'RPM',
    warningValue: 10000,
    criticalValue: 11500,
  },
  {
    id: 'speed',
    metric: 'speed',
    label: 'Speed High',
    unit: 'km/h',
    warningValue: 220,
    criticalValue: 240,
  },
  {
    id: 'suspensionTravel',
    metric: 'suspensionTravel',
    label: 'Suspension Travel',
    unit: 'mm',
    warningValue: 148,
    criticalValue: 155,
  },
  // ── ELECTRONICS ──
  {
    id: 'batteryVoltage',
    metric: 'batteryVoltage',
    label: 'Battery Voltage',
    unit: 'V',
    warningValue: 12.1,
    criticalValue: 11.8,
  },
  {
    id: 'telemetryLatency',
    metric: 'telemetryLatency',
    label: 'Telemetry Link',
    unit: 'ms',
    warningValue: 45,
    criticalValue: 55,
  },
  {
    id: 'gpsSats',
    metric: 'gpsSats',
    label: 'GPS Signal',
    unit: 'Sats',
    warningValue: 9,
    criticalValue: 7,
  },
];

interface PlatformContextType {
  platformName: string;
  logoUrl: string;

  // Authentication State
  isAuthenticated: boolean;
  setIsAuthenticated: (auth: boolean) => void;
  currentRole: UserRole;
  setCurrentRole: (role: UserRole) => void;
  currentUser: AuthenticatedUser | null;
  setCurrentUser: (user: AuthenticatedUser | null) => void;
  isAdmin: boolean;
  setIsAdmin: (isAdmin: boolean) => void;

  // Theme State
  theme: string;
  setTheme: (theme: string) => void;

  // Fleet & Team State
  cars: Car[];
  setCars: (cars: Car[]) => void;
  teamCars: Car[];

  drivers: Driver[];
  setDrivers: (drivers: Driver[]) => void;
  teamDrivers: Driver[];

  // Files State
  files: FileItem[];
  setFiles: (files: FileItem[]) => void;

  // Thresholds State (director/overview rule engine)
  thresholds: Thresholds;
  setThresholds: (thresholds: Thresholds) => void;

  // Alert Thresholds — configured in Settings, consumed by all sensor pages
  alertThresholds: AlertThreshold[];
  setAlertThresholds: (thresholds: AlertThreshold[]) => void;

  // Realtime Stream Settings
  dataRefreshRateHz: number;
  setDataRefreshRateHz: (rateHz: number) => void;

  // Active Vehicle — persisted across page navigation
  activeCarId: number;
  setActiveCarId: (id: number) => void;

  // Active Circuit — set from Administration page, used by all map widgets
  activeCircuitId: string;
  setActiveCircuitId: (id: string) => void;
}

const PlatformContext = createContext<PlatformContextType | undefined>(
  undefined
);

export const PlatformProvider = ({
  children,
  wsEndpoint,
  platformName,
  logoUrl,
}: {
  children: ReactNode;
  wsEndpoint: string;
  platformName: string;
  logoUrl: string;
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentRole, setCurrentRole] = useState<UserRole>('ENGINEER');
  const [currentUser, setCurrentUser] = useState<AuthenticatedUser | null>(
    null
  );
  const [isAdmin, setIsAdmin] = useState(false);
  const [theme, setTheme] = useState<string>('red');

  // Initialise the shared WS singleton synchronously during render so it is
  // ready before any child hook's useEffect calls getWebSocket().
  // initWebSocket is idempotent — safe to call on every render.
  if (wsEndpoint) initWebSocket(wsEndpoint);

  React.useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const [fleetCars, setFleetCars] = useState<Car[]>([]);
  const [fleetDrivers, setFleetDrivers] = useState<Driver[]>([]);
  const [activeCarId, setActiveCarId] = useState<number>(0);
  const [activeCircuitId, setActiveCircuitId] = useState<string>(DEFAULT_CIRCUIT.id);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    async function loadFleet() {
      try {
        const fleetRes = await fetchWithAuth('/api/fleet', {
          cache: 'no-store',
        });
        if (!fleetRes.ok) return;
        const fleetPayload = (await fleetRes.json()) as { cars?: Car[] };
        const loadedCars = Array.isArray(fleetPayload.cars)
          ? fleetPayload.cars
          : [];
        if (loadedCars.length === 0) return;

        setFleetCars(loadedCars);

        // Re-initialise active car to the lowest-numbered car in the real fleet.
        const sortedLoaded = [...loadedCars].sort(
          (a, b) => Number(a.number) - Number(b.number)
        );
        setActiveCarId((prev) =>
          loadedCars.some((c) => c.id === prev)
            ? prev
            : (sortedLoaded[0]?.id ?? prev)
        );

        // Fetch drivers for all loaded car IDs in one request.
        const carIds = loadedCars.map((c) => c.id).join(',');
        const driversRes = await fetchWithAuth(
          `/api/drivers?carIds=${carIds}`,
          {
            cache: 'no-store',
          }
        );
        if (!driversRes.ok) return;
        const driversPayload = (await driversRes.json()) as {
          drivers?: Driver[];
        };
        const loadedDrivers = Array.isArray(driversPayload.drivers)
          ? driversPayload.drivers
          : [];
        if (loadedDrivers.length > 0) {
          setFleetDrivers(loadedDrivers);
        }
      } catch {
        console.warn('[PlatformContext] Fleet API unreachable.');
      }
    }

    void loadFleet();
  }, [isAuthenticated]);

  const [files, setFiles] = useState<FileItem[]>(INITIAL_FILES);

  const [thresholds, setThresholds] = useState<Thresholds>({
    speed: 240,
    rpm: 11500,
    fuelFlow: 98,
    fuelPressure: 4.5,
    boost: 2.8,
    throttle: 95,
    brake: 90,
    gLat: 2.5,
    gLong: 2.5,
    ignitionTiming: 40,
    airflow: 440,
    lambda: 1.02,
    sensitivity: 8,
  });

  const [alertThresholds, setAlertThresholds] = useState<AlertThreshold[]>(
    DEFAULT_ALERT_THRESHOLDS
  );

  const [dataRefreshRateHz, setDataRefreshRateHz] = useState(5);

  useEffect(() => {
    if (!isAuthenticated) return;

    void fetchDirectorThresholds()
      .then((directorThresholds) => {
        setThresholds((current) => ({
          ...current,
          speed: directorThresholds.speed?.threshold ?? current.speed,
          rpm: directorThresholds.rpm?.threshold ?? current.rpm,
          fuelPressure:
            directorThresholds.fuelPressure?.threshold ?? current.fuelPressure,
          boost: directorThresholds.boost?.threshold ?? current.boost,
          throttle: directorThresholds.throttle?.threshold ?? current.throttle,
          brake: directorThresholds.brake?.threshold ?? current.brake,
          gLat: directorThresholds.gLat?.threshold ?? current.gLat,
          gLong: directorThresholds.gLong?.threshold ?? current.gLong,
          ignitionTiming:
            directorThresholds.ignitionTiming?.threshold ??
            current.ignitionTiming,
          lambda: directorThresholds.lambda?.threshold ?? current.lambda,
          airflow: directorThresholds.airflow?.threshold ?? current.airflow,
        }));
      })
      .catch(() => {
        /* backend unavailable — defaults remain */
      });

    void fetchDirectorRefreshRate()
      .then((refreshRateHz) => {
        setDataRefreshRateHz(refreshRateHz);
      })
      .catch(() => {
        /* backend unavailable — defaults remain */
      });

    void fetchEvents()
      .then((events) => {
        const active = events.find((e) => e.status === 'active') ?? events[0];
        if (!active) return;
        const circuitId = TRACK_NAME_TO_CIRCUIT_ID[active.track];
        if (circuitId) setActiveCircuitId(circuitId);
      })
      .catch(() => {
        /* backend unavailable — default circuit remains */
      });
  }, [isAuthenticated]);

  const teamCarIds = React.useMemo(() => {
    if (currentRole !== 'ENGINEER' && currentRole !== 'COMPETITOR') return [];

    const scopedUser = currentUser as UserVehicleScope | null;
    const assignedIds =
      scopedUser?.assignedCarIds ??
      scopedUser?.vehicleIds ??
      scopedUser?.carIds ??
      (typeof scopedUser?.carId === 'number'
        ? [scopedUser.carId]
        : typeof scopedUser?.vehicleId === 'number'
          ? [scopedUser.vehicleId]
          : []);

    const validAssignedIds = assignedIds.filter((id) =>
      fleetCars.some((car) => car.id === id)
    );
    if (validAssignedIds.length > 0) return validAssignedIds;

    const firstCar = [...fleetCars].sort(
      (a, b) => Number(a.number) - Number(b.number)
    )[0];
    return firstCar ? [firstCar.id] : [];
  }, [currentRole, currentUser, fleetCars]);
  const teamCarIdSet = React.useMemo(() => new Set(teamCarIds), [teamCarIds]);
  const teamCars = React.useMemo(
    () => fleetCars.filter((c) => teamCarIdSet.has(c.id)),
    [fleetCars, teamCarIdSet]
  );
  const teamDrivers = React.useMemo(
    () => fleetDrivers.filter((d) => teamCarIdSet.has(d.carId)),
    [fleetDrivers, teamCarIdSet]
  );
  const visibleCars = React.useMemo(
    () =>
      currentRole === 'ENGINEER' || currentRole === 'COMPETITOR'
        ? teamCars
        : fleetCars,
    [currentRole, fleetCars, teamCars]
  );
  const visibleDrivers = React.useMemo(
    () =>
      currentRole === 'ENGINEER' || currentRole === 'COMPETITOR'
        ? teamDrivers
        : fleetDrivers,
    [currentRole, fleetDrivers, teamDrivers]
  );

  const visibleActiveCarId = React.useMemo(() => {
    if (!isAuthenticated || visibleCars.length === 0) return activeCarId;
    return visibleCars.some((car) => car.id === activeCarId)
      ? activeCarId
      : visibleCars[0].id;
  }, [activeCarId, isAuthenticated, visibleCars]);

  const value: PlatformContextType = {
    platformName,
    logoUrl,
    isAuthenticated,
    setIsAuthenticated,
    currentRole,
    setCurrentRole,
    currentUser,
    setCurrentUser,
    isAdmin,
    setIsAdmin,
    theme,
    setTheme,
    cars: visibleCars,
    setCars: setFleetCars,
    teamCars,
    drivers: visibleDrivers,
    setDrivers: setFleetDrivers,
    teamDrivers,
    files,
    setFiles,
    thresholds,
    setThresholds,
    alertThresholds,
    setAlertThresholds,
    dataRefreshRateHz,
    setDataRefreshRateHz,
    activeCarId: visibleActiveCarId,
    setActiveCarId,
    activeCircuitId,
    setActiveCircuitId,
  };

  return (
    <PlatformContext.Provider value={value}>
      {children}
    </PlatformContext.Provider>
  );
};

export const usePlatform = () => {
  const context = useContext(PlatformContext);
  if (context === undefined) {
    throw new Error('usePlatform must be used within a PlatformProvider');
  }
  return context;
};

export const useOptionalPlatform = () => useContext(PlatformContext);
