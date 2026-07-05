'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  CalendarDays,
  Download,
  FileBarChart,
  LoaderCircle,
  Search,
  RotateCcw,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { usePlatform } from '@/context/PlatformContext';
import {
  downloadLogReportCsv,
  fetchLogReport,
  type ReportFiltersState,
} from '@/lib/services/reportService';
import type { LogReportRow } from '@/types';

const INITIAL_FILTERS: ReportFiltersState = {
  from: '',
  to: '',
  car: '',
  name: 'Bira International Circuit',
  event: 'pt',
  className: 'isuzu-omr',
  sortBy: 'datetime',
  sortOrder: 'desc',
  pageSize: '100',
};

const NAME_OPTIONS = [
  'Buriram International Circuit',
  'Bira International Circuit',
];

const SELECT_CLASS_NAME =
  'rounded-lg border border-cyan-400/40 bg-zinc-950 px-3 py-2 text-white outline-none transition focus:border-cyan-300 focus:bg-zinc-900';

const SELECT_STYLE = {
  colorScheme: 'dark' as const,
};

const OPTION_CLASS_NAME = 'bg-zinc-950 text-white';

function formatDateTime(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString('th-TH', {
    dateStyle: 'short',
    timeStyle: 'medium',
  });
}

function formatNumber(value: number, digits = 2) {
  return Number.isFinite(value) ? value.toFixed(digits) : '-';
}

export default function ReportPage() {
  const { cars, currentRole } = usePlatform();
  const [filters, setFilters] = useState<ReportFiltersState>(INITIAL_FILTERS);
  const [rows, setRows] = useState<LogReportRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(100);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState('');
  const fromInputRef = useRef<HTMLInputElement | null>(null);
  const toInputRef = useRef<HTMLInputElement | null>(null);

  const isCarScopedRole =
    currentRole === 'ENGINEER' || currentRole === 'COMPETITOR';
  const assignedCarOptions = useMemo(
    () =>
      [...cars]
        .sort((a, b) => Number(a.number) - Number(b.number))
        .map((car) => ({
          value: car.number,
          label: `Car ${car.number}`,
        })),
    [cars]
  );
  const lockedCarValue = isCarScopedRole
    ? (assignedCarOptions[0]?.value ?? '')
    : '';
  const scopedInitialFilters = useMemo(
    () => ({
      ...INITIAL_FILTERS,
      car: lockedCarValue,
    }),
    [lockedCarValue]
  );
  const canQueryReport = !isCarScopedRole || assignedCarOptions.length > 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const openDateTimePicker = (input: HTMLInputElement | null) => {
    if (!input) {
      return;
    }

    input.focus();

    const pickerInput = input as HTMLInputElement & {
      showPicker?: () => void;
    };

    pickerInput.showPicker?.();
  };

  const loadReport = async (targetPage = 1, nextFilters = filters) => {
    if (!canQueryReport) {
      setRows([]);
      setTotal(0);
      setPage(1);
      setIsLoading(false);
      setError('No assigned car available for this role.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const scopedFilters = isCarScopedRole
        ? { ...nextFilters, car: nextFilters.car || lockedCarValue }
        : nextFilters;
      const result = await fetchLogReport({
        ...scopedFilters,
        page: targetPage,
      });
      setRows(result.rows);
      setTotal(result.total);
      setPage(result.page);
      setPageSize(result.pageSize);
    } catch (loadError) {
      setRows([]);
      setTotal(0);
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Unable to load report data.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const loadInitialReport = async () => {
      if (!canQueryReport) {
        setRows([]);
        setTotal(0);
        setPage(1);
        setIsLoading(false);
        setError('No assigned car available for this role.');
        return;
      }

      setFilters(scopedInitialFilters);
      setIsLoading(true);
      setError('');

      try {
        const result = await fetchLogReport({
          ...scopedInitialFilters,
          page: 1,
        });
        setRows(result.rows);
        setTotal(result.total);
        setPage(result.page);
        setPageSize(result.pageSize);
      } catch (loadError) {
        setRows([]);
        setTotal(0);
        setError(
          loadError instanceof Error
            ? loadError.message
            : 'Unable to load report data.'
        );
      } finally {
        setIsLoading(false);
      }
    };

    void loadInitialReport();
  }, [canQueryReport, scopedInitialFilters]);

  const handleFilterChange = (
    key: keyof ReportFiltersState,
    value: string
  ) => {
    if (isCarScopedRole && key === 'car') {
      const isAssigned = assignedCarOptions.some(
        (option) => option.value === value
      );
      if (!isAssigned) return;
    }

    setFilters((current) => ({ ...current, [key]: value }));
  };

  const handleSearch = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await loadReport(1);
  };

  const handleReset = async () => {
    setFilters(scopedInitialFilters);
    await loadReport(1, scopedInitialFilters);
  };

  const handleExport = async () => {
    setIsExporting(true);
    setError('');

    try {
      const scopedFilters = isCarScopedRole
        ? { ...filters, car: filters.car || lockedCarValue }
        : filters;
      const { blob, fileName } = await downloadLogReportCsv(scopedFilters);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (exportError) {
      setError(
        exportError instanceof Error
          ? exportError.message
          : 'Unable to export CSV.'
      );
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex h-full flex-col gap-6 p-6">
      <PageHeader
        title="REPORT"
        subtitle={<span>Query telemetry data from tb.Log and export CSV</span>}
        actions={
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleExport}
              disabled={isExporting || isLoading}
              className="inline-flex items-center gap-2 rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-200 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isExporting ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Export CSV
            </button>
          </div>
        }
      />

      <form
        onSubmit={handleSearch}
        className="glass-panel grid gap-4 rounded-2xl border border-white/10 bg-surface/50 p-5 lg:grid-cols-4"
      >
        <label className="flex flex-col gap-2 text-sm text-zinc-300">
          Date From
          <div className="relative">
            <input
              ref={fromInputRef}
              type="datetime-local"
              value={filters.from}
              onChange={(event) => handleFilterChange('from', event.target.value)}
              onFocus={() => openDateTimePicker(fromInputRef.current)}
              className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 pr-10 text-white outline-none transition focus:border-cyan-400/50"
            />
            <button
              type="button"
              onClick={() => openDateTimePicker(fromInputRef.current)}
              className="absolute top-1/2 right-3 -translate-y-1/2 text-zinc-400 transition hover:text-cyan-300"
              aria-label="Open start date picker"
            >
              <CalendarDays className="h-4 w-4" />
            </button>
          </div>
        </label>
        <label className="flex flex-col gap-2 text-sm text-zinc-300">
          Date To
          <div className="relative">
            <input
              ref={toInputRef}
              type="datetime-local"
              value={filters.to}
              onChange={(event) => handleFilterChange('to', event.target.value)}
              onFocus={() => openDateTimePicker(toInputRef.current)}
              className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 pr-10 text-white outline-none transition focus:border-cyan-400/50"
            />
            <button
              type="button"
              onClick={() => openDateTimePicker(toInputRef.current)}
              className="absolute top-1/2 right-3 -translate-y-1/2 text-zinc-400 transition hover:text-cyan-300"
              aria-label="Open end date picker"
            >
              <CalendarDays className="h-4 w-4" />
            </button>
          </div>
        </label>
        <label className="flex flex-col gap-2 text-sm text-zinc-300">
          Car
          {isCarScopedRole ? (
            <select
              value={filters.car || lockedCarValue}
              onChange={(event) => handleFilterChange('car', event.target.value)}
              disabled={assignedCarOptions.length <= 1}
              className={`${SELECT_CLASS_NAME} disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-zinc-900 disabled:text-zinc-400`}
              style={SELECT_STYLE}
            >
              {assignedCarOptions.length === 0 ? (
                <option value="" className={OPTION_CLASS_NAME}>
                  No assigned car
                </option>
              ) : null}
              {assignedCarOptions.map((option) => (
                <option
                  key={option.value}
                  value={option.value}
                  className={OPTION_CLASS_NAME}
                >
                  {option.label}
                </option>
              ))}
            </select>
          ) : (
            <input
              value={filters.car}
              onChange={(event) => handleFilterChange('car', event.target.value)}
              placeholder="Car number or label"
              className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-white outline-none transition focus:border-cyan-400/50"
            />
          )}
        </label>
        <label className="flex flex-col gap-2 text-sm text-zinc-300">
          Track Selection
          <select
            value={filters.name}
            onChange={(event) => handleFilterChange('name', event.target.value)}
            className={SELECT_CLASS_NAME}
            style={SELECT_STYLE}
          >
            {NAME_OPTIONS.map((option) => (
              <option key={option} value={option} className={OPTION_CLASS_NAME}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-2 text-sm text-zinc-300">
          Event
          <input
            value={filters.event}
            readOnly
            onKeyDown={(event) => event.preventDefault()}
            placeholder="Event"
            className="cursor-not-allowed rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-white outline-none transition focus:border-cyan-400/50"
          />
        </label>
        <label className="flex flex-col gap-2 text-sm text-zinc-300">
          Class
          <input
            value={filters.className}
            readOnly
            onKeyDown={(event) => event.preventDefault()}
            placeholder="Vehicle class"
            className="cursor-not-allowed rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-white outline-none transition focus:border-cyan-400/50"
          />
        </label>
        <div className="grid grid-cols-2 gap-4">
          <label className="flex flex-col gap-2 text-sm text-zinc-300">
            Sort By
            <select
              value={filters.sortBy}
              onChange={(event) => handleFilterChange('sortBy', event.target.value)}
              className={SELECT_CLASS_NAME}
              style={SELECT_STYLE}
            >
              <option value="datetime" className={OPTION_CLASS_NAME}>
                datetime
              </option>
              <option value="createTime" className={OPTION_CLASS_NAME}>
                createTime
              </option>
            </select>
          </label>
          <label className="flex flex-col gap-2 text-sm text-zinc-300">
            Order
            <select
              value={filters.sortOrder}
              onChange={(event) => handleFilterChange('sortOrder', event.target.value)}
              className={SELECT_CLASS_NAME}
              style={SELECT_STYLE}
            >
              <option value="desc" className={OPTION_CLASS_NAME}>
                desc
              </option>
              <option value="asc" className={OPTION_CLASS_NAME}>
                asc
              </option>
            </select>
          </label>
        </div>
        <div className="flex items-end gap-3 lg:col-span-4">
          <button
            type="submit"
            disabled={isLoading}
            className="inline-flex items-center gap-2 rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
            Query Logs
          </button>
          <button
            type="button"
            onClick={handleReset}
            disabled={isLoading}
            className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RotateCcw className="h-4 w-4" />
            Reset
          </button>
        </div>
      </form>

      <section className="glass-panel flex flex-col gap-4 rounded-2xl border border-white/10 bg-surface/50 p-5">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <FileBarChart className="h-5 w-5 text-cyan-300" />
            <p className="text-xs text-zinc-500">
              {total.toLocaleString()} rows found, showing page {page} of {totalPages}
            </p>
          </div>
          {error ? <p className="text-sm text-rose-300">{error}</p> : null}
        </div>

        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="min-w-full divide-y divide-white/10 text-sm text-zinc-200">
            <thead className="bg-white/5 text-xs uppercase tracking-[0.2em] text-zinc-400">
              <tr>
                <th className="px-4 py-3 text-left">createTime</th>
                <th className="px-4 py-3 text-left">datetime</th>
                <th className="px-4 py-3 text-left">name</th>
                <th className="px-4 py-3 text-left">device</th>
                <th className="px-4 py-3 text-left">car</th>
                <th className="px-4 py-3 text-left">event</th>
                <th className="px-4 py-3 text-left">class</th>
                <th className="px-4 py-3 text-right">speed</th>
                <th className="px-4 py-3 text-right">rpm</th>
                <th className="px-4 py-3 text-right">lat</th>
                <th className="px-4 py-3 text-right">lon</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 bg-black/10">
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-white/3">
                  <td className="px-4 py-3 whitespace-nowrap">{formatDateTime(row.createTime)}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{formatDateTime(row.datetime)}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{row.name}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{row.device}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{row.car}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{row.even}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{row.class}</td>
                  <td className="px-4 py-3 text-right">{formatNumber(row.speed)}</td>
                  <td className="px-4 py-3 text-right">{row.rpm}</td>
                  <td className="px-4 py-3 text-right">{formatNumber(row.lat, 6)}</td>
                  <td className="px-4 py-3 text-right">{formatNumber(row.lon, 6)}</td>
                </tr>
              ))}
              {!isLoading && rows.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-4 py-10 text-center text-zinc-500">
                    No log data found for the selected filters.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-xs text-zinc-500">CSV export uses the same filter set as the current query.</p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void loadReport(page - 1)}
              disabled={isLoading || page <= 1}
              className="rounded-lg border border-white/10 px-3 py-2 text-sm text-zinc-200 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => void loadReport(page + 1)}
              disabled={isLoading || page >= totalPages}
              className="rounded-lg border border-white/10 px-3 py-2 text-sm text-zinc-200 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
