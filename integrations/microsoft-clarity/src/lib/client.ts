import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  isApiErrorRecord,
  pickDefined
} from 'slates';

export type ClarityDimension =
  | 'Browser'
  | 'Device'
  | 'Country/Region'
  | 'OS'
  | 'Source'
  | 'Medium'
  | 'Campaign'
  | 'Channel'
  | 'URL';

export type NumOfDays = 1 | 2 | 3;

export interface DashboardInsightsParams {
  numOfDays: NumOfDays;
  dimension1?: ClarityDimension;
  dimension2?: ClarityDimension;
  dimension3?: ClarityDimension;
}

export interface MetricInformation {
  [key: string]: string | number | undefined;
}

export interface DashboardMetric {
  metricName: string;
  information: MetricInformation[];
}

export interface SessionRecordingFilter {
  urls?: string[];
  deviceTypes?: string[];
  browsers?: string[];
  operatingSystems?: string[];
  countries?: string[];
  cities?: string[];
}

export interface SessionRecordingsParams {
  startDate: string;
  endDate: string;
  filters?: SessionRecordingFilter;
  sortBy?: string;
  count?: number;
}

let sortOptions: Record<string, number> = {
  SessionStart_DESC: 0,
  SessionStart_ASC: 1,
  SessionDuration_ASC: 2,
  SessionDuration_DESC: 3,
  SessionClickCount_ASC: 4,
  SessionClickCount_DESC: 5,
  PageCount_ASC: 6,
  PageCount_DESC: 7
};

export class ClarityClient {
  private axios: ReturnType<typeof createAuthenticatedAxios>;

  constructor(token: string) {
    if (!token.trim()) {
      throw createApiServiceError(
        'A Microsoft Clarity API token is required. Reconnect with a project Data Export token.'
      );
    }

    this.axios = createAuthenticatedAxios({
      baseURL: 'https://www.clarity.ms',
      authHeader: { value: `Bearer ${token}` },
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Microsoft Clarity',
          reason: 'clarity_api_error',
          extractResponse: (error, helpers) => {
            if (!helpers.isRecord(error) || !helpers.isRecord(error.data)) {
              return helpers.getResponse(error);
            }
            let data = error.data;
            let upstream = helpers.isRecord(data.upstream) ? data.upstream : undefined;
            let baggage = helpers.isRecord(data.baggage) ? data.baggage : undefined;
            let status = upstream?.status ?? data.status;
            return {
              status:
                typeof status === 'number' || typeof status === 'string' ? status : undefined,
              data: baggage?.response
            };
          }
        })
    });
  }

  async getDashboardInsights(params: DashboardInsightsParams): Promise<DashboardMetric[]> {
    let response = await this.axios.get('/export-data/api/v1/project-live-insights', {
      params: pickDefined({
        numOfDays: params.numOfDays,
        dimension1: params.dimension1,
        dimension2: params.dimension2,
        dimension3: params.dimension3
      })
    });

    if (!Array.isArray(response.data)) {
      throw createApiServiceError(
        'Microsoft Clarity returned an unexpected dashboard response. Expected a metric array.',
        { reason: 'clarity_invalid_response' }
      );
    }

    return response.data;
  }

  async listSessionRecordings(
    params: SessionRecordingsParams
  ): Promise<Record<string, unknown>[]> {
    let start = new Date(params.startDate);
    let end = new Date(params.endDate);
    let isValidUtcDate = (value: string, date: Date) =>
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value) &&
      !Number.isNaN(date.getTime()) &&
      date.toISOString() ===
        value.replace(
          /(?:\.(\d{1,3}))?Z$/,
          (_match, fraction: string | undefined) => `.${(fraction ?? '').padEnd(3, '0')}Z`
        );
    if (
      !isValidUtcDate(params.startDate, start) ||
      !isValidUtcDate(params.endDate, end) ||
      start >= end
    ) {
      throw createApiServiceError(
        'Provide valid UTC ISO 8601 startDate and endDate values, with startDate before endDate.'
      );
    }

    let count = params.count ?? 100;
    if (!Number.isInteger(count) || count < 1 || count > 250) {
      throw createApiServiceError('count must be a whole number from 1 to 250.');
    }

    let sortBy = params.sortBy ?? 'SessionStart_DESC';
    let sort = Object.hasOwn(sortOptions, sortBy)
      ? sortOptions[sortBy]
      : /^[0-7]$/.test(sortBy)
        ? Number(sortBy)
        : undefined;
    if (sort === undefined) {
      throw createApiServiceError(
        `sortBy must be one of ${Object.keys(sortOptions).join(', ')} or a numeric string from 0 to 7.`
      );
    }

    let date = { start: start.toISOString(), end: end.toISOString() };
    let filters = params.filters;
    let body = {
      ...date,
      sortBy: sort,
      count,
      filters: pickDefined({
        date,
        visitedUrls: filters?.urls?.length
          ? filters.urls.map(url => ({ url, operator: 'isExactly' }))
          : undefined,
        deviceType: filters?.deviceTypes?.length
          ? filters.deviceTypes.map(value => (value === 'Desktop' ? 'PC' : value))
          : undefined,
        browser: filters?.browsers?.length ? filters.browsers : undefined,
        os: filters?.operatingSystems?.length
          ? filters.operatingSystems.map(value => (value === 'macOS' ? 'MacOS' : value))
          : undefined,
        country: filters?.countries?.length ? filters.countries : undefined,
        city: filters?.cities?.length ? filters.cities : undefined
      })
    };

    let response = await this.axios.post(
      'https://clarity.microsoft.com/mcp/recordings/sample',
      body
    );
    if (!Array.isArray(response.data) || !response.data.every(isApiErrorRecord)) {
      throw createApiServiceError(
        'Microsoft Clarity returned an unexpected recordings response. Expected an array of recording entries.',
        { reason: 'clarity_invalid_response' }
      );
    }

    return response.data;
  }

  async queryAnalyticsDashboard(query: string, timezone = 'UTC'): Promise<unknown> {
    if (!query.trim()) {
      throw createApiServiceError(
        'Provide a focused analytics question with an explicit time range.'
      );
    }
    try {
      new Intl.DateTimeFormat('en', { timeZone: timezone });
    } catch {
      throw createApiServiceError(
        'timezone must be a valid IANA time zone, such as UTC or America/New_York.'
      );
    }
    let response = await this.axios.post('https://clarity.microsoft.com/mcp/dashboard/query', {
      query,
      timezone
    });
    return response.data;
  }
}
