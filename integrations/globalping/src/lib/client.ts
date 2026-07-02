import { createAxios } from 'slates';

let BASE_URL = 'https://api.globalping.io/v1';

export class Client {
  private http;

  constructor(config: { token?: string }) {
    let headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    if (config.token) {
      headers.Authorization = `Bearer ${config.token}`;
    }

    this.http = createAxios({
      baseURL: BASE_URL,
      headers
    });
  }

  async createMeasurement(body: {
    type: string;
    target: string;
    locations?: Record<string, unknown>[];
    limit?: number;
    measurementOptions?: Record<string, unknown>;
    inProgressUpdates?: boolean;
  }): Promise<{ measurementId: string; probesCount: number }> {
    let response = await this.http.post('/measurements', body);
    return {
      measurementId: response.data.id,
      probesCount: response.data.probesCount
    };
  }

  async getMeasurement(measurementId: string): Promise<Record<string, unknown>> {
    let response = await this.http.get(`/measurements/${measurementId}`);
    return response.data;
  }

  async listProbes(): Promise<Record<string, unknown>[]> {
    let response = await this.http.get('/probes');
    return response.data;
  }

  async getLimits(): Promise<Record<string, unknown>> {
    let response = await this.http.get('/limits');
    return response.data;
  }

  async checkHealth(): Promise<{ healthy: boolean; statusCode: number }> {
    try {
      let response = await this.http.get('/');
      return { healthy: true, statusCode: response.status };
    } catch (err: unknown) {
      let statusCode = 0;
      if (err && typeof err === 'object' && 'response' in err) {
        let errWithResponse = err as { response?: { status?: number } };
        statusCode = errWithResponse.response?.status ?? 0;
      }
      return { healthy: false, statusCode };
    }
  }

  async pollMeasurement(
    measurementId: string,
    maxAttempts: number = 20,
    intervalMs: number = 500
  ): Promise<Record<string, unknown>> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      let result = await this.getMeasurement(measurementId);
      if (result.status !== 'in-progress') {
        return result;
      }
      if (attempt < maxAttempts - 1) {
        await new Promise(resolve => setTimeout(resolve, intervalMs));
      }
    }
    return this.getMeasurement(measurementId);
  }
}
