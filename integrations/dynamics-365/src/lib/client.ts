import { createAxios } from 'slates';

let API_VERSION = 'v9.2';

function parseSearchResponse(data: any): any {
  let parsed = data;
  for (let i = 0; i < 2 && typeof parsed === 'string'; i++) {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      return data;
    }
  }
  return parsed;
}

export class DynamicsClient {
  private baseUrl: string;
  private token: string;

  constructor(config: { token: string; instanceUrl: string }) {
    this.token = config.token;
    this.baseUrl = `${config.instanceUrl.replace(/\/+$/, '')}/api/data/${API_VERSION}`;
  }

  private getAxios() {
    return createAxios({
      baseURL: this.baseUrl,
      headers: {
        Authorization: `Bearer ${this.token}`,
        'OData-MaxVersion': '4.0',
        'OData-Version': '4.0',
        Accept: 'application/json',
        'Content-Type': 'application/json; charset=utf-8'
      }
    });
  }

  // ---- Record CRUD ----

  async createRecord(
    entitySetName: string,
    data: Record<string, any>,
    detectDuplicates?: boolean
  ): Promise<any> {
    let http = this.getAxios();
    let headers: Record<string, string> = { Prefer: 'return=representation' };
    if (detectDuplicates === true) {
      headers['MSCRM.SuppressDuplicateDetection'] = 'false';
    }
    let response = await http.post(`/${entitySetName}`, data, { headers });
    return response.data;
  }

  async getRecord(
    entitySetName: string,
    recordId: string,
    options?: {
      select?: string[];
      expand?: string;
    }
  ): Promise<any> {
    let http = this.getAxios();
    let params: string[] = [];
    if (options?.select && options.select.length > 0) {
      params.push(`$select=${options.select.join(',')}`);
    }
    if (options?.expand) {
      params.push(`$expand=${options.expand}`);
    }
    let query = params.length > 0 ? `?${params.join('&')}` : '';
    let response = await http.get(`/${entitySetName}(${recordId})${query}`);
    return response.data;
  }

  async updateRecord(
    entitySetName: string,
    recordId: string,
    data: Record<string, any>
  ): Promise<any> {
    let http = this.getAxios();
    let response = await http.patch(`/${entitySetName}(${recordId})`, data, {
      headers: { Prefer: 'return=representation' }
    });
    return response.data;
  }

  async deleteRecord(entitySetName: string, recordId: string): Promise<void> {
    let http = this.getAxios();
    await http.delete(`/${entitySetName}(${recordId})`);
  }

  // ---- Query / List ----

  async listRecords(
    entitySetName: string,
    options?: {
      select?: string[];
      filter?: string;
      orderBy?: string;
      top?: number;
      expand?: string;
      skipToken?: string;
    }
  ): Promise<{ records: any[]; nextLink: string | null }> {
    let http = this.getAxios();

    if (options?.skipToken) {
      let response = await http.get(options.skipToken);
      let data = response.data;
      return {
        records: data.value || [],
        nextLink: data['@odata.nextLink'] || null
      };
    }

    let params: string[] = [];
    if (options?.select && options.select.length > 0) {
      params.push(`$select=${options.select.join(',')}`);
    }
    if (options?.filter) {
      params.push(`$filter=${options.filter}`);
    }
    if (options?.orderBy) {
      params.push(`$orderby=${options.orderBy}`);
    }
    if (options?.top) {
      params.push(`$top=${options.top}`);
    }
    if (options?.expand) {
      params.push(`$expand=${options.expand}`);
    }

    let query = params.length > 0 ? `?${params.join('&')}` : '';
    let response = await http.get(`/${entitySetName}${query}`);
    let data = response.data;

    return {
      records: data.value || [],
      nextLink: data['@odata.nextLink'] || null
    };
  }

  async fetchXml(entitySetName: string, fetchXml: string): Promise<any[]> {
    let http = this.getAxios();
    let encoded = encodeURIComponent(fetchXml);
    let response = await http.get(`/${entitySetName}?fetchXml=${encoded}`);
    return response.data.value || [];
  }

  // ---- Relationships ----

  async associateRecords(
    entitySetName: string,
    recordId: string,
    navigationProperty: string,
    targetEntitySetName: string,
    targetRecordId: string
  ): Promise<void> {
    let http = this.getAxios();
    await http.post(`/${entitySetName}(${recordId})/${navigationProperty}/$ref`, {
      '@odata.id': `${this.baseUrl}/${targetEntitySetName}(${targetRecordId})`
    });
  }

  async disassociateRecords(
    entitySetName: string,
    recordId: string,
    navigationProperty: string,
    targetRecordId?: string
  ): Promise<void> {
    let http = this.getAxios();
    let url = targetRecordId
      ? `/${entitySetName}(${recordId})/${navigationProperty}(${targetRecordId})/$ref`
      : `/${entitySetName}(${recordId})/${navigationProperty}/$ref`;
    await http.delete(url);
  }

  async getRelatedRecords(
    entitySetName: string,
    recordId: string,
    navigationProperty: string,
    options?: { select?: string[]; filter?: string; top?: number }
  ): Promise<any[]> {
    let http = this.getAxios();
    let params: string[] = [];
    if (options?.select && options.select.length > 0) {
      params.push(`$select=${options.select.join(',')}`);
    }
    if (options?.filter) {
      params.push(`$filter=${options.filter}`);
    }
    if (options?.top) {
      params.push(`$top=${options.top}`);
    }
    let query = params.length > 0 ? `?${params.join('&')}` : '';
    let response = await http.get(
      `/${entitySetName}(${recordId})/${navigationProperty}${query}`
    );
    return response.data.value || [];
  }

  // ---- Search ----

  async search(
    searchTerm: string,
    options?: {
      entities?: string[];
      filter?: string;
      top?: number;
    }
  ): Promise<any> {
    let http = this.getAxios();
    let body: Record<string, any> = { search: searchTerm, count: true };
    if (options?.entities && options.entities.length > 0) {
      body.entities = JSON.stringify(options.entities.map(name => ({ name })));
    }
    if (options?.filter) {
      body.filter = options.filter;
    }
    if (options?.top) {
      body.top = options.top;
    }
    let instanceUrl = this.baseUrl.replace(`/api/data/${API_VERSION}`, '');
    let response = await http.post(`${instanceUrl}/api/search/v2.0/query`, body, {
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      }
    });
    return parseSearchResponse(response.data);
  }

  // ---- Metadata ----

  async getEntityDefinitions(options?: {
    select?: string[];
    filter?: string;
  }): Promise<any[]> {
    let http = this.getAxios();
    let params: string[] = [];
    if (options?.select && options.select.length > 0) {
      params.push(`$select=${options.select.join(',')}`);
    }
    if (options?.filter) {
      params.push(`$filter=${options.filter}`);
    }
    let query = params.length > 0 ? `?${params.join('&')}` : '';
    let response = await http.get(`/EntityDefinitions${query}`);
    return response.data.value || [];
  }

  async getEntityDefinition(
    logicalName: string,
    options?: {
      select?: string[];
      expand?: string;
    }
  ): Promise<any> {
    let http = this.getAxios();
    let params: string[] = [];
    if (options?.select && options.select.length > 0) {
      params.push(`$select=${options.select.join(',')}`);
    }
    if (options?.expand) {
      params.push(`$expand=${options.expand}`);
    }
    let query = params.length > 0 ? `?${params.join('&')}` : '';
    let response = await http.get(`/EntityDefinitions(LogicalName='${logicalName}')${query}`);
    return response.data;
  }

  async getEntityAttributes(logicalName: string): Promise<any[]> {
    let http = this.getAxios();
    let response = await http.get(
      `/EntityDefinitions(LogicalName='${logicalName}')/Attributes?$select=LogicalName,DisplayName,AttributeType,RequiredLevel,IsValidForCreate,IsValidForUpdate`
    );
    return response.data.value || [];
  }

  // ---- Functions & Actions ----

  async whoAmI(): Promise<any> {
    let http = this.getAxios();
    let response = await http.get('/WhoAmI');
    return response.data;
  }

  async invokeUnboundFunction(
    functionName: string,
    parameters?: Record<string, any>
  ): Promise<any> {
    let http = this.getAxios();
    let paramStr = '';
    if (parameters && Object.keys(parameters).length > 0) {
      let parts = Object.entries(parameters).map(([key, value]) => {
        if (typeof value === 'string') {
          return `${key}='${value}'`;
        }
        return `${key}=${JSON.stringify(value)}`;
      });
      paramStr = `(${parts.join(',')})`;
    }
    let response = await http.get(`/${functionName}${paramStr}`);
    return response.data;
  }

  async invokeUnboundAction(actionName: string, body?: Record<string, any>): Promise<any> {
    let http = this.getAxios();
    let response = await http.post(`/${actionName}`, body || {});
    return response.data;
  }

  async invokeBoundAction(
    entitySetName: string,
    recordId: string,
    actionName: string,
    body?: Record<string, any>
  ): Promise<any> {
    let http = this.getAxios();
    let response = await http.post(
      `/${entitySetName}(${recordId})/Microsoft.Dynamics.CRM.${actionName}`,
      body || {}
    );
    return response.data;
  }

  // ---- Record count for polling ----

  async getRecordCount(entitySetName: string, filter?: string): Promise<number> {
    let http = this.getAxios();
    let params = filter ? `?$filter=${filter}` : '';
    let response = await http.get(`/${entitySetName}${params}`, {
      headers: { Prefer: 'odata.include-annotations="*"' }
    });
    return (
      response.data['@odata.count'] || (response.data.value ? response.data.value.length : 0)
    );
  }

  // ---- Modified records for polling ----

  async getModifiedRecords(
    entitySetName: string,
    since: string,
    options?: {
      select?: string[];
      top?: number;
      orderBy?: string;
    }
  ): Promise<{ records: any[]; nextLink: string | null }> {
    let http = this.getAxios();
    let params: string[] = [];
    params.push(`$filter=modifiedon gt ${since}`);
    if (options?.select && options.select.length > 0) {
      params.push(`$select=${options.select.join(',')}`);
    }
    params.push(`$orderby=${options?.orderBy || 'modifiedon desc'}`);
    if (options?.top) {
      params.push(`$top=${options.top}`);
    }
    let query = `?${params.join('&')}`;
    let response = await http.get(`/${entitySetName}${query}`);
    let data = response.data;
    return {
      records: data.value || [],
      nextLink: data['@odata.nextLink'] || null
    };
  }
}
