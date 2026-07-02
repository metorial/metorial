import { createAxios } from 'slates';

export interface WorkdayClientConfig {
  token: string;
  baseUrl: string;
  tenant: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
}

export interface WorkdayReference {
  id?: string;
  descriptor?: string;
  href?: string;
}

export interface WorkerSummary {
  id: string;
  descriptor: string;
  href?: string;
  primaryWorkEmail?: string;
  businessTitle?: string;
  primarySupervisoryOrganization?: WorkdayReference;
}

export interface WorkerDetail {
  id: string;
  descriptor: string;
  href?: string;
  primaryWorkEmail?: string;
  businessTitle?: string;
  primarySupervisoryOrganization?: WorkdayReference;
  primaryPosition?: WorkdayReference;
  hireDate?: string;
  workerStatus?: {
    statusDate?: string;
    active?: boolean;
    terminated?: boolean;
  };
  [key: string]: any;
}

export interface TimeOffEntry {
  id?: string;
  date?: string;
  dailyQuantity?: number;
  timeOffType?: WorkdayReference;
  worker?: WorkdayReference;
  status?: string;
  [key: string]: any;
}

export interface InboxTask {
  id: string;
  descriptor?: string;
  href?: string;
  status?: string;
  assigned?: WorkdayReference;
  subject?: string;
  overallProcess?: WorkdayReference;
  stepType?: WorkdayReference;
  [key: string]: any;
}

export interface WqlResult {
  data: Record<string, any>[];
  total?: number;
}

export interface SupervisoryOrganization {
  id: string;
  descriptor?: string;
  href?: string;
  [key: string]: any;
}

export class WorkdayClient {
  private ax: ReturnType<typeof createAxios>;
  private baseUrl: string;
  private tenant: string;

  constructor(config: WorkdayClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.tenant = config.tenant;

    this.ax = createAxios({
      baseURL: this.baseUrl,
      headers: {
        Authorization: `Bearer ${config.token}`,
        Accept: 'application/json',
        'Content-Type': 'application/json'
      }
    });
  }

  private restPath(resource: string, limit?: number, offset?: number): string {
    let path = `/ccx/api/v1/${this.tenant}/${resource}`;
    let params: string[] = [];
    if (limit !== undefined) params.push(`limit=${limit}`);
    if (offset !== undefined) params.push(`offset=${offset}`);
    if (params.length > 0) path += `?${params.join('&')}`;
    return path;
  }

  private servicePath(service: string, version: string, resource: string): string {
    return `/ccx/api/${service}/${version}/${this.tenant}/${resource}`;
  }

  // --- Workers ---

  async listWorkers(params?: {
    limit?: number;
    offset?: number;
    search?: string;
  }): Promise<PaginatedResponse<WorkerSummary>> {
    let limit = params?.limit ?? 20;
    let offset = params?.offset ?? 0;
    let path = this.restPath('workers', limit, offset);
    if (params?.search) {
      path += `${path.includes('?') ? '&' : '?'}search=${encodeURIComponent(params.search)}`;
    }

    let response = await this.ax.get(path);
    let body = response.data as any;

    return {
      data: body.data ?? [],
      total: body.total ?? 0
    };
  }

  async getWorker(workerId: string): Promise<WorkerDetail> {
    let path = this.restPath(`workers/${workerId}`);
    let response = await this.ax.get(path);
    return response.data as WorkerDetail;
  }

  async getWorkerActivity(workerId: string, subResource: string): Promise<any> {
    let path = this.restPath(`workers/${workerId}/${subResource}`);
    let response = await this.ax.get(path);
    return response.data;
  }

  // --- Time Off ---

  async getWorkerTimeOffEntries(
    workerId: string,
    params?: {
      limit?: number;
      offset?: number;
      fromDate?: string;
      toDate?: string;
    }
  ): Promise<PaginatedResponse<TimeOffEntry>> {
    let limit = params?.limit ?? 20;
    let offset = params?.offset ?? 0;
    let path = this.restPath(`workers/${workerId}/requestedTimeOffEntries`, limit, offset);
    if (params?.fromDate) {
      path += `&fromDate=${encodeURIComponent(params.fromDate)}`;
    }
    if (params?.toDate) {
      path += `&toDate=${encodeURIComponent(params.toDate)}`;
    }
    let response = await this.ax.get(path);
    let body = response.data as any;
    return {
      data: body.data ?? [],
      total: body.total ?? 0
    };
  }

  async requestTimeOff(
    workerId: string,
    payload: {
      date: string;
      dailyQuantity: number;
      timeOffType: { id: string };
      comment?: string;
    }
  ): Promise<any> {
    let path = this.restPath(`workers/${workerId}/requestedTimeOffEntries`);
    let response = await this.ax.post(path, payload);
    return response.data;
  }

  // --- Time Tracking ---

  async getWorkerTimeBlocks(
    workerId: string,
    params?: {
      fromDate?: string;
      toDate?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<PaginatedResponse<any>> {
    let limit = params?.limit ?? 20;
    let offset = params?.offset ?? 0;
    let path = this.servicePath('timeTracking', 'v5', `workers/${workerId}/timeBlocks`);
    let queryParams: string[] = [];
    queryParams.push(`limit=${limit}`);
    queryParams.push(`offset=${offset}`);
    if (params?.fromDate) queryParams.push(`fromDate=${encodeURIComponent(params.fromDate)}`);
    if (params?.toDate) queryParams.push(`toDate=${encodeURIComponent(params.toDate)}`);
    path += `?${queryParams.join('&')}`;

    let response = await this.ax.get(path);
    let body = response.data as any;
    return {
      data: body.data ?? [],
      total: body.total ?? 0
    };
  }

  // --- Inbox Tasks ---

  async getInboxTasks(
    workerId: string,
    params?: {
      limit?: number;
      offset?: number;
    }
  ): Promise<PaginatedResponse<InboxTask>> {
    let limit = params?.limit ?? 20;
    let offset = params?.offset ?? 0;
    let path = this.restPath(`workers/${workerId}/inboxTasks`, limit, offset);
    let response = await this.ax.get(path);
    let body = response.data as any;
    return {
      data: body.data ?? [],
      total: body.total ?? 0
    };
  }

  async approveInboxTask(
    workerId: string,
    inboxTaskId: string,
    comment?: string
  ): Promise<any> {
    let path = this.restPath(`workers/${workerId}/inboxTasks/${inboxTaskId}/approve`);
    let payload: Record<string, any> = {};
    if (comment) payload.comment = comment;
    let response = await this.ax.post(path, payload);
    return response.data;
  }

  async denyInboxTask(workerId: string, inboxTaskId: string, comment?: string): Promise<any> {
    let path = this.restPath(`workers/${workerId}/inboxTasks/${inboxTaskId}/deny`);
    let payload: Record<string, any> = {};
    if (comment) payload.comment = comment;
    let response = await this.ax.post(path, payload);
    return response.data;
  }

  // --- WQL ---

  async executeWql(
    query: string,
    params?: {
      limit?: number;
      offset?: number;
    }
  ): Promise<WqlResult> {
    let path = `/ccx/api/wql/v1/${this.tenant}/data`;
    let queryParams: string[] = [];
    if (params?.limit) queryParams.push(`limit=${params.limit}`);
    if (params?.offset) queryParams.push(`offset=${params.offset}`);
    if (queryParams.length > 0) path += `?${queryParams.join('&')}`;

    let response = await this.ax.post(path, { query });
    let body = response.data as any;
    return {
      data: body.data ?? [],
      total: body.total
    };
  }

  // --- RaaS (Report as a Service) ---

  async getCustomReport(
    reportOwner: string,
    reportName: string,
    params?: {
      format?: 'json' | 'csv';
      prompts?: Record<string, string>;
    }
  ): Promise<any> {
    let format = params?.format ?? 'json';
    let path = `/ccx/service/customreport2/${this.tenant}/${reportOwner}/${reportName}?format=${format}`;
    if (params?.prompts) {
      for (let [key, value] of Object.entries(params.prompts)) {
        path += `&${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
      }
    }
    let response = await this.ax.get(path);
    return response.data;
  }

  // --- Supervisory Organizations ---

  async listSupervisoryOrganizations(params?: {
    limit?: number;
    offset?: number;
  }): Promise<PaginatedResponse<SupervisoryOrganization>> {
    let limit = params?.limit ?? 20;
    let offset = params?.offset ?? 0;
    let path = this.restPath('supervisoryOrganizations', limit, offset);
    let response = await this.ax.get(path);
    let body = response.data as any;
    return {
      data: body.data ?? [],
      total: body.total ?? 0
    };
  }

  async getSupervisoryOrganization(orgId: string): Promise<SupervisoryOrganization> {
    let path = this.restPath(`supervisoryOrganizations/${orgId}`);
    let response = await this.ax.get(path);
    return response.data as SupervisoryOrganization;
  }

  async getOrganizationWorkers(
    orgId: string,
    params?: {
      limit?: number;
      offset?: number;
    }
  ): Promise<PaginatedResponse<WorkerSummary>> {
    let limit = params?.limit ?? 20;
    let offset = params?.offset ?? 0;
    let path = this.restPath(`supervisoryOrganizations/${orgId}/workers`, limit, offset);
    let response = await this.ax.get(path);
    let body = response.data as any;
    return {
      data: body.data ?? [],
      total: body.total ?? 0
    };
  }

  // --- Custom Objects ---

  async listCustomObjects(
    customObjectName: string,
    params?: {
      limit?: number;
      offset?: number;
    }
  ): Promise<PaginatedResponse<any>> {
    let limit = params?.limit ?? 20;
    let offset = params?.offset ?? 0;
    let path = this.restPath(`customObjects/${customObjectName}`, limit, offset);
    let response = await this.ax.get(path);
    let body = response.data as any;
    return {
      data: body.data ?? [],
      total: body.total ?? 0
    };
  }

  async getCustomObject(customObjectName: string, objectId: string): Promise<any> {
    let path = this.restPath(`customObjects/${customObjectName}/${objectId}`);
    let response = await this.ax.get(path);
    return response.data;
  }

  async createCustomObject(
    customObjectName: string,
    payload: Record<string, any>
  ): Promise<any> {
    let path = this.restPath(`customObjects/${customObjectName}`);
    let response = await this.ax.post(path, payload);
    return response.data;
  }

  async updateCustomObject(
    customObjectName: string,
    objectId: string,
    payload: Record<string, any>
  ): Promise<any> {
    let path = this.restPath(`customObjects/${customObjectName}/${objectId}`);
    let response = await this.ax.patch(path, payload);
    return response.data;
  }

  async deleteCustomObject(customObjectName: string, objectId: string): Promise<void> {
    let path = this.restPath(`customObjects/${customObjectName}/${objectId}`);
    await this.ax.delete(path);
  }

  // --- Generic REST request ---

  async get(path: string): Promise<any> {
    let response = await this.ax.get(path);
    return response.data;
  }

  async post(path: string, payload?: any): Promise<any> {
    let response = await this.ax.post(path, payload);
    return response.data;
  }
}
