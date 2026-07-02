import { createAxios } from 'slates';

export interface TriggerCallParams {
  leadPhone: string;
  leadName?: string;
  leadEmail?: string;
  message?: string;
  secondaryPhone?: string;
  country?: string;
  agents?: Array<{
    name: string;
    phone: string;
  }>;
  customParams?: Record<string, string>;
}

export interface CallReportFilters {
  dateFrom?: string;
  dateTo?: string;
  widgetIds?: string;
  maxCalls?: number;
  page?: number;
  searchString?: string;
  status?: 'NO_ANSWER' | 'OPERATOR_ANSWERED' | 'CLIENT_ANSWERED';
  filterUrl?: string;
  filterReferer?: string;
  filterLeadNumber?: string;
  filterAgent?: string;
  filterAnswerTimeFrom?: number;
  filterAnswerTimeTo?: number;
  filterTalkTimeFrom?: number;
  filterTalkTimeTo?: number;
}

export class SpeedToLeadClient {
  private callAxios;
  private reportAxios;
  private widgetKey: string;
  private apiKey: string;

  constructor(config: { widgetKey: string; apiKey: string }) {
    this.widgetKey = config.widgetKey;
    this.apiKey = config.apiKey;

    this.callAxios = createAxios({
      baseURL: 'https://app.convolo.ai/rest/v1/ext'
    });

    this.reportAxios = createAxios({
      baseURL: 'https://api.leads.convolo.ai/api/v2'
    });
  }

  async triggerCall(params: TriggerCallParams): Promise<any> {
    let body: Record<string, string> = {
      widget_key: this.widgetKey,
      api_key: this.apiKey,
      lc_number: params.leadPhone
    };

    if (params.leadName) {
      body.lc_param_name = params.leadName;
    }
    if (params.leadEmail) {
      body.lc_param_email = params.leadEmail;
    }
    if (params.message) {
      body.lc_param_message = params.message;
    }
    if (params.secondaryPhone) {
      body.lc_number_2 = params.secondaryPhone;
    }
    if (params.country) {
      body.country = params.country;
    }

    if (params.agents) {
      params.agents.forEach((agent, index) => {
        let agentNum = String(index + 1).padStart(2, '0');
        body[`lc_param_agent${agentNum}name`] = agent.name;
        body[`lc_param_agent${agentNum}phone`] = agent.phone;
      });
    }

    if (params.customParams) {
      for (let [key, value] of Object.entries(params.customParams)) {
        let paramKey = key.startsWith('lc_param_') ? key : `lc_param_${key}`;
        body[paramKey] = value;
      }
    }

    let response = await this.callAxios.post('/add_call_api/', body, {
      headers: { 'Content-Type': 'application/json' }
    });

    return response.data;
  }

  async getCallReports(filters: CallReportFilters = {}): Promise<any> {
    let params: Record<string, string | number> = {
      'api-key': this.apiKey
    };

    if (filters.dateFrom) params.date_from = filters.dateFrom;
    if (filters.dateTo) params.date_to = filters.dateTo;
    if (filters.widgetIds) params.widget_ids = filters.widgetIds;
    if (filters.maxCalls !== undefined) params.max_calls = filters.maxCalls;
    if (filters.page !== undefined) params.page = filters.page;
    if (filters.searchString) params.search_string = filters.searchString;
    if (filters.status) params.status = filters.status;
    if (filters.filterUrl) params.filter_url = filters.filterUrl;
    if (filters.filterReferer) params.filter_referer = filters.filterReferer;
    if (filters.filterLeadNumber) params.filter_lead_number = filters.filterLeadNumber;
    if (filters.filterAgent) params.filter_agent = filters.filterAgent;
    if (filters.filterAnswerTimeFrom !== undefined)
      params.filter_answer_time_from = filters.filterAnswerTimeFrom;
    if (filters.filterAnswerTimeTo !== undefined)
      params.filter_answer_time_to = filters.filterAnswerTimeTo;
    if (filters.filterTalkTimeFrom !== undefined)
      params.filter_talk_time_from = filters.filterTalkTimeFrom;
    if (filters.filterTalkTimeTo !== undefined)
      params.filter_talk_time_to = filters.filterTalkTimeTo;

    let response = await this.reportAxios.get('/calls/payload-data-list', { params });

    return response.data;
  }
}
