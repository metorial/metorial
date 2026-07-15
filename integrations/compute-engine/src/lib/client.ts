import { createAxios, requestAxiosData } from 'slates';
import { computeEngineApiError } from './errors';

export let COMPUTE_ENGINE_API_BASE_URL = 'https://compute.googleapis.com/compute/v1/' as const;

export type ComputeEngineClientConfig = {
  token: string;
  projectId: string;
  defaultZone?: string;
  defaultRegion?: string;
};

export type ComputeEngineRequest = {
  method: 'get' | 'post' | 'put' | 'patch' | 'delete';
  path: string;
  params?: Record<string, unknown>;
  body?: unknown;
};

export class ComputeEngineClient {
  private http: ReturnType<typeof createAxios>;

  readonly projectId: string;
  readonly defaultZone?: string;
  readonly defaultRegion?: string;

  constructor(config: ComputeEngineClientConfig) {
    this.projectId = config.projectId;
    this.defaultZone = config.defaultZone;
    this.defaultRegion = config.defaultRegion;
    this.http = createAxios({
      baseURL: COMPUTE_ENGINE_API_BASE_URL,
      allowAbsoluteUrls: false,
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  projectPath(resourcePath = '') {
    let suffix = resourcePath.replace(/^\/+/, '');
    let base = `projects/${encodeURIComponent(this.projectId)}`;
    return suffix ? `${base}/${suffix}` : base;
  }

  async request<T = unknown>(operation: string, request: ComputeEngineRequest): Promise<T> {
    return await requestAxiosData<T>(
      operation,
      () =>
        this.http.request<T>({
          method: request.method,
          url: request.path.replace(/^\/+/, ''),
          params: request.params,
          data: request.body
        }),
      computeEngineApiError
    );
  }
}
