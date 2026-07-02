import { createAxios } from 'slates';

let BASE_URL = 'https://api-bdc.net';

export class Client {
  private token: string;
  private localityLanguage: string;

  constructor(config: { token: string; localityLanguage?: string }) {
    this.token = config.token;
    this.localityLanguage = config.localityLanguage ?? 'en';
  }

  private createAxiosInstance() {
    return createAxios({
      baseURL: BASE_URL
    });
  }

  private defaultParams() {
    return {
      key: this.token,
      localityLanguage: this.localityLanguage
    };
  }

  async ipGeolocation(params: { ip?: string }) {
    let axios = this.createAxiosInstance();
    let response = await axios.get('/data/ip-geolocation-full', {
      params: {
        ...this.defaultParams(),
        ...(params.ip ? { ip: params.ip } : {})
      }
    });
    return response.data;
  }

  async reverseGeocode(params: { latitude: number; longitude: number }) {
    let axios = this.createAxiosInstance();
    let response = await axios.get('/data/reverse-geocode-with-timezone', {
      params: {
        ...this.defaultParams(),
        latitude: params.latitude,
        longitude: params.longitude
      }
    });
    return response.data;
  }

  async ipHazardReport(params: { ip?: string }) {
    let axios = this.createAxiosInstance();
    let response = await axios.get('/data/ip-geolocation-full', {
      params: {
        ...this.defaultParams(),
        ...(params.ip ? { ip: params.ip } : {})
      }
    });
    return response.data;
  }

  async phoneNumberValidate(params: { number: string; countryCode?: string }) {
    let axios = this.createAxiosInstance();
    let response = await axios.get('/data/phone-number-validate', {
      params: {
        ...this.defaultParams(),
        number: params.number,
        ...(params.countryCode ? { countryCode: params.countryCode } : {})
      }
    });
    return response.data;
  }

  async emailVerify(params: { emailAddress: string }) {
    let axios = this.createAxiosInstance();
    let response = await axios.get('/data/email-verify', {
      params: {
        key: this.token,
        emailAddress: params.emailAddress
      }
    });
    return response.data;
  }

  async asnInfo(params: { asn: string; limit?: number }) {
    let axios = this.createAxiosInstance();
    let response = await axios.get('/data/asn-info-full', {
      params: {
        ...this.defaultParams(),
        asn: params.asn,
        ...(params.limit !== undefined ? { limit: params.limit } : {})
      }
    });
    return response.data;
  }

  async networkByIp(params: { ip?: string }) {
    let axios = this.createAxiosInstance();
    let response = await axios.get('/data/network-by-ip', {
      params: {
        ...this.defaultParams(),
        ...(params.ip ? { ip: params.ip } : {})
      }
    });
    return response.data;
  }
}
