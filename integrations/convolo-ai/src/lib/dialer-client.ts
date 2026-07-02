import { createAxios } from 'slates';

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
  private apiKey: string;

  constructor(config: { apiKey: string }) {
    this.apiKey = config.apiKey;

    this.axios = createAxios({
      baseURL: 'https://api.dialer.brightcall.ai/api/v3'
    });
  }

  async getCallsList(filters: DialerCallFilters): Promise<any> {
    let body = this.buildFilterBody(filters);

    let response = await this.axios.post('/stat/calls/list', body, {
      params: { 'api-key': this.apiKey },
      headers: { 'Content-Type': 'application/json' }
    });

    return response.data;
  }

  async getCallStatistics(filters: DialerCallFilters): Promise<any> {
    let body = this.buildFilterBody(filters);

    let response = await this.axios.post('/stat/calls-detailed-e-chart', body, {
      params: { 'api-key': this.apiKey },
      headers: { 'Content-Type': 'application/json' }
    });

    return response.data;
  }

  async getCallsCount(filters: DialerCallFilters): Promise<any> {
    let body = this.buildFilterBody(filters);

    let response = await this.axios.post('/stat/calls/count', body, {
      params: { 'api-key': this.apiKey },
      headers: { 'Content-Type': 'application/json' }
    });

    return response.data;
  }

  private buildFilterBody(filters: DialerCallFilters): Record<string, any> {
    let body: Record<string, any> = {
      dayFrom: filters.dayFrom,
      dayTo: filters.dayTo
    };

    if (filters.dateInterval) body.dateInterval = filters.dateInterval;
    if (filters.searchString) body.searchString = filters.searchString;
    if (filters.timezone) body.timezone = filters.timezone;
    if (filters.types) body.types = filters.types;
    if (filters.states) body.states = filters.states;
    if (filters.categories) body.categories = filters.categories;
    if (filters.agentIds) body.agentIds = filters.agentIds;
    if (filters.teamIds) body.teamIds = filters.teamIds;
    if (filters.projectIds) body.projectIds = filters.projectIds;
    if (filters.tags) body.tags = filters.tags;
    if (filters.outcomes) body.outcomes = filters.outcomes;
    if (filters.outcomeTypes) body.outcomeTypes = filters.outcomeTypes;
    if (filters.talkTimeFrom !== undefined) body.talkTimeFrom = filters.talkTimeFrom;
    if (filters.talkTimeTo !== undefined) body.talkTimeTo = filters.talkTimeTo;
    if (filters.answerTimeFrom !== undefined) body.answerTimeFrom = filters.answerTimeFrom;
    if (filters.answerTimeTo !== undefined) body.answerTimeTo = filters.answerTimeTo;
    if (filters.page !== undefined) body.page = filters.page;
    if (filters.itemsPerPage !== undefined) body.itemsPerPage = filters.itemsPerPage;
    if (filters.sortBy) body.sortBy = filters.sortBy;
    if (filters.sortDirection) body.sortDirection = filters.sortDirection;

    return body;
  }
}
