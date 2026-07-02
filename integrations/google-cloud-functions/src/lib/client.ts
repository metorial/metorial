import { createAxios } from 'slates';

let api = createAxios({
  baseURL: 'https://cloudfunctions.googleapis.com'
});

export interface ClientConfig {
  token: string;
  projectId: string;
  region: string;
}

export interface ListFunctionsParams {
  pageSize?: number;
  pageToken?: string;
  filter?: string;
  orderBy?: string;
  allLocations?: boolean;
}

export interface CreateFunctionParams {
  functionId: string;
  body: Record<string, any>;
}

export interface UpdateFunctionParams {
  name: string;
  updateMask: string;
  body: Record<string, any>;
}

export interface GenerateUploadUrlParams {
  kmsKeyName?: string;
  environment?: string;
}

export interface IamPolicyBinding {
  role: string;
  members: string[];
}

export class Client {
  private headers: Record<string, string>;
  private projectId: string;
  private region: string;

  constructor(config: ClientConfig) {
    this.headers = {
      Authorization: `Bearer ${config.token}`,
      'Content-Type': 'application/json'
    };
    this.projectId = config.projectId;
    this.region = config.region;
  }

  private get parent(): string {
    return `projects/${this.projectId}/locations/${this.region}`;
  }

  private parentForLocation(location: string): string {
    return `projects/${this.projectId}/locations/${location}`;
  }

  functionName(functionId: string, location?: string): string {
    let parent = location ? this.parentForLocation(location) : this.parent;
    return `${parent}/functions/${functionId}`;
  }

  async listFunctions(params?: ListFunctionsParams): Promise<any> {
    let location = params?.allLocations ? '-' : this.region;
    let parent = this.parentForLocation(location);

    let queryParams: Record<string, string> = {};
    if (params?.pageSize) queryParams.pageSize = String(params.pageSize);
    if (params?.pageToken) queryParams.pageToken = params.pageToken;
    if (params?.filter) queryParams.filter = params.filter;
    if (params?.orderBy) queryParams.orderBy = params.orderBy;

    let response = await api.get(`/v2/${parent}/functions`, {
      headers: this.headers,
      params: queryParams
    });

    return response.data;
  }

  async getFunction(name: string): Promise<any> {
    let response = await api.get(`/v2/${name}`, {
      headers: this.headers
    });
    return response.data;
  }

  async getFunctionByName(functionName: string, location?: string): Promise<any> {
    return this.getFunction(this.functionName(functionName, location));
  }

  async createFunction(params: CreateFunctionParams): Promise<any> {
    let response = await api.post(`/v2/${this.parent}/functions`, params.body, {
      headers: this.headers,
      params: { functionId: params.functionId }
    });
    return response.data;
  }

  async updateFunction(params: UpdateFunctionParams): Promise<any> {
    let response = await api.patch(`/v2/${params.name}`, params.body, {
      headers: this.headers,
      params: { updateMask: params.updateMask }
    });
    return response.data;
  }

  async deleteFunction(name: string): Promise<any> {
    let response = await api.delete(`/v2/${name}`, {
      headers: this.headers
    });
    return response.data;
  }

  async deleteFunctionByName(functionName: string, location?: string): Promise<any> {
    return this.deleteFunction(this.functionName(functionName, location));
  }

  async generateUploadUrl(params?: GenerateUploadUrlParams): Promise<any> {
    let body: Record<string, any> = {};
    if (params?.kmsKeyName) body.kmsKeyName = params.kmsKeyName;
    if (params?.environment) body.environment = params.environment;

    let response = await api.post(`/v2/${this.parent}/functions:generateUploadUrl`, body, {
      headers: this.headers
    });
    return response.data;
  }

  async generateDownloadUrl(functionName: string, location?: string): Promise<any> {
    let name = this.functionName(functionName, location);

    let response = await api.post(
      `/v2/${name}:generateDownloadUrl`,
      {},
      { headers: this.headers }
    );
    return response.data;
  }

  async getIamPolicy(functionName: string, location?: string): Promise<any> {
    let name = this.functionName(functionName, location);

    let response = await api.get(`/v2/${name}:getIamPolicy`, { headers: this.headers });
    return response.data;
  }

  async setIamPolicy(
    functionName: string,
    policy: { bindings: IamPolicyBinding[]; etag?: string },
    location?: string
  ): Promise<any> {
    let name = this.functionName(functionName, location);

    let response = await api.post(
      `/v2/${name}:setIamPolicy`,
      { policy },
      { headers: this.headers }
    );
    return response.data;
  }

  async testIamPermissions(
    functionName: string,
    permissions: string[],
    location?: string
  ): Promise<any> {
    let name = this.functionName(functionName, location);

    let response = await api.post(
      `/v2/${name}:testIamPermissions`,
      { permissions },
      { headers: this.headers }
    );
    return response.data;
  }

  async listRuntimes(location?: string): Promise<any> {
    let parent = location ? this.parentForLocation(location) : this.parent;

    let response = await api.get(`/v2/${parent}/runtimes`, { headers: this.headers });
    return response.data;
  }

  async getOperation(operationName: string): Promise<any> {
    let response = await api.get(`/v2/${operationName}`, {
      headers: this.headers
    });
    return response.data;
  }

  async listOperations(filter?: string, pageSize?: number, pageToken?: string): Promise<any> {
    let queryParams: Record<string, string> = {};
    if (filter) queryParams.filter = filter;
    if (pageSize) queryParams.pageSize = String(pageSize);
    if (pageToken) queryParams.pageToken = pageToken;

    let response = await api.get(`/v2/${this.parent}/operations`, {
      headers: this.headers,
      params: queryParams
    });
    return response.data;
  }
}
