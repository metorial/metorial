import { buildApiServiceError, createAuthenticatedAxios } from 'slates';

export type ProbeLocation = {
  continent: string;
  region: string;
  country: string;
  state?: string | null;
  city: string;
  asn: number;
  network: string;
  latitude: number;
  longitude: number;
};

export type Probe = {
  version?: string;
  location: ProbeLocation;
  tags?: string[];
  resolvers?: string[];
};

export type Measurement = {
  id: string;
  type: string;
  target: string;
  status: string;
  probesCount: number;
  createdAt: string;
  updatedAt: string;
  results: Array<{
    probe: ProbeLocation & { tags?: string[]; resolvers?: string[] };
    result: Record<string, unknown>;
  }>;
};

export type MeasurementRequest = {
  type: string;
  target: string;
  locations?: Record<string, unknown>[] | string;
  limit?: number;
  measurementOptions?: Record<string, unknown>;
  inProgressUpdates?: boolean;
  timeout?: number;
};

type Limits = {
  rateLimit: {
    measurements: {
      create: { type: string; limit: number; remaining: number; reset: number };
    };
  };
  credits?: { remaining?: number | null };
};

export class Client {
  private http;

  constructor(config: { token?: string }) {
    this.http = createAuthenticatedAxios({
      baseURL: 'https://api.globalping.io/v1',
      authHeader: config.token ? { value: `Bearer ${config.token}` } : undefined,
      timeout: 10000,
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Globalping',
          reason: 'globalping_api_error'
        })
    });
  }

  async createMeasurement(body: MeasurementRequest) {
    let response = await this.http.post<{ id: string; probesCount: number }>(
      '/measurements',
      body
    );
    return {
      measurementId: response.data.id,
      probesCount: response.data.probesCount
    };
  }

  async getMeasurement(measurementId: string, signal?: AbortSignal): Promise<Measurement> {
    let response = await this.http.get<Measurement>(
      `/measurements/${encodeURIComponent(measurementId)}`,
      { signal }
    );
    return response.data;
  }

  async listProbes(): Promise<Probe[]> {
    let response = await this.http.get<Probe[]>('/probes');
    return response.data;
  }

  async getLimits(): Promise<Limits> {
    let response = await this.http.get<Limits>('/limits');
    return response.data;
  }

  async checkHealth(): Promise<{ healthy: boolean; statusCode: number }> {
    try {
      let response = await this.http.get('/limits', { validateStatus: () => true });
      return {
        healthy: response.status >= 200 && response.status < 300,
        statusCode: response.status
      };
    } catch {
      return { healthy: false, statusCode: 0 };
    }
  }

  async pollMeasurement(
    measurementId: string,
    maxWaitMs: number = 40000,
    intervalMs: number = 500
  ): Promise<Measurement> {
    let deadline = Date.now() + maxWaitMs;
    let controller = new AbortController();
    let timer = setTimeout(() => controller.abort(), maxWaitMs);
    let result: Measurement | undefined;
    try {
      result = await this.getMeasurement(measurementId, controller.signal);
      while (result.status === 'in-progress' && deadline - Date.now() > intervalMs) {
        await new Promise(resolve => setTimeout(resolve, intervalMs));
        if (controller.signal.aborted) break;
        result = await this.getMeasurement(measurementId, controller.signal);
      }
      return result;
    } catch (error) {
      if (controller.signal.aborted && result) return result;
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }
}
