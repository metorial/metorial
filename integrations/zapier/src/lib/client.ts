import { createAxios } from '@slates/provider';
import { zapierApiError } from './errors';

let http = createAxios({
  baseURL: 'https://api.zapier.com'
});

export interface PaginationParams {
  limit?: number;
  offset?: number;
}

export interface PaginatedResponse<T> {
  links: {
    next: string | null;
    prev: string | null;
    previous?: string | null;
  };
  meta: {
    count: number;
    limit: number | null;
    offset: number;
  };
  data: T[];
}

export interface ZapierApp {
  id: string;
  type: string;
  image: string;
  title: string;
  description: string;
  hexColor: string;
  actionTypes: string[];
  links: {
    connectNewAuthentication: string;
  };
  images: {
    url16x16: string;
    url32x32: string;
    url64x64: string;
    url128x128: string;
  };
  categories: { slug: string }[];
}

export interface ZapStep {
  action: string | Record<string, any>;
  authentication: string | Record<string, any> | null;
  inputs: Record<string, any> | null;
  title: string | null;
}

export interface Zap {
  type: string;
  id: string;
  isEnabled: boolean;
  lastSuccessfulRunDate: string | null;
  updatedAt: string;
  title: string;
  links: {
    htmlEditor: string;
  };
  steps: ZapStep[];
}

export interface ZapAction {
  id: string;
  key: string;
  app: string;
  type: string;
  actionType: string;
  isInstant: boolean;
  title: string;
  description: string;
}

export interface ZapAuthentication {
  type: string;
  id: string;
  app: string;
  isExpired: boolean;
  title: string;
}

export interface ZapTemplate {
  id: number;
  title: string;
  slug: string;
  status: string;
  descriptionPlain: string;
  descriptionRaw: string;
  description: string;
  url: string;
  createUrl: string;
  type: string;
  steps: ZapTemplateStep[];
}

export interface ZapTemplateStep {
  id: number | null;
  uuid: string;
  title: string;
  slug: string;
  description: string;
  image: string;
  hexColor: string;
  images: {
    url16x16: string;
    url32x32: string;
    url64x64: string;
    url128x128: string;
  };
  api: string;
  url: string;
  label: string | null;
}

export interface ZapCategory {
  id: number;
  title: string;
  slug: string;
  description: string;
  url: string;
  typeOf: string;
  featuredEntrySlug: string | null;
  role: string;
}

export interface ZapRun {
  id: string;
  zapId: number;
  startTime: string | null;
  endTime: string | null;
  status: string;
  zapTitle: string | null;
  steps: {
    status: string | null;
    startTime: string | null;
  }[];
  dataIn: unknown;
  dataOut: unknown;
}

export interface ZapierActionRunCreated {
  type: string;
  id: string;
}

export interface ZapierActionRun {
  type: string;
  id?: string;
  runId?: string;
  status: string;
  results?: unknown;
  errors?: unknown[];
}

// Utility to convert snake_case response keys to camelCase for our interfaces
let toCamelCase = (str: string): string => {
  return str.replace(/_([a-z0-9])/g, (_, letter) => letter.toUpperCase());
};

let preserveNestedKeys = new Set(['data_in', 'data_out', 'errors', 'inputs', 'results']);

let transformKeys = (obj: any, preserveCurrentObject = false): any => {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(item => transformKeys(item, preserveCurrentObject));
  if (preserveCurrentObject) return obj;
  if (typeof obj === 'object') {
    let result: Record<string, any> = {};
    for (let key of Object.keys(obj)) {
      let transformedKey = toCamelCase(key);
      result[transformedKey] = transformKeys(obj[key], preserveNestedKeys.has(key));
    }
    return result;
  }
  return obj;
};

export class Client {
  private token: string;

  constructor(config: { token: string }) {
    this.token = config.token;
  }

  private get headers() {
    return {
      Authorization: `Bearer ${this.token}`,
      Accept: 'application/json'
    };
  }

  private async request<T>(
    operation: string,
    run: () => Promise<{ data: unknown }>,
    options: { transform?: boolean } = {}
  ): Promise<T> {
    try {
      let response = await run();
      return (options.transform === false ? response.data : transformKeys(response.data)) as T;
    } catch (error) {
      throw zapierApiError(error, operation);
    }
  }

  // ---- Apps ----

  async getApps(
    params?: PaginationParams & {
      query?: string;
      category?: string;
      ids?: string;
    }
  ): Promise<PaginatedResponse<ZapierApp>> {
    let queryParams: Record<string, string> = {};
    if (params?.limit) queryParams.limit = String(params.limit);
    if (params?.offset) queryParams.offset = String(params.offset);
    if (params?.query) queryParams.query = params.query;
    if (params?.category) queryParams.category = params.category;
    if (params?.ids) queryParams.ids = params.ids;

    return await this.request<PaginatedResponse<ZapierApp>>('list apps', () =>
      http.get('/v2/apps', {
        headers: this.headers,
        params: queryParams
      })
    );
  }

  // ---- Zaps ----

  async getZaps(
    params?: PaginationParams & {
      expand?: string;
      includeShared?: boolean;
      inputs?: Record<string, string>;
    }
  ): Promise<PaginatedResponse<Zap>> {
    let queryParams: Record<string, string> = {};
    if (params?.limit) queryParams.limit = String(params.limit);
    if (params?.offset) queryParams.offset = String(params.offset);
    if (params?.expand) queryParams.expand = params.expand;
    if (params?.includeShared) queryParams.include_shared = 'true';
    if (params?.inputs) {
      for (let [key, value] of Object.entries(params.inputs)) {
        queryParams[`inputs[${key}]`] = value;
      }
    }

    return await this.request<PaginatedResponse<Zap>>('list zaps', () =>
      http.get('/v2/zaps', {
        headers: this.headers,
        params: queryParams
      })
    );
  }

  async createZap(
    data: {
      title: string;
      steps: {
        action: string;
        inputs: Record<string, any>;
        authentication: string | null;
        alias?: string | null;
      }[];
    },
    expand?: string
  ): Promise<Zap> {
    let queryParams: Record<string, string> = {};
    if (expand) queryParams.expand = expand;

    return await this.request<Zap>('create zap', () =>
      http.post(
        '/v2/zaps',
        { data },
        {
          headers: { ...this.headers, 'Content-Type': 'application/json' },
          params: queryParams
        }
      )
    );
  }

  // ---- Actions ----

  async getActions(params: {
    app: string;
    actionType?: string;
  }): Promise<PaginatedResponse<ZapAction>> {
    let queryParams: Record<string, string> = {
      app: params.app
    };
    if (params.actionType) queryParams.action_type = params.actionType;

    return await this.request<PaginatedResponse<ZapAction>>('list actions', () =>
      http.get('/v2/actions', {
        headers: this.headers,
        params: queryParams
      })
    );
  }

  async getInputFields(
    actionId: string,
    data: {
      authentication: string | null;
      inputs: Record<string, any>;
    }
  ): Promise<PaginatedResponse<any>> {
    return await this.request<PaginatedResponse<any>>(
      'get action input fields',
      () =>
        http.post(
          `/v2/actions/${actionId}/inputs`,
          { data },
          {
            headers: { ...this.headers, 'Content-Type': 'application/json' }
          }
        ),
      { transform: false }
    );
  }

  async getOutputFields(
    actionId: string,
    data: {
      authentication: string | null;
      inputs: Record<string, any>;
    }
  ): Promise<PaginatedResponse<any>> {
    return await this.request<PaginatedResponse<any>>(
      'get action output fields',
      () =>
        http.post(
          `/v2/actions/${actionId}/outputs`,
          { data },
          {
            headers: { ...this.headers, 'Content-Type': 'application/json' }
          }
        ),
      { transform: false }
    );
  }

  async getChoices(
    actionId: string,
    fieldId: string,
    data: {
      authentication: string | null;
      inputs: Record<string, any>;
      page?: number;
    }
  ): Promise<PaginatedResponse<any>> {
    let { page, ...bodyData } = data;

    return await this.request<PaginatedResponse<any>>(
      'get input field choices',
      () =>
        http.post(
          `/v2/actions/${actionId}/inputs/${fieldId}/choices`,
          { data: bodyData },
          {
            headers: { ...this.headers, 'Content-Type': 'application/json' },
            params: page !== undefined ? { page: String(page) } : undefined
          }
        ),
      { transform: false }
    );
  }

  async testStep(
    actionId: string,
    data: {
      authentication: string | null;
      inputs: Record<string, any>;
      limit?: number;
      offset?: number;
    }
  ): Promise<any> {
    return await this.request<any>(
      'test action step',
      () =>
        http.post(
          `/v2/actions/${actionId}/test`,
          { data },
          {
            headers: { ...this.headers, 'Content-Type': 'application/json' }
          }
        ),
      { transform: false }
    );
  }

  async createActionRun(data: {
    action: string;
    authentication: string | null;
    inputs: Record<string, any>;
  }): Promise<{ data: ZapierActionRunCreated }> {
    return await this.request<{ data: ZapierActionRunCreated }>('create action run', () =>
      http.post(
        '/v2/action-runs',
        { data },
        {
          headers: { ...this.headers, 'Content-Type': 'application/json' }
        }
      )
    );
  }

  async getActionRun(actionRunId: string): Promise<{ data: ZapierActionRun }> {
    return await this.request<{ data: ZapierActionRun }>('get action run', () =>
      http.get(`/v2/action-runs/${actionRunId}`, {
        headers: this.headers
      })
    );
  }

  // ---- Authentications ----

  async getAuthentications(
    params: {
      app: string;
    } & PaginationParams
  ): Promise<PaginatedResponse<ZapAuthentication>> {
    let queryParams: Record<string, string> = {
      app: params.app
    };
    if (params.limit) queryParams.limit = String(params.limit);
    if (params.offset) queryParams.offset = String(params.offset);

    return await this.request<PaginatedResponse<ZapAuthentication>>(
      'list authentications',
      () =>
        http.get('/v2/authentications', {
          headers: this.headers,
          params: queryParams
        })
    );
  }

  async createAuthentication(data: {
    title: string;
    app: string;
    authenticationFields: Record<string, string>;
  }): Promise<PaginatedResponse<ZapAuthentication>> {
    return await this.request<PaginatedResponse<ZapAuthentication>>(
      'create authentication',
      () =>
        http.post(
          '/v2/authentications',
          {
            data: {
              title: data.title,
              app: data.app,
              authentication_fields: data.authenticationFields
            }
          },
          {
            headers: { ...this.headers, 'Content-Type': 'application/json' }
          }
        )
    );
  }

  // ---- Zap Templates ----

  async getZapTemplates(
    params?: PaginationParams & {
      apps?: string;
      clientId?: string;
    }
  ): Promise<ZapTemplate[]> {
    let queryParams: Record<string, string> = {};
    if (params?.limit) queryParams.limit = String(params.limit);
    if (params?.offset) queryParams.offset = String(params.offset);
    if (params?.apps) queryParams.apps = params.apps;
    if (params?.clientId) queryParams.client_id = params.clientId;

    return await this.request<ZapTemplate[]>('get zap templates', () =>
      http.get('/v1/zap-templates', {
        params: queryParams
      })
    );
  }

  // ---- Categories ----

  async getCategories(params?: PaginationParams): Promise<{
    next: string | null;
    previous: string | null;
    count: number;
    objects: ZapCategory[];
  }> {
    let queryParams: Record<string, string> = {};
    if (params?.limit) queryParams.limit = String(params.limit);
    if (params?.offset) queryParams.offset = String(params.offset);

    return await this.request<{
      next: string | null;
      previous: string | null;
      count: number;
      objects: ZapCategory[];
    }>('list categories', () =>
      http.get('/v1/categories', {
        params: queryParams
      })
    );
  }

  // ---- Zap Runs ----

  async getZapRuns(
    params?: PaginationParams & {
      zapId?: number;
      fromDate?: string;
      toDate?: string;
      statuses?: string;
      search?: string;
    }
  ): Promise<PaginatedResponse<ZapRun>> {
    let queryParams: Record<string, string> = {};
    if (params?.limit) queryParams.limit = String(params.limit);
    if (params?.offset) queryParams.offset = String(params.offset);
    if (params?.zapId) queryParams.zap_id = String(params.zapId);
    if (params?.fromDate) queryParams.from_date = params.fromDate;
    if (params?.toDate) queryParams.to_date = params.toDate;
    if (params?.statuses) queryParams.statuses = params.statuses;
    if (params?.search) queryParams.search = params.search;

    return await this.request<PaginatedResponse<ZapRun>>('get zap runs', () =>
      http.get('/v2/zap-runs', {
        headers: this.headers,
        params: queryParams
      })
    );
  }

  // ---- Workflow Steps ----

  async createWorkflowStep(data: {
    step: {
      action: string;
      inputs: Record<string, any>;
      authentication: string | null;
    };
  }): Promise<any> {
    return await this.request<any>(
      'create workflow step',
      () =>
        http.post(
          '/v2/workflow-steps',
          { data },
          {
            headers: { ...this.headers, 'Content-Type': 'application/json' }
          }
        ),
      { transform: false }
    );
  }
}
