import { fetchWithAuth } from '@/lib/authClient';
import type { LogReportQuery, LogReportResponse } from '@/types';

export interface ReportFiltersState {
    from: string;
    to: string;
    car: string;
    name: string;
    event: string;
    className: string;
    sortBy: 'datetime' | 'createTime';
    sortOrder: 'asc' | 'desc';
    pageSize: string;
}

async function parseErrorMessage(response: Response): Promise<string> {
    const body = (await response.json().catch(() => ({}))) as {
        error?: { message?: string };
    };
    return body.error?.message ?? `HTTP ${response.status}`;
}

function normalizeCarFilter(value?: string) {
    const trimmed = value?.trim();

    if (!trimmed) {
        return undefined;
    }

    if (/^\d+$/.test(trimmed)) {
        return trimmed.padStart(2, '0');
    }

    return trimmed;
}

function buildQueryString(query: LogReportQuery) {
    const searchParams = new URLSearchParams();

    Object.entries(query).forEach(([key, value]) => {
        if (value === undefined || value === null || value === '') {
            return;
        }

        searchParams.set(key, String(value));
    });

    const result = searchParams.toString();
    return result ? `?${result}` : '';
}

function normalizeFilters(filters: Partial<ReportFiltersState> & { page?: number }) {
    return {
        from: filters.from,
        to: filters.to,
        car: normalizeCarFilter(filters.car),
        name: filters.name,
        event: filters.event,
        className: filters.className,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
        page: filters.page,
        pageSize: filters.pageSize ? Number.parseInt(filters.pageSize, 10) : undefined,
    } satisfies LogReportQuery;
}

export async function fetchLogReport(
    filters: Partial<ReportFiltersState> & { page?: number }
): Promise<LogReportResponse> {
    const res = await fetchWithAuth(
        `/api/reports/logs${buildQueryString(normalizeFilters(filters))}`,
        {
            cache: 'no-store',
        }
    );

    if (res.status === 401) {
        throw new Error('UNAUTHORIZED');
    }
    if (!res.ok) {
        throw new Error(await parseErrorMessage(res));
    }

    return res.json() as Promise<LogReportResponse>;
}

function extractFileName(contentDisposition: string | null) {
    if (!contentDisposition) {
        return `telemetry-log-report-${Date.now()}.csv`;
    }

    const match = contentDisposition.match(/filename="?([^";]+)"?/i);
    return match?.[1] ?? `telemetry-log-report-${Date.now()}.csv`;
}

export async function downloadLogReportCsv(
    filters: Partial<ReportFiltersState>
): Promise<{ blob: Blob; fileName: string }> {
    const res = await fetchWithAuth(
        `/api/reports/logs/export${buildQueryString(normalizeFilters(filters))}`,
        {
            cache: 'no-store',
        }
    );

    if (res.status === 401) {
        throw new Error('UNAUTHORIZED');
    }
    if (!res.ok) {
        throw new Error(await parseErrorMessage(res));
    }

    return {
        blob: await res.blob(),
        fileName: extractFileName(res.headers.get('content-disposition')),
    };
}
