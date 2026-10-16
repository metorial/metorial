import {
  buildApiServiceError,
  createApiServiceError,
  createAxios,
  isApiErrorRecord,
  pickDefined,
  requestAxiosData
} from 'slates';
import type { DeviceInfo, WeatherData } from './types';

export class Client {
  private axios: ReturnType<typeof createAxios>;
  private apiKey: string;
  private applicationKey: string;

  constructor(config: { token: string; applicationKey: string }) {
    if (!config.token.trim() || !config.applicationKey.trim()) {
      throw createApiServiceError(
        'Provide both an Ambient Weather API key and application key, then reconnect.',
        { reason: 'ambient_weather_missing_credentials' }
      );
    }
    this.apiKey = config.token;
    this.applicationKey = config.applicationKey;
    this.axios = createAxios({
      baseURL: 'https://rt.ambientweather.net/v1',
      timeout: 30_000,
      headers: { Accept: 'application/json' }
    });
  }

  private get authParams() {
    return {
      apiKey: this.apiKey,
      applicationKey: this.applicationKey
    };
  }

  async listDevices(): Promise<DeviceInfo[]> {
    let devices = await this.request<DeviceInfo[]>('list devices', '/devices');
    if (
      !Array.isArray(devices) ||
      devices.some(
        device => !isApiErrorRecord(device) || typeof device.macAddress !== 'string'
      )
    ) {
      throw createApiServiceError('Ambient Weather returned an invalid device list.', {
        reason: 'ambient_weather_invalid_response'
      });
    }
    return devices;
  }

  async getDeviceData(
    macAddress: string,
    options?: {
      limit?: number;
      endDate?: number;
    }
  ): Promise<WeatherData[]> {
    if (!macAddress.trim()) {
      throw createApiServiceError('Provide a device MAC address from the List Devices tool.', {
        reason: 'ambient_weather_missing_device'
      });
    }
    let data = await this.request<WeatherData[]>(
      'get device data',
      `/devices/${encodeURIComponent(macAddress)}`,
      pickDefined({ limit: options?.limit, endDate: options?.endDate })
    );
    if (!Array.isArray(data) || data.some(reading => !isApiErrorRecord(reading))) {
      throw createApiServiceError('Ambient Weather returned invalid weather readings.', {
        reason: 'ambient_weather_invalid_response'
      });
    }
    return data;
  }

  private request<T>(operation: string, path: string, params?: Record<string, unknown>) {
    return requestAxiosData<T>(
      operation,
      () => this.axios.get(path, { params: { ...params, ...this.authParams } }),
      (error, failedOperation) =>
        buildApiServiceError(error, {
          providerLabel: 'Ambient Weather',
          reason: 'ambient_weather_api_error',
          operation: failedOperation,
          extractResponse: (value, helpers) => helpers.getResponseWithBody(value)
        })
    );
  }
}
