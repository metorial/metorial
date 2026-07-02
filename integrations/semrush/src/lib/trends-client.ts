import { createAxios } from 'slates';
import { parseCsvResponse } from './csv-parser';

export class SemrushTrendsClient {
  private axios: ReturnType<typeof createAxios>;
  private token: string;

  constructor(config: { token: string }) {
    this.token = config.token;
    this.axios = createAxios({
      baseURL: 'https://api.semrush.com'
    });
  }

  private buildParams(
    params: Record<string, string | number | undefined>
  ): Record<string, string | number> {
    let result: Record<string, string | number> = {
      key: this.token
    };
    for (let [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== '') {
        result[key] = value;
      }
    }
    return result;
  }

  async getTrafficSummary(params: {
    targets: string[];
    displayDate?: string;
    country?: string;
    displayLimit?: number;
    displayOffset?: number;
  }): Promise<Record<string, unknown>[]> {
    let response = await this.axios.get('/analytics/ta/api/v3/summary', {
      params: this.buildParams({
        targets: params.targets.join(','),
        display_date: params.displayDate,
        country: params.country,
        display_limit: params.displayLimit,
        display_offset: params.displayOffset,
        export_columns:
          'target,visits,desktop_visits,mobile_visits,users,desktop_users,mobile_users,pages_per_visit,desktop_pages_per_visit,mobile_pages_per_visit,avg_visit_duration,desktop_avg_visit_duration,mobile_avg_visit_duration,bounce_rate,desktop_bounce_rate,mobile_bounce_rate'
      })
    });
    return parseCsvResponse(response.data);
  }

  async getTrafficHistory(params: {
    target: string;
    displayDate?: string;
    country?: string;
    granularity?: string;
    displayLimit?: number;
    displayOffset?: number;
  }): Promise<Record<string, unknown>[]> {
    let response = await this.axios.get('/analytics/ta/api/v3/trendline', {
      params: this.buildParams({
        targets: params.target,
        display_date: params.displayDate,
        country: params.country,
        granularity: params.granularity || 'monthly',
        display_limit: params.displayLimit,
        display_offset: params.displayOffset,
        export_columns:
          'date,visits,desktop_visits,mobile_visits,users,desktop_users,mobile_users'
      })
    });
    return parseCsvResponse(response.data);
  }

  async getTrafficSources(params: {
    target: string;
    displayDate?: string;
    country?: string;
    displayLimit?: number;
    displayOffset?: number;
  }): Promise<Record<string, unknown>[]> {
    let response = await this.axios.get('/analytics/ta/api/v3/sources', {
      params: this.buildParams({
        targets: params.target,
        display_date: params.displayDate,
        country: params.country,
        display_limit: params.displayLimit,
        display_offset: params.displayOffset,
        export_columns: 'target,source_type,visits_share'
      })
    });
    return parseCsvResponse(response.data);
  }

  async getTrafficDestinations(params: {
    target: string;
    displayDate?: string;
    country?: string;
    displayLimit?: number;
    displayOffset?: number;
  }): Promise<Record<string, unknown>[]> {
    let response = await this.axios.get('/analytics/ta/api/v3/destinations', {
      params: this.buildParams({
        targets: params.target,
        display_date: params.displayDate,
        country: params.country,
        display_limit: params.displayLimit,
        display_offset: params.displayOffset,
        export_columns: 'target,domain,visits_share'
      })
    });
    return parseCsvResponse(response.data);
  }

  async getGeoDistribution(params: {
    target: string;
    displayDate?: string;
    country?: string;
    displayLimit?: number;
    displayOffset?: number;
  }): Promise<Record<string, unknown>[]> {
    let response = await this.axios.get('/analytics/ta/api/v3/geo', {
      params: this.buildParams({
        targets: params.target,
        display_date: params.displayDate,
        country: params.country,
        display_limit: params.displayLimit,
        display_offset: params.displayOffset,
        export_columns:
          'target,country,visits_share,visits,pages_per_visit,avg_visit_duration,bounce_rate'
      })
    });
    return parseCsvResponse(response.data);
  }

  async getTopPages(params: {
    target: string;
    displayDate?: string;
    country?: string;
    displayLimit?: number;
    displayOffset?: number;
  }): Promise<Record<string, unknown>[]> {
    let response = await this.axios.get('/analytics/ta/api/v3/toppages', {
      params: this.buildParams({
        targets: params.target,
        display_date: params.displayDate,
        country: params.country,
        display_limit: params.displayLimit,
        display_offset: params.displayOffset,
        export_columns: 'target,page,visits_share'
      })
    });
    return parseCsvResponse(response.data);
  }

  async getSubdomains(params: {
    target: string;
    displayDate?: string;
    country?: string;
    displayLimit?: number;
    displayOffset?: number;
  }): Promise<Record<string, unknown>[]> {
    let response = await this.axios.get('/analytics/ta/api/v3/subdomains', {
      params: this.buildParams({
        targets: params.target,
        display_date: params.displayDate,
        country: params.country,
        display_limit: params.displayLimit,
        display_offset: params.displayOffset,
        export_columns: 'target,subdomain,visits_share'
      })
    });
    return parseCsvResponse(response.data);
  }

  async getAudienceDemographics(params: {
    target: string;
    displayDate?: string;
    country?: string;
  }): Promise<Record<string, unknown>[]> {
    let response = await this.axios.get('/analytics/ta/api/v3/audience', {
      params: this.buildParams({
        targets: params.target,
        display_date: params.displayDate,
        country: params.country,
        export_columns:
          'target,age_18_24,age_25_34,age_35_44,age_45_54,age_55_64,age_65_plus,male,female'
      })
    });
    return parseCsvResponse(response.data);
  }
}
