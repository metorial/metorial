import { createAxios } from 'slates';

export interface ODataQueryOptions {
  filter?: string;
  select?: string;
  expand?: string;
  orderby?: string;
  top?: number;
  skip?: number;
}

let buildODataParams = (options?: ODataQueryOptions): Record<string, string | number> => {
  let params: Record<string, string | number> = {};
  if (!options) return params;
  if (options.filter) params.$filter = options.filter;
  if (options.select) params.$select = options.select;
  if (options.expand) params.$expand = options.expand;
  if (options.orderby) params.$orderby = options.orderby;
  if (options.top !== undefined) params.$top = options.top;
  if (options.skip !== undefined) params.$skip = options.skip;
  return params;
};

export class Client {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: { token: string }) {
    this.axios = createAxios({
      baseURL: 'https://www.21risk.com/odata/v5/',
      headers: {
        Authorization: `Bearer ${config.token}`,
        Accept: 'application/json'
      }
    });
  }

  async getOrganizations(options?: ODataQueryOptions) {
    let response = await this.axios.get('/Organizations', {
      params: buildODataParams(options)
    });
    return response.data.value ?? response.data;
  }

  async getSites(options?: ODataQueryOptions) {
    let response = await this.axios.get('/Sites', {
      params: buildODataParams(options)
    });
    return response.data.value ?? response.data;
  }

  async getSite(siteId: string, options?: ODataQueryOptions) {
    let response = await this.axios.get(`/Sites(${siteId})`, {
      params: buildODataParams(options)
    });
    return response.data;
  }

  async getAudits(options?: ODataQueryOptions) {
    let response = await this.axios.get('/Audits', {
      params: buildODataParams(options)
    });
    return response.data.value ?? response.data;
  }

  async getAudit(auditId: string, options?: ODataQueryOptions) {
    let response = await this.axios.get(`/Audits(${auditId})`, {
      params: buildODataParams(options)
    });
    return response.data;
  }

  async getRiskModels(options?: ODataQueryOptions) {
    let response = await this.axios.get('/RiskModels', {
      params: buildODataParams(options)
    });
    return response.data.value ?? response.data;
  }

  async getRiskModel(riskModelId: string, options?: ODataQueryOptions) {
    let response = await this.axios.get(`/RiskModels(${riskModelId})`, {
      params: buildODataParams(options)
    });
    return response.data;
  }

  async getCategories(options?: ODataQueryOptions) {
    let response = await this.axios.get('/Categories', {
      params: buildODataParams(options)
    });
    return response.data.value ?? response.data;
  }

  async getActions(options?: ODataQueryOptions) {
    let response = await this.axios.get('/Actions', {
      params: buildODataParams(options)
    });
    return response.data.value ?? response.data;
  }

  async getAction(actionId: string, options?: ODataQueryOptions) {
    let response = await this.axios.get(`/Actions(${actionId})`, {
      params: buildODataParams(options)
    });
    return response.data;
  }

  async getCompliance(options?: ODataQueryOptions) {
    let response = await this.axios.get('/Compliance', {
      params: buildODataParams(options)
    });
    return response.data.value ?? response.data;
  }

  async getMembers(options?: ODataQueryOptions) {
    let response = await this.axios.get('/Members', {
      params: buildODataParams(options)
    });
    return response.data.value ?? response.data;
  }

  async getPropertyInsuranceItems(options?: ODataQueryOptions) {
    let response = await this.axios.get('/PropertyInsuranceItems', {
      params: buildODataParams(options)
    });
    return response.data.value ?? response.data;
  }

  async getItemsPerMonth(options?: ODataQueryOptions) {
    let response = await this.axios.get('/ItemsPerMonth', {
      params: buildODataParams(options)
    });
    return response.data.value ?? response.data;
  }

  async getCope(options?: ODataQueryOptions) {
    let response = await this.axios.get('/Cope', {
      params: buildODataParams(options)
    });
    return response.data.value ?? response.data;
  }

  async getReports(options?: ODataQueryOptions) {
    let response = await this.axios.get('/Reports', {
      params: buildODataParams(options)
    });
    return response.data.value ?? response.data;
  }
}
