import { createAxios } from 'slates';

export interface BoltResponse {
  success: string;
  value: string;
}

export interface BoltDevice {
  id: string;
  name: string;
  status: string;
}

export class Client {
  private apiKey: string;
  private deviceName: string;
  private http;

  constructor(config: { token: string; deviceName: string }) {
    this.apiKey = config.token;
    this.deviceName = config.deviceName;
    this.http = createAxios({
      baseURL: 'https://cloud.boltiot.com'
    });
  }

  private async request(
    command: string,
    params?: Record<string, string>
  ): Promise<BoltResponse> {
    let queryParams = new URLSearchParams();
    if (params) {
      for (let [key, value] of Object.entries(params)) {
        queryParams.set(key, value);
      }
    }
    queryParams.set('deviceName', this.deviceName);

    let url = `/remote/${this.apiKey}/${command}?${queryParams.toString()}`;
    let response = await this.http.get(url);
    return response.data as BoltResponse;
  }

  private async requestNoDevice(command: string): Promise<any> {
    let url = `/remote/${this.apiKey}/${command}`;
    let response = await this.http.get(url);
    return response.data;
  }

  // Device Management

  async getDevices(): Promise<any> {
    return this.requestNoDevice('getDevices');
  }

  async isAlive(): Promise<BoltResponse> {
    return this.request('isAlive');
  }

  async getVersion(): Promise<BoltResponse> {
    return this.request('version');
  }

  async restart(): Promise<BoltResponse> {
    return this.request('restart');
  }

  // Digital GPIO

  async digitalRead(pin: string): Promise<BoltResponse> {
    return this.request('digitalRead', { pin });
  }

  async digitalWrite(pin: string, state: string): Promise<BoltResponse> {
    return this.request('digitalWrite', { pin, state });
  }

  async digitalMultiRead(pins: string[]): Promise<BoltResponse> {
    return this.request('digitalMultiRead', { pins: pins.join(',') });
  }

  async digitalMultiWrite(pins: string[], states: string[]): Promise<BoltResponse> {
    return this.request('digitalMultiWrite', {
      pins: pins.join(','),
      states: states.join(',')
    });
  }

  // Analog I/O

  async analogRead(pin: string): Promise<BoltResponse> {
    return this.request('analogRead', { pin });
  }

  async analogWrite(pin: string, value: number): Promise<BoltResponse> {
    return this.request('analogWrite', { pin, value: value.toString() });
  }

  // Servo

  async servoWrite(pin: string, value: number): Promise<BoltResponse> {
    return this.request('servoWrite', { pin, value: value.toString() });
  }

  // UART / Serial

  async serialBegin(baud: number): Promise<BoltResponse> {
    return this.request('serialBegin', { baud: baud.toString() });
  }

  async serialRead(till?: number): Promise<BoltResponse> {
    let params: Record<string, string> = {};
    if (till !== undefined) {
      params.till = till.toString();
    }
    return this.request('serialRead', params);
  }

  async serialWrite(data: string): Promise<BoltResponse> {
    return this.request('serialWrite', { data });
  }

  async serialWriteRead(data: string, till?: number): Promise<BoltResponse> {
    let params: Record<string, string> = { data };
    if (till !== undefined) {
      params.till = till.toString();
    }
    return this.request('serialWR', params);
  }
}
