import { createAxios } from 'slates';

let BASE_URL = 'https://api.anonyflow.com';

export class Client {
  private axios;

  constructor(config: { token: string }) {
    this.axios = createAxios({
      baseURL: BASE_URL,
      headers: {
        'x-api-key': config.token,
        accept: 'application/json',
        'content-type': 'application/json'
      }
    });
  }

  async anonymizeValue(data: string): Promise<AnonymizeValueResponse> {
    let response = await this.axios.post('/anony-value', { data });
    return response.data;
  }

  async anonymizePacket(
    data: Record<string, unknown>,
    keys: string[]
  ): Promise<AnonymizePacketResponse> {
    let response = await this.axios.post('/anony-packet', { data, keys });
    return response.data;
  }

  async deanonymizePacket(
    data: Record<string, unknown>,
    keys: string[]
  ): Promise<DeanonymizePacketResponse> {
    let response = await this.axios.post('/deanony-packet', { data, keys });
    return response.data;
  }
}

export interface AnonymizeValueResponse {
  [key: string]: unknown;
}

export interface AnonymizePacketResponse {
  [key: string]: unknown;
}

export interface DeanonymizePacketResponse {
  [key: string]: unknown;
}
