import { createAxios } from 'slates';
import type { DeviceInfo, WeatherData } from './types';

export class Client {
  private axios;
  private apiKey: string;
  private applicationKey: string;

  constructor(config: { token: string; applicationKey: string }) {
    this.apiKey = config.token;
    this.applicationKey = config.applicationKey;
    this.axios = createAxios({
      baseURL: 'https://rt.ambientweather.net/v1'
    });
  }

  private get authParams() {
    return {
      apiKey: this.apiKey,
      applicationKey: this.applicationKey
    };
  }

  async listDevices(): Promise<DeviceInfo[]> {
    let response = await this.axios.get('/devices', {
      params: this.authParams
    });
    return response.data;
  }

  async getDeviceData(
    macAddress: string,
    options?: {
      limit?: number;
      endDate?: number;
    }
  ): Promise<WeatherData[]> {
    let params: Record<string, string | number> = {
      ...this.authParams
    };

    if (options?.limit !== undefined) {
      params.limit = options.limit;
    }

    if (options?.endDate !== undefined) {
      params.endDate = options.endDate;
    }

    let response = await this.axios.get(`/devices/${macAddress}`, {
      params
    });
    return response.data;
  }
}
