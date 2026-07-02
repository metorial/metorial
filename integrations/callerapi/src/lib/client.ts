import { createAxios } from 'slates';

export class Client {
  private axios;

  constructor(private config: { token: string }) {
    this.axios = createAxios({
      baseURL: 'https://callerapi.com'
    });
  }

  private get headers() {
    return {
      'X-Auth': this.config.token
    };
  }

  async getAccountInfo() {
    let response = await this.axios.get('/api/me', {
      headers: this.headers
    });
    return response.data;
  }

  async lookupPhoneNumber(phoneNumber: string, hlr: boolean = false) {
    let url = `/api/lookup/${encodeURIComponent(phoneNumber)}`;
    if (hlr) {
      url += '?hlr=true';
    }
    let response = await this.axios.get(url, {
      headers: this.headers
    });
    return response.data;
  }

  async getPhoneInfo(phoneNumber: string) {
    let response = await this.axios.get(`/api/phone/info/${encodeURIComponent(phoneNumber)}`, {
      headers: this.headers
    });
    return response.data;
  }

  async getPhonePicture(phoneNumber: string) {
    let response = await this.axios.get(`/api/phone/pic/${encodeURIComponent(phoneNumber)}`, {
      headers: this.headers
    });
    return response.data;
  }

  async getPortedStatus(phoneNumber: string) {
    let response = await this.axios.get(`/api/ported/${encodeURIComponent(phoneNumber)}`, {
      headers: this.headers
    });
    return response.data;
  }

  async getPortingHistory(phoneNumber: string) {
    let response = await this.axios.get(
      `/api/porting-history/${encodeURIComponent(phoneNumber)}`,
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  async getPortFraudRisk(phoneNumber: string) {
    let response = await this.axios.get(`/api/port-fraud/${encodeURIComponent(phoneNumber)}`, {
      headers: this.headers
    });
    return response.data;
  }

  async getOnlinePresence(phoneNumber: string) {
    let response = await this.axios.get(
      `/api/online-presence/${encodeURIComponent(phoneNumber)}`,
      {
        headers: this.headers
      }
    );
    return response.data;
  }
}
