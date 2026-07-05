'use client';

import React, { useEffect, useState } from 'react';
import {
  Settings,
  ListChecks,
  Save,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  CarFront,
  X,
  Calendar,
  MapPin,
  LineChart,
} from 'lucide-react';

import { usePlatform } from '@/context/PlatformContext';
import { PageHeader } from '@/components/layout/PageHeader';
import { MapWidget } from '@/components/features/MapWidget';
import { getCircuit } from '@/lib/circuits';
import {
  fetchEvents,
  createEvent,
  updateEvent,
  fetchDirectorRefreshRate,
  fetchDirectorThresholds,
  updateDirectorRefreshRate,
  updateDirectorThresholds,
} from '@/lib/services/administrationService';

type Tab = 'EVENT' | 'GARAGE' | 'THRESHOLDS';

type MetricConfig = {
  max: number;
  alertDelay: number;
  warningPenalty: number;
};

type DirectorGraphConfig = {
  speed: MetricConfig;
  rpm: MetricConfig;
  fuelPressure: MetricConfig;
  throttle: MetricConfig;
  ignitionTiming: MetricConfig;
  lambda: MetricConfig;
  airflow: MetricConfig;
  boost: MetricConfig;
};

type LatestUpdatedField = {
  metric: keyof Omit<DirectorGraphConfig, 'refreshRate'>;
  key: keyof MetricConfig;
};

const TRACK_OPTIONS = [
  'Buriram International Circuit',
  'Bira International Circuit',
];

const TRACK_NAME_TO_ID: Record<string, string> = {
  'Buriram International Circuit': 'buriram',
  'Bira International Circuit': 'bira',
};

const SESSION_OPTIONS = [
  { label: 'Practice (FP1/FP2)', value: 'PRACTICE' },
  { label: 'Qualifying (Q1/Q2/Q3)', value: 'QUALIFYING' },
  { label: 'Race', value: 'RACE' },
  { label: 'Private Testing', value: 'TEST' },
];

const GRAPH_METRICS: Array<keyof Omit<DirectorGraphConfig, 'refreshRate'>> = [
  'speed',
  'rpm',
  'fuelPressure',
  'throttle',
  'ignitionTiming',
  'lambda',
  'airflow',
  'boost',
];

const REFRESH_RATE_PRESETS = [1, 5, 15, 25] as const;

const GRAPH_METRIC_UNIT: Record<
  keyof Omit<DirectorGraphConfig, 'refreshRate'>,
  string
> = {
  speed: 'KPH',
  rpm: 'RPM',
  fuelPressure: 'BAR',
  throttle: '%',
  ignitionTiming: '°',
  lambda: 'λ',
  airflow: 'g/s',
  boost: 'kPa',
};

const getGraphMetricRange = (
  metric: keyof Omit<DirectorGraphConfig, 'refreshRate'>
) => {
  switch (metric) {
    case 'rpm':
      return { min: 0, max: 15000, step: 50 };
    case 'speed':
      return { min: 0, max: 400, step: 1 };
    case 'fuelPressure':
      return { min: 0, max: 20, step: 0.1 };
    case 'throttle':
      return { min: 0, max: 100, step: 1 };
    case 'ignitionTiming':
      return { min: -10, max: 80, step: 0.5 };
    case 'lambda':
      return { min: 0.5, max: 2, step: 0.01 };
    case 'airflow':
      return { min: 0, max: 700, step: 1 };
    case 'boost':
      return { min: 0, max: 3.5, step: 0.1 };
  }
};

export default function AdministrationPage() {
  const {
    cars,
    setCars,
    drivers,
    setDrivers,
    dataRefreshRateHz,
    setDataRefreshRateHz,
    isAdmin,
    setActiveCircuitId,
  } = usePlatform();

  const [activeTab, setActiveTab] = useState<Tab>('EVENT');
  const [eventName, setEventName] = useState('');
  const [trackName, setTrackName] = useState('');
  const [committedTrackName, setCommittedTrackName] = useState('');
  const [sessionType, setSessionType] = useState('');
  const [isSaved, setIsSaved] = useState(false);

  const [newCarModel, setNewCarModel] = useState('');
  const [newCarNumber, setNewCarNumber] = useState('');
  const [editingCarId, setEditingCarId] = useState<number | null>(null);
  const [editModel, setEditModel] = useState('');
  const [editNumber, setEditNumber] = useState('');
  const [newDriverName, setNewDriverName] = useState('');

  const [currentEventId, setCurrentEventId] = useState<string | null>(null);

  const [graphConfig, setGraphConfig] = useState<DirectorGraphConfig>({
    speed: { max: 300, alertDelay: 2.0, warningPenalty: 5.0 },
    rpm: { max: 9000, alertDelay: 1.0, warningPenalty: 3.0 },
    fuelPressure: { max: 10, alertDelay: 1.0, warningPenalty: 3.0 },
    throttle: { max: 100, alertDelay: 1.0, warningPenalty: 3.0 },
    ignitionTiming: { max: 50, alertDelay: 1.0, warningPenalty: 3.0 },
    lambda: { max: 1.3, alertDelay: 1.0, warningPenalty: 3.0 },
    airflow: { max: 500, alertDelay: 1.0, warningPenalty: 3.0 },
    boost: { max: 2.8, alertDelay: 1.0, warningPenalty: 3.0 },
  });
  const [latestUpdatedField, setLatestUpdatedField] =
    useState<LatestUpdatedField | null>(null);

  const getAvailableCarsForDriver = (driverId?: number) =>
    cars.filter(
      (car) =>
        !drivers.some(
          (driver) => driver.carId === car.id && driver.id !== driverId
        )
    );

  const hasAvailableCars = getAvailableCarsForDriver().length > 0;

  useEffect(() => {
    if (!latestUpdatedField) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setLatestUpdatedField(null);
    }, 1800);

    return () => window.clearTimeout(timeoutId);
  }, [latestUpdatedField]);

  // Load active event on mount
  useEffect(() => {
    void fetchEvents()
      .then((events) => {
        const active = events.find((e) => e.status === 'active') ?? events[0];
        if (active) {
          setCurrentEventId(active.id);
          setEventName(active.name);
          setTrackName(active.track);
          setCommittedTrackName(active.track);
          setActiveCircuitId(TRACK_NAME_TO_ID[active.track] ?? '');
          setSessionType(active.sessionType);
        }
      })
      .catch(() => {
        /* backend unavailable – defaults remain */
      });
  }, [setDataRefreshRateHz, setActiveCircuitId]);

  // Load current director thresholds from backend on mount
  useEffect(() => {
    void fetchDirectorRefreshRate()
      .then((refreshRateHz) => {
        setDataRefreshRateHz(refreshRateHz);
      })
      .catch(() => {
        /* backend unavailable — defaults remain */
      });

    void fetchDirectorThresholds()
      .then((thresholds) => {
        // Map API keys to graphConfig shape
        setGraphConfig((prev) => {
          const next = { ...prev };
          for (const metric of GRAPH_METRICS) {
            const cfg = thresholds[metric];
            if (cfg) {
              next[metric] = {
                max: cfg.threshold,
                alertDelay: cfg.alertDelay,
                warningPenalty: cfg.warningPenalty,
              };
            }
          }
          return next;
        });
      })
      .catch(() => {
        /* backend unavailable — defaults remain */
      });
  }, [setDataRefreshRateHz]);

  const showSaved = () => {
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const canSaveEvent =
    eventName.trim().length > 0 &&
    trackName.trim().length > 0 &&
    sessionType.trim().length > 0;

  const handleSaveEvent = () => {
    if (!canSaveEvent) {
      return;
    }

    const patch = {
      name: eventName,
      track: trackName,
      sessionType: sessionType as 'PRACTICE' | 'QUALIFYING' | 'RACE' | 'TEST',
      scheduledAt: new Date().toISOString(),
      status: 'active' as const,
    };
    setCommittedTrackName(trackName);
    setActiveCircuitId(TRACK_NAME_TO_ID[trackName] ?? '');
    if (currentEventId) {
      void updateEvent(currentEventId, patch)
        .then(() => showSaved())
        .catch(() => showSaved());
    } else {
      void createEvent(patch)
        .then((event) => {
          setCurrentEventId(event.id);
          showSaved();
        })
        .catch(() => showSaved());
    }
  };

  const handleAddCar = () => {
    const nextNumber = newCarNumber.trim();
    const nextModel = newCarModel.trim();

    if (!nextNumber || !nextModel) {
      return;
    }

    setCars([
      ...cars,
      {
        id: Date.now(),
        number: nextNumber,
        model: nextModel,
        status: 'Setup',
      },
    ]);

    setNewCarNumber('');
    setNewCarModel('');
  };

  const startEditCar = (carId: number) => {
    const car = cars.find((entry) => entry.id === carId);
    if (!car) {
      return;
    }

    setEditingCarId(car.id);
    setEditNumber(car.number);
    setEditModel(car.model);
  };

  const saveEditCar = () => {
    if (!editingCarId) {
      return;
    }

    setCars(
      cars.map((car) =>
        car.id === editingCarId
          ? {
              ...car,
              number: editNumber.trim() || car.number,
              model: editModel.trim() || car.model,
            }
          : car
      )
    );

    setEditingCarId(null);
    setEditModel('');
    setEditNumber('');
  };

  const deleteCar = (id: number) => {
    setCars(cars.filter((car) => car.id !== id));
    setDrivers(drivers.filter((driver) => driver.carId !== id));
  };

  const addDriver = () => {
    const name = newDriverName.trim();
    const availableCars = getAvailableCarsForDriver();

    if (!name || availableCars.length === 0) {
      return;
    }

    setDrivers([
      ...drivers,
      {
        id: Date.now(),
        name,
        carId: availableCars[0].id,
        license: 'Pending',
      },
    ]);

    setNewDriverName('');
  };

  const updateGraphMetric = (
    metric: keyof Omit<DirectorGraphConfig, 'refreshRate'>,
    key: keyof MetricConfig,
    value: number
  ) => {
    setGraphConfig((current) => ({
      ...current,
      [metric]: {
        ...current[metric],
        [key]: value,
      },
    }));
    setLatestUpdatedField({ metric, key });
  };

  const isLatestField = (
    metric: keyof Omit<DirectorGraphConfig, 'refreshRate'>,
    key: keyof MetricConfig
  ) => latestUpdatedField?.metric === metric && latestUpdatedField?.key === key;

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center p-20 text-center">
        <div className="mb-4 rounded-full bg-red-500/10 p-4 text-red-500">
          <Settings className="h-12 w-12" />
        </div>
        <h2 className="text-xl font-black tracking-tight text-white uppercase">
          Access Denied
        </h2>
        <p className="text-sm text-zinc-500">
          Administrator privileges required to view this section.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full flex-col gap-4 overflow-hidden p-6 text-white">
      {/* Commit success toast */}
      <div
        className={`pointer-events-none fixed top-6 left-1/2 z-50 -translate-x-1/2 transition-all duration-500 ${
          isSaved
            ? 'translate-y-0 opacity-100'
            : '-translate-y-4 opacity-0'
        }`}
      >
        <div className="flex items-center gap-3 rounded-2xl border border-green-500/30 bg-zinc-900/95 px-6 py-4 shadow-2xl shadow-black/60 backdrop-blur-md">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-green-400" />
          <div>
            <p className="text-sm font-bold tracking-wide text-white">Changes Committed</p>
            <p className="text-xs text-zinc-400">
              {committedTrackName ? `Track set to ${committedTrackName}` : 'Event settings saved'}
            </p>
          </div>
        </div>
      </div>
      <PageHeader
        title="Command Center"
        subtitle="Fleet & Environment Configuration"
        actions={
          <div className="flex items-center gap-1 rounded-xl bg-black/40 p-1">
            {(['EVENT', 'GARAGE', 'THRESHOLDS'] as Tab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex items-center gap-2 rounded-lg px-4 py-2 text-[10px] font-black tracking-widest uppercase transition-all ${
                  activeTab === tab
                    ? 'bg-isuzu-red shadow-isuzu-red/20 text-white shadow-lg'
                    : 'text-zinc-500 hover:bg-white/5 hover:text-white'
                }`}
              >
                {tab === 'EVENT' && <ListChecks className="h-3 w-3" />}
                {tab === 'GARAGE' && <CarFront className="h-3 w-3" />}
                {tab === 'THRESHOLDS' && <Settings className="h-3 w-3" />}
                {tab}
              </button>
            ))}
          </div>
        }
      />

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl">
          {activeTab === 'EVENT' && (
            <div className="grid grid-cols-1 gap-6">
              <div className="rounded-2xl border border-white/10 bg-zinc-900/30 p-8">
                <h3 className="text-isuzu-red mb-6 flex items-center gap-3 text-sm font-black tracking-widest uppercase">
                  <Calendar className="h-4 w-4" /> Event Details
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="mb-2 block text-[10px] font-bold tracking-widest text-zinc-500 uppercase">
                      Event Name
                    </label>
                    <input
                      type="text"
                      value={eventName}
                      onChange={(event) => setEventName(event.target.value)}
                      placeholder="Enter event name"
                      className="focus:border-isuzu-red w-full rounded-xl border border-white/10 bg-black/50 p-4 text-sm transition-all outline-none"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-[10px] font-bold tracking-widest text-zinc-500 uppercase">
                      Track Selection
                    </label>
                    <div className="relative">
                      <select
                        value={trackName}
                        onChange={(event) => setTrackName(event.target.value)}
                        className="focus:border-isuzu-red w-full appearance-none rounded-xl border border-white/10 bg-black/50 p-4 text-sm transition-all outline-none"
                      >
                        {TRACK_OPTIONS.map((track) => (
                          <option key={track} value={track}>
                            {track}
                          </option>
                        ))}
                      </select>
                      <MapPin className="pointer-events-none absolute top-1/2 right-4 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-[10px] font-bold tracking-widest text-zinc-500 uppercase">
                      Session Type
                    </label>
                    <select
                      value={sessionType}
                      onChange={(event) => setSessionType(event.target.value)}
                      className="focus:border-isuzu-red w-full appearance-none rounded-xl border border-white/10 bg-black/50 p-4 text-sm transition-all outline-none"
                    >
                      {SESSION_OPTIONS.map((session) => (
                        <option key={session.value} value={session.value}>
                          {session.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex justify-end">
                    <button
                      onClick={handleSaveEvent}
                      disabled={!canSaveEvent}
                      className="bg-isuzu-red shadow-isuzu-red/20 disabled:hover:bg-isuzu-red flex items-center gap-2 rounded-lg px-6 py-3 text-xs font-black tracking-widest uppercase shadow-lg transition-all hover:bg-red-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isSaved ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      {isSaved ? 'Identity Locked' : 'Commit Changes'}
                    </button>
                  </div>
                </div>
              </div>

              {trackName && (
                <div className="rounded-2xl border border-white/10 bg-zinc-900/30 p-6">
                  <h3 className="text-isuzu-red mb-4 flex items-center gap-3 text-sm font-black tracking-widest uppercase">
                    <MapPin className="h-4 w-4" /> Track Preview
                  </h3>
                  <div className="h-64 overflow-hidden rounded-xl border border-white/5">
                    <MapWidget
                      circuit={getCircuit(TRACK_NAME_TO_ID[trackName] ?? '')}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'GARAGE' && (
            <div className="grid grid-cols-1 gap-8">
              <div className="space-y-6">
                <div className="rounded-2xl border border-white/10 bg-zinc-900/30 p-6">
                  <div className="mb-6 flex items-center gap-3">
                    <CarFront className="text-isuzu-red h-5 w-5" />
                    <h3 className="text-isuzu-red text-sm font-black tracking-widest uppercase">
                      Garage Management
                    </h3>
                  </div>

                  <div className="mb-6 flex items-end gap-2 rounded-lg border border-white/10 bg-white/5 p-4">
                    <div className="flex-1">
                      <label className="mb-1 block text-[10px] font-bold text-zinc-500 uppercase">
                        Car Number
                      </label>
                      <input
                        value={newCarNumber}
                        onChange={(event) =>
                          setNewCarNumber(event.target.value)
                        }
                        className="focus:border-isuzu-red w-full rounded border border-white/10 bg-black/30 px-3 py-1.5 text-xs text-white outline-none"
                        placeholder="e.g. 04"
                      />
                    </div>
                    <div className="flex-3">
                      <label className="mb-1 block text-[10px] font-bold text-zinc-500 uppercase">
                        Car Model
                      </label>
                      <input
                        value={newCarModel}
                        onChange={(event) => setNewCarModel(event.target.value)}
                        className="focus:border-isuzu-red w-full rounded border border-white/10 bg-black/30 px-3 py-1.5 text-xs text-white outline-none"
                        placeholder="e.g. Isuzu D-Max 2024 Proto"
                      />
                    </div>
                    <button
                      onClick={handleAddCar}
                      disabled={!newCarModel.trim() || !newCarNumber.trim()}
                      className="rounded bg-zinc-800 px-4 py-1.5 text-xs text-white hover:bg-zinc-700 disabled:opacity-50"
                    >
                      <span className="inline-flex items-center gap-1">
                        <Plus className="h-3 w-3" /> Add Car
                      </span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {cars.map((car) => (
                      <div
                        key={car.id}
                        className="group relative flex items-center justify-between rounded-lg border border-white/5 bg-black/20 p-4 transition-colors hover:border-white/20"
                      >
                        {editingCarId === car.id ? (
                          <div className="flex flex-1 items-center gap-2">
                            <input
                              value={editNumber}
                              onChange={(event) =>
                                setEditNumber(event.target.value)
                              }
                              className="border-isuzu-red w-12 rounded border bg-black px-1 py-1 text-center text-sm"
                            />
                            <input
                              value={editModel}
                              onChange={(event) =>
                                setEditModel(event.target.value)
                              }
                              className="border-isuzu-red flex-1 rounded border bg-black px-2 py-1 text-sm"
                            />
                            <button
                              onClick={saveEditCar}
                              className="rounded p-1 text-green-500 hover:bg-white/10"
                            >
                              <Save className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => setEditingCarId(null)}
                              className="rounded p-1 text-zinc-500 hover:bg-white/10"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center gap-3">
                              <div className="group-hover:text-isuzu-red flex h-12 w-12 items-center justify-center rounded bg-zinc-900 text-xl font-black text-zinc-600 italic transition-colors">
                                {car.number}
                              </div>
                              <div>
                                <div className="text-sm font-medium text-white">
                                  {car.model}
                                </div>
                                <div className="text-[10px] tracking-wider text-zinc-500 uppercase">
                                  {car.status}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                              <button
                                onClick={() => startEditCar(car.id)}
                                className="rounded p-2 text-zinc-500 hover:text-white"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => deleteCar(car.id)}
                                className="rounded p-2 text-zinc-500 hover:text-red-500"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-zinc-900/30 p-6">
                  <div className="mb-6 flex items-center justify-between">
                    <h3 className="text-isuzu-red text-sm font-black tracking-widest uppercase">
                      Driver Mapping
                    </h3>
                    <div className="flex gap-2">
                      <input
                        value={newDriverName}
                        onChange={(event) =>
                          setNewDriverName(event.target.value)
                        }
                        className="focus:border-isuzu-red rounded border border-white/10 bg-black/30 px-3 py-1.5 text-xs text-white outline-none"
                        placeholder="Driver Name"
                      />
                      <button
                        onClick={addDriver}
                        disabled={!newDriverName.trim() || !hasAvailableCars}
                        className="rounded bg-zinc-800 px-3 py-1.5 text-xs hover:bg-zinc-700"
                      >
                        <span className="inline-flex items-center gap-1">
                          <Plus className="h-3 w-3" /> Add
                        </span>
                      </button>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-left">
                      <thead>
                        <tr className="border-b border-white/10 text-[10px] tracking-wider text-zinc-500 uppercase">
                          <th className="py-3 pl-2">Driver</th>
                          <th className="py-3">License</th>
                          <th className="py-3">Assigned Vehicle</th>
                          <th className="py-3 pr-2 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="text-sm">
                        {drivers.map((driver) => (
                          <tr
                            key={driver.id}
                            className="border-b border-white/5"
                          >
                            <td className="py-3 pl-2 text-white">
                              {driver.name}
                            </td>
                            <td className="py-3 font-mono text-xs text-zinc-400">
                              {driver.license}
                            </td>
                            <td className="py-3">
                              <select
                                value={driver.carId}
                                onChange={(event) => {
                                  const nextCarId = Number(event.target.value);
                                  const isAlreadyAssigned = drivers.some(
                                    (entry) =>
                                      entry.id !== driver.id &&
                                      entry.carId === nextCarId
                                  );

                                  if (isAlreadyAssigned) {
                                    return;
                                  }

                                  setDrivers(
                                    drivers.map((entry) =>
                                      entry.id === driver.id
                                        ? { ...entry, carId: nextCarId }
                                        : entry
                                    )
                                  );
                                }}
                                className="focus:border-isuzu-red rounded border border-white/10 bg-black/30 px-2 py-1 text-xs text-white outline-none"
                              >
                                {cars.map((car) => {
                                  const isAssignedToOtherDriver = drivers.some(
                                    (entry) =>
                                      entry.id !== driver.id &&
                                      entry.carId === car.id
                                  );

                                  return (
                                    <option
                                      key={car.id}
                                      value={car.id}
                                      disabled={isAssignedToOtherDriver}
                                    >
                                      {car.number} - {car.model}
                                    </option>
                                  );
                                })}
                              </select>
                            </td>
                            <td className="py-3 pr-2 text-right">
                              <button
                                onClick={() =>
                                  setDrivers(
                                    drivers.filter(
                                      (entry) => entry.id !== driver.id
                                    )
                                  )
                                }
                                className="text-zinc-500 hover:text-red-500"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'THRESHOLDS' && (
            <div className="grid grid-cols-1 gap-8">
              <div className="rounded-2xl border border-white/10 bg-zinc-900/30 p-8">
                <h3 className="text-isuzu-red mb-6 flex items-center gap-3 text-sm font-black tracking-widest uppercase">
                  <LineChart className="h-4 w-4" /> Director Graph Thresholds
                </h3>

                <div className="mb-4">
                  <label className="mb-2 block text-[10px] font-bold tracking-widest text-zinc-500 uppercase">
                    Refresh Rate (Hz)
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {REFRESH_RATE_PRESETS.map((rate) => (
                      <button
                        key={rate}
                        onClick={() => {
                          setDataRefreshRateHz(rate);
                          void updateDirectorRefreshRate(rate).catch(() => {
                            /* keep optimistic UI; next reload re-syncs from backend */
                          });
                        }}
                        className={`rounded border px-3 py-2 text-xs font-black tracking-widest transition-all ${
                          dataRefreshRateHz === rate
                            ? 'border-isuzu-red bg-isuzu-red shadow-isuzu-red/40 scale-105 text-white shadow-lg'
                            : 'border-white/10 bg-black/50 text-zinc-400 hover:border-white/30 hover:text-white'
                        }`}
                      >
                        {rate} Hz
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  {GRAPH_METRICS.map((metric) => (
                    <div
                      key={metric}
                      className="rounded-lg border border-white/10 bg-black/20 p-4"
                    >
                      <div className="mb-4 flex items-center justify-between">
                        <div
                          className="text-sm font-black text-white"
                          style={{ textTransform: 'capitalize' }}
                        >
                          {metric.replace(/([A-Z])/g, ' $1')} Configuration
                        </div>
                        <div
                          className={`rounded px-2 py-1 font-mono text-xs font-bold uppercase transition-all ${
                            isLatestField(metric, 'max')
                              ? 'border-isuzu-red bg-isuzu-red/20 text-isuzu-red shadow-isuzu-red/40 border shadow-md'
                              : 'text-blue-400'
                          }`}
                        >
                          {graphConfig[metric].max} {GRAPH_METRIC_UNIT[metric]}
                        </div>
                      </div>

                      <div>
                        <label className="mb-2 block text-[10px] font-bold tracking-widest text-zinc-500 uppercase">
                          Graph Max
                        </label>
                        <input
                          type="range"
                          min={getGraphMetricRange(metric).min}
                          max={getGraphMetricRange(metric).max}
                          step={getGraphMetricRange(metric).step}
                          value={graphConfig[metric].max}
                          onChange={(event) =>
                            updateGraphMetric(
                              metric,
                              'max',
                              Number(event.target.value)
                            )
                          }
                          className={`accent-isuzu-red mb-3 h-2 w-full appearance-none rounded-full transition-all outline-none ${
                            isLatestField(metric, 'max')
                              ? 'bg-isuzu-red/40 shadow-isuzu-red/30 shadow-lg'
                              : 'bg-black/60'
                          }`}
                        />
                      </div>

                      <div className="mb-2 grid grid-cols-2 gap-2 text-[9px] font-bold tracking-wide text-zinc-500 uppercase">
                        <span>Alert Delay (s)</span>
                        <span>Penalty Time (s)</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="number"
                          step={0.1}
                          value={graphConfig[metric].alertDelay}
                          onChange={(event) =>
                            updateGraphMetric(
                              metric,
                              'alertDelay',
                              Number(event.target.value)
                            )
                          }
                          className={`rounded border px-2 py-1 text-xs font-bold transition-all ${
                            isLatestField(metric, 'alertDelay')
                              ? 'border-isuzu-red bg-isuzu-red/20 shadow-isuzu-red/30 text-white shadow-md'
                              : 'border-white/10 bg-black/40 text-white'
                          }`}
                          placeholder="Delay"
                        />
                        <input
                          type="number"
                          step={0.1}
                          value={graphConfig[metric].warningPenalty}
                          onChange={(event) =>
                            updateGraphMetric(
                              metric,
                              'warningPenalty',
                              Number(event.target.value)
                            )
                          }
                          className={`rounded border px-2 py-1 text-xs font-bold transition-all ${
                            isLatestField(metric, 'warningPenalty')
                              ? 'border-isuzu-red bg-isuzu-red/20 shadow-isuzu-red/30 text-white shadow-md'
                              : 'border-white/10 bg-black/40 text-white'
                          }`}
                          placeholder="Penalty"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 flex justify-end">
                  <button
                    onClick={() => {
                      // Build API payload from graphConfig (max → threshold, alertDelay, warningPenalty)
                      const thresholds = Object.fromEntries(
                        GRAPH_METRICS.map((metric) => [
                          metric,
                          {
                            threshold: graphConfig[metric].max,
                            alertDelay: graphConfig[metric].alertDelay,
                            warningPenalty: graphConfig[metric].warningPenalty,
                          },
                        ])
                      );
                      void updateDirectorThresholds(thresholds)
                        .then(() => showSaved())
                        .catch(() => showSaved()); // show saved even if backend down
                    }}
                    className="bg-isuzu-red shadow-isuzu-red/20 flex items-center gap-2 rounded-lg px-6 py-3 text-xs font-black tracking-widest uppercase shadow-lg transition-all hover:bg-red-700 active:scale-95"
                  >
                    {isSaved ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    {isSaved ? 'Saved' : 'Save Thresholds'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
