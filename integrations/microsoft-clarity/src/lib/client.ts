import { createAxios } from 'slates';

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

export class ClarityClient {
  private axios: ReturnType<typeof createAxios>;

  constructor(token: string) {
    this.axios = createAxios({
      baseURL: 'https://www.clarity.ms',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  async getDashboardInsights(params: DashboardInsightsParams): Promise<DashboardMetric[]> {
    let queryParams: Record<string, string> = {
      numOfDays: String(params.numOfDays)
    };

    if (params.dimension1) {
      queryParams.dimension1 = params.dimension1;
    }
    if (params.dimension2) {
      queryParams.dimension2 = params.dimension2;
    }
    if (params.dimension3) {
      queryParams.dimension3 = params.dimension3;
    }

    let response = await this.axios.get('/export-data/api/v1/project-live-insights', {
      params: queryParams
    });

    return response.data;
  }

  async listSessionRecordings(params: SessionRecordingsParams): Promise<any[]> {
    let body: Record<string, any> = {
      start: params.startDate,
      end: params.endDate
    };

    if (params.sortBy) {
      body.sortBy = params.sortBy;
    }

    if (params.count) {
      body.count = params.count;
    }

    if (params.filters) {
      let filters: Record<string, any> = {};

      if (params.filters.urls && params.filters.urls.length > 0) {
        filters.urls = params.filters.urls;
      }
      if (params.filters.deviceTypes && params.filters.deviceTypes.length > 0) {
        filters.deviceTypes = params.filters.deviceTypes;
      }
      if (params.filters.browsers && params.filters.browsers.length > 0) {
        filters.browsers = params.filters.browsers;
      }
      if (params.filters.operatingSystems && params.filters.operatingSystems.length > 0) {
        filters.operatingSystems = params.filters.operatingSystems;
      }
      if (params.filters.countries && params.filters.countries.length > 0) {
        filters.countries = params.filters.countries;
      }
      if (params.filters.cities && params.filters.cities.length > 0) {
        filters.cities = params.filters.cities;
      }

      if (Object.keys(filters).length > 0) {
        body.filters = filters;
      }
    }

    let response = await this.axios.post('/mcp/recordings/sample', body);

    return response.data;
  }
}
