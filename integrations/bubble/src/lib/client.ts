import { createAxios } from 'slates';

export interface BubbleRecord {
  _id: string;
  _type: string;
  'Created Date': string;
  'Modified Date': string;
  'Created By': string;
  [key: string]: any;
}

export interface BubbleSearchResponse {
  cursor: number;
  count: number;
  remaining: number;
  results: BubbleRecord[];
}

export interface BubbleConstraint {
  key: string;
  constraint_type: string;
  value?: any;
}

export interface SearchParams {
  constraints?: BubbleConstraint[];
  sortField?: string;
  descending?: boolean;
  limit?: number;
  cursor?: number;
}

export class Client {
  private baseUrl: string;
  private token?: string;

  constructor(config: { baseUrl: string; token?: string }) {
    this.baseUrl = config.baseUrl.replace(/\/+$/, '');
    this.token = config.token;
  }

  private getAxios() {
    let headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }
    return createAxios({
      baseURL: this.baseUrl,
      headers
    });
  }

  async getRecord(dataType: string, recordId: string): Promise<BubbleRecord> {
    let http = this.getAxios();
    let response = await http.get(
      `/obj/${encodeURIComponent(dataType)}/${encodeURIComponent(recordId)}`
    );
    return response.data.response;
  }

  async searchRecords(dataType: string, params?: SearchParams): Promise<BubbleSearchResponse> {
    let http = this.getAxios();
    let queryParams: Record<string, string> = {};

    if (params?.constraints && params.constraints.length > 0) {
      queryParams.constraints = JSON.stringify(params.constraints);
    }
    if (params?.sortField) {
      queryParams.sort_field = params.sortField;
      if (params.descending !== undefined) {
        queryParams.descending = String(params.descending);
      }
    }
    if (params?.limit !== undefined) {
      queryParams.limit = String(params.limit);
    }
    if (params?.cursor !== undefined) {
      queryParams.cursor = String(params.cursor);
    }

    let response = await http.get(`/obj/${encodeURIComponent(dataType)}`, {
      params: queryParams
    });
    return response.data.response;
  }

  async createRecord(
    dataType: string,
    fields: Record<string, any>
  ): Promise<{ id: string; status: string }> {
    let http = this.getAxios();
    let response = await http.post(`/obj/${encodeURIComponent(dataType)}`, fields);
    return { id: response.data.id, status: response.data.status };
  }

  async updateRecord(
    dataType: string,
    recordId: string,
    fields: Record<string, any>
  ): Promise<void> {
    let http = this.getAxios();
    await http.patch(
      `/obj/${encodeURIComponent(dataType)}/${encodeURIComponent(recordId)}`,
      fields
    );
  }

  async replaceRecord(
    dataType: string,
    recordId: string,
    fields: Record<string, any>
  ): Promise<void> {
    let http = this.getAxios();
    await http.put(
      `/obj/${encodeURIComponent(dataType)}/${encodeURIComponent(recordId)}`,
      fields
    );
  }

  async deleteRecord(dataType: string, recordId: string): Promise<void> {
    let http = this.getAxios();
    await http.delete(`/obj/${encodeURIComponent(dataType)}/${encodeURIComponent(recordId)}`);
  }

  async bulkCreateRecords(
    dataType: string,
    records: Record<string, any>[]
  ): Promise<{ ids: string[] }> {
    let http = this.getAxios();
    let response = await http.post(`/obj/${encodeURIComponent(dataType)}/bulk`, records);
    return { ids: response.data.response || [] };
  }

  async triggerWorkflow(workflowName: string, params: Record<string, any>): Promise<any> {
    let http = this.getAxios();
    let response = await http.post(`/wf/${encodeURIComponent(workflowName)}`, params);
    return response.data?.response ?? response.data;
  }

  async getSwaggerSpec(): Promise<any> {
    let http = this.getAxios();
    let response = await http.get('/meta/swagger.json');
    return response.data;
  }
}
