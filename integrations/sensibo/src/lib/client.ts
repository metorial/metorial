import { ServiceError } from '@lowerdeck/error';
import { buildApiServiceError, createApiServiceError, createAxios } from 'slates';
import { z } from 'zod';

export type SensiboRecord = Record<string, any>;

export let record = (value: unknown, label: string): SensiboRecord => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw createApiServiceError(`Sensibo returned an invalid ${label}.`);
  }
  return value as SensiboRecord;
};

export let checked = <T extends z.ZodType>(
  schema: T,
  value: unknown,
  label: string
): z.infer<T> => {
  let parsed = schema.safeParse(value);
  if (!parsed.success) throw createApiServiceError(`Sensibo returned an invalid ${label}.`);
  return parsed.data;
};

export let deviceIdSchema = z
  .string()
  .describe('Sensibo device ID. Call list_devices to discover authorized device IDs.');

export class SensiboClient {
  private http;

  constructor(private token: string) {
    if (!token.trim())
      throw createApiServiceError('A Sensibo API key is required. Reconnect with an API key.');
    this.http = createAxios({
      baseURL: 'https://home.sensibo.com/api/v2',
      params: { apiKey: token },
      headers: { 'Accept-Encoding': 'gzip', 'Content-Type': 'application/json' },
      timeout: 30_000,
      maxRedirects: 0
    });
    this.http.interceptors.response.use(
      response => {
        response.data = this.sanitize(response.data);
        return response;
      },
      error => {
        throw this.apiError(error);
      }
    );
  }

  sanitize<T>(value: T): T {
    if (typeof value === 'string') {
      let safe: string = value;
      for (let secret of [this.token, encodeURIComponent(this.token)]) {
        if (secret) safe = safe.split(secret).join('[redacted]');
      }
      return safe.replace(
        /([?&](?:apiKey|api_key|access_token|token)=)[^&#\s]*/gi,
        '$1[redacted]'
      ) as T;
    }
    if (Array.isArray(value)) return value.map(item => this.sanitize(item)) as T;
    if (value && typeof value === 'object') {
      return Object.fromEntries(
        Object.entries(value).map(([key, item]) => [
          key,
          /^(api[_-]?key|access[_-]?token|token|password|secret|authorization)$/i.test(key)
            ? '[redacted]'
            : this.sanitize(item)
        ])
      ) as T;
    }
    return value;
  }

  private pathId(id: string, label = 'device ID') {
    if (!id.trim()) throw createApiServiceError(`A Sensibo ${label} is required.`);
    return encodeURIComponent(id);
  }

  private async request(
    method: 'get' | 'post' | 'put' | 'patch' | 'delete',
    path: string,
    data?: SensiboRecord,
    params?: SensiboRecord,
    allowEmpty = false
  ): Promise<any> {
    try {
      let response = await this.http.request({ method, url: path, data, params });
      let body = response.data;
      if (body && typeof body === 'object' && !Array.isArray(body)) {
        if (body.status !== undefined && body.status !== 'success') {
          throw buildApiServiceError(
            { response: { status: response.status, data: this.sanitize(body) } },
            {
              providerLabel: 'Sensibo',
              reason: 'sensibo_api_error',
              parent: {},
              detailKeys: ['message', 'error', 'detail', 'status']
            }
          );
        }
        if (Object.hasOwn(body, 'result')) return this.sanitize(body.result);
      }
      if (Array.isArray(body)) return this.sanitize(body);
      if (allowEmpty && (body === undefined || body === null || body === '')) return undefined;
      throw createApiServiceError('Sensibo returned a response without a result.');
    } catch (error) {
      throw this.apiError(error);
    }
  }

  private apiError(error: unknown) {
    if (error instanceof ServiceError) return error;
    return buildApiServiceError(error, {
      providerLabel: 'Sensibo',
      reason: 'sensibo_api_error',
      parent: {},
      extractResponse: (input, helpers) => {
        let response = helpers.getResponseWithBody(input);
        return response ? { ...response, data: this.sanitize(response.data) } : undefined;
      },
      formatMessage: ({ statusLabel, message }) =>
        this.sanitize(`Sensibo API request failed: ${statusLabel}${message}`)
    });
  }

  private async list(path: string, params?: SensiboRecord): Promise<SensiboRecord[]> {
    let result = await this.request('get', path, undefined, params);
    if (!Array.isArray(result))
      throw createApiServiceError('Sensibo returned an invalid result list.');
    return result.map(item => record(item, 'result item'));
  }

  async listDevices(fields = '*') {
    return this.list('/users/me/pods', { fields });
  }
  async getDevice(deviceId: string, fields = '*') {
    let result = await this.request('get', `/pods/${this.pathId(deviceId)}`, undefined, {
      fields
    });
    return record(Array.isArray(result) && result.length === 1 ? result[0] : result, 'device');
  }
  async setAcState(deviceId: string, acState: SensiboRecord) {
    return this.request('post', `/pods/${this.pathId(deviceId)}/acStates`, { acState });
  }
  async setAcStateProperty(
    deviceId: string,
    property: string,
    value: unknown,
    currentAcState: SensiboRecord
  ) {
    return this.request(
      'patch',
      `/pods/${this.pathId(deviceId)}/acStates/${encodeURIComponent(property)}`,
      { currentAcState, newValue: value }
    );
  }
  async getAcStates(deviceId: string, limit = 10) {
    if (!Number.isInteger(limit) || limit < 1 || limit > 20)
      throw createApiServiceError(
        'AC state history limit must be a whole number from 1 to 20.'
      );
    return this.list(`/pods/${this.pathId(deviceId)}/acStates`, { limit });
  }
  async getHistoricalMeasurements(deviceId: string, days = 1) {
    this.validateDays(days);
    return this.list(`/pods/${this.pathId(deviceId)}/historicalMeasurements`, { days });
  }
  async getTimer(deviceId: string) {
    return this.request(
      'get',
      `https://home.sensibo.com/api/v1/pods/${this.pathId(deviceId)}/timer/`
    );
  }
  async setTimer(deviceId: string, timer: SensiboRecord) {
    return this.request(
      'put',
      `https://home.sensibo.com/api/v1/pods/${this.pathId(deviceId)}/timer/`,
      timer
    );
  }
  async deleteTimer(deviceId: string) {
    await this.request(
      'delete',
      `https://home.sensibo.com/api/v1/pods/${this.pathId(deviceId)}/timer/`,
      undefined,
      undefined,
      true
    );
  }

  // Preserve the deprecated schedule tool's original route and payload contract.
  async listSchedules(deviceId: string): Promise<any[]> {
    let response = await this.http.get(`/pods/${deviceId}/schedules`);
    return response.data.result;
  }
  async createSchedule(deviceId: string, schedule: Record<string, any>): Promise<any> {
    let response = await this.http.post(`/pods/${deviceId}/schedules`, schedule);
    return response.data.result;
  }
  async getSchedule(deviceId: string, scheduleId: string): Promise<any> {
    let response = await this.http.get(`/pods/${deviceId}/schedules/${scheduleId}`);
    return response.data.result;
  }
  async updateSchedule(
    deviceId: string,
    scheduleId: string,
    schedule: Record<string, any>
  ): Promise<any> {
    let response = await this.http.put(`/pods/${deviceId}/schedules/${scheduleId}`, schedule);
    return response.data.result;
  }
  async deleteSchedule(deviceId: string, scheduleId: string): Promise<void> {
    await this.http.delete(`/pods/${deviceId}/schedules/${scheduleId}`);
  }

  async recurringSchedules(
    action: 'list' | 'get' | 'create' | 'set_enabled' | 'delete',
    deviceId: string,
    scheduleId?: string,
    data?: SensiboRecord
  ) {
    let path = `https://home.sensibo.com/api/v1/pods/${this.pathId(deviceId)}/schedules/`;
    if (['get', 'set_enabled', 'delete'].includes(action)) {
      if (!scheduleId?.trim())
        throw createApiServiceError(
          'scheduleId is required for get, set_enabled, and delete.'
        );
      path += `${this.pathId(scheduleId, 'schedule ID')}/`;
    }
    if (action === 'list') return this.list(path);
    return this.request(
      action === 'get'
        ? 'get'
        : action === 'create'
          ? 'post'
          : action === 'delete'
            ? 'delete'
            : 'put',
      path,
      data,
      undefined,
      action === 'delete'
    );
  }

  async getClimateReact(deviceId: string) {
    return record(
      await this.request('get', `/pods/${this.pathId(deviceId)}/smartmode`),
      'Climate React settings'
    );
  }
  async updateClimateReact(deviceId: string, settings: SensiboRecord) {
    return record(
      await this.request('put', `/pods/${this.pathId(deviceId)}/smartmode`, settings),
      'Climate React settings'
    );
  }
  async configureClimateReact(deviceId: string, settings: SensiboRecord) {
    return record(
      await this.request('post', `/pods/${this.pathId(deviceId)}/smartmode`, settings),
      'Climate React settings'
    );
  }

  validateDays(days: number) {
    if (!Number.isInteger(days) || days < 1 || days > 7)
      throw createApiServiceError('History days must be a whole number from 1 to 7.');
  }
  async getDeviceEvents(deviceId: string, days = 1) {
    this.validateDays(days);
    return this.list(`/pods/${this.pathId(deviceId)}/events`, { days_backwards: days });
  }
  async getDoorSensorEvents(deviceId: string, days: number = 1): Promise<any[]> {
    let response = await this.http.get(`/pods/${deviceId}/doorSensors/events`, {
      params: { days }
    });
    return response.data.result;
  }
  async getDoorSensorHistory(sensorId: string, days = 1) {
    this.validateDays(days);
    if (!sensorId.startsWith('ds_'))
      throw createApiServiceError('A door sensor ID starting with ds_ is required.');
    return this.list(`/doorSensors/${this.pathId(sensorId, 'door sensor ID')}/events`, {
      days
    });
  }
}
