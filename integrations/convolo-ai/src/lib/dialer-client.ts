import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  pickDefined
} from 'slates';

export interface DialerCallFilters {
  dayFrom: string;
  dayTo: string;
  dateInterval?: string;
  searchString?: string;
  timezone?: string;
  types?: number[];
  states?: number[];
  categories?: string[];
  agentIds?: string[];
  teamIds?: string[];
  projectIds?: string[];
  tags?: string[];
  outcomes?: string[];
  outcomeTypes?: string[];
  talkTimeFrom?: number;
  talkTimeTo?: number;
  answerTimeFrom?: number;
  answerTimeTo?: number;
  page?: number;
  itemsPerPage?: number;
  sortBy?: 'timestamp' | 'talkTime' | 'answerTime';
  sortDirection?: 'ASC' | 'DESC';
}

export class DialerClient {
  private axios;

  constructor(config: { apiKey: string }) {
    if (!config.apiKey) {
      throw createApiServiceError(
        'A Power Dialer API key is required. Configure it in your authentication settings.'
      );
    }

    this.axios = createAuthenticatedAxios({
      baseURL: 'https://api.dialer.brightcall.ai/api/v3',
      params: { 'api-key': config.apiKey },
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Brightcall Power Dialer',
          reason: 'convolo_ai_dialer_api_error'
        })
    });
  }

  async getCallsList(filters: DialerCallFilters): Promise<any> {
    let body = this.buildFilterBody(filters);

    let response = await this.axios.post('/stat/calls/list', body);

    if (response.data?.success === false || !Array.isArray(response.data?.calls)) {
      throw buildApiServiceError(
        { response },
        {
          providerLabel: 'Brightcall Power Dialer',
          reason: 'convolo_ai_dialer_api_error',
          operation: 'retrieve call reports'
        }
      );
    }

    return response.data;
  }

  async getCallStatistics(filters: DialerCallFilters): Promise<any> {
    let body = this.buildFilterBody(filters);

    let response = await this.axios.post('/stat/calls-detailed-e-chart', body);

    if (response.data?.success === false || !response.data?.detailedStat) {
      throw buildApiServiceError(
        { response },
        {
          providerLabel: 'Brightcall Power Dialer',
          reason: 'convolo_ai_dialer_api_error',
          operation: 'retrieve call statistics'
        }
      );
    }

    return response.data;
  }

  async getCallsCount(filters: DialerCallFilters): Promise<any> {
    let body = this.buildFilterBody(filters);

    let response = await this.axios.post('/stat/calls/count', body);

    if (response.data?.success === false || typeof response.data?.totalItems !== 'number') {
      throw buildApiServiceError(
        { response },
        {
          providerLabel: 'Brightcall Power Dialer',
          reason: 'convolo_ai_dialer_api_error',
          operation: 'count calls'
        }
      );
    }

    return response.data;
  }

  async getAgents(filters: {
    page?: number;
    itemsPerPage?: number;
    searchString?: string;
    showDeleted?: boolean;
  }): Promise<any> {
    this.validatePagination(filters);
    let response = await this.axios.get('https://api.dialer.brightcall.ai/api/v1/agents', {
      params: pickDefined(filters)
    });

    if (response.data?.success === false || !Array.isArray(response.data?.agents)) {
      throw buildApiServiceError(
        { response },
        {
          providerLabel: 'Brightcall Power Dialer',
          reason: 'convolo_ai_dialer_api_error',
          operation: 'retrieve agents'
        }
      );
    }

    return response.data;
  }

  private validatePagination(filters: { page?: number; itemsPerPage?: number }) {
    for (let field of ['page', 'itemsPerPage'] as const) {
      let value = filters[field];
      if (value !== undefined && (!Number.isInteger(value) || value < 1)) {
        throw createApiServiceError(`${field} must be a positive whole number.`);
      }
    }
  }

  private buildFilterBody(filters: DialerCallFilters): Record<string, unknown> {
    this.validatePagination(filters);
    return pickDefined(filters);
  }
}
