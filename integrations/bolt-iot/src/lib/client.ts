import {
  buildApiServiceError,
  createApiServiceError,
  createAxios,
  isApiErrorRecord,
  requestAxiosData
} from 'slates';

export interface BoltResponse {
  success: string;
  value: string;
  [key: string]: unknown;
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

    let response = await this.get(command, queryParams);
    if (
      !isApiErrorRecord(response) ||
      typeof response.success !== 'string' ||
      typeof response.value !== 'string'
    ) {
      throw createApiServiceError(`Bolt IoT API ${command} returned an invalid response.`, {
        reason: 'invalid_response'
      });
    }
    return response as BoltResponse;
  }

  private async requestNoDevice(command: string): Promise<any> {
    return this.get(command);
  }

  private async get(command: string, queryParams?: URLSearchParams): Promise<unknown> {
    let url = `/remote/${this.apiKey}/${command}${queryParams ? `?${queryParams.toString()}` : ''}`;
    let response = await requestAxiosData<unknown>(
      command,
      () => this.http.get(url),
      (error, operation) =>
        buildApiServiceError(error, {
          providerLabel: 'Bolt IoT',
          operation,
          reason: 'upstream_error',
          detailKeys: ['value', 'message', 'error'],
          extractResponse: (input, helpers) => helpers.getResponseWithBody(input)
        })
    );

    if (
      isApiErrorRecord(response) &&
      (response.success === '0' || response.success === 0 || response.success === false)
    ) {
      throw buildApiServiceError(
        { response: { data: response } },
        {
          providerLabel: 'Bolt IoT',
          operation: command,
          reason: 'upstream_error',
          detailKeys: ['value', 'message', 'error'],
          fallbackMessage: 'The provider rejected the command.'
        }
      );
    }
    return response;
  }

  // Device Management

  async getDevices(): Promise<any> {
    return this.requestNoDevice('getDevices');
  }

  async isAlive(): Promise<BoltResponse> {
    return this.request('isAlive');
  }

  async isOnline(): Promise<unknown> {
    let queryParams = new URLSearchParams({ deviceName: this.deviceName });
    return this.get('isOnline', queryParams);
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
