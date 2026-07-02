import { createAxios } from 'slates';

export interface VerifyParams {
  phone: string;
  defaultCountry?: string;
}

export interface VerifyResponse {
  status: string;
  phone: string;
  phoneValid: boolean;
  phoneType: string | null;
  phoneRegion: string | null;
  country: string | null;
  countryCode: string | null;
  countryPrefix: string | null;
  internationalNumber: string | null;
  localNumber: string | null;
  e164: string | null;
  carrier: string | null;
}

export interface ExampleParams {
  countryCode?: string;
  phoneType?: string;
}

export interface ExampleResponse {
  status: string;
  phoneType: string;
  countryCode: string;
  countryPrefix: string;
  internationalNumber: string;
  localNumber: string;
  e164: string;
}

export class Client {
  private token: string;
  private http: ReturnType<typeof createAxios>;

  constructor(config: { token: string }) {
    this.token = config.token;
    this.http = createAxios({
      baseURL: 'https://api.veriphone.io/v2'
    });
  }

  async verifyPhone(params: VerifyParams): Promise<VerifyResponse> {
    let queryParams: Record<string, string> = {
      key: this.token,
      phone: params.phone
    };

    if (params.defaultCountry) {
      queryParams.default_country = params.defaultCountry;
    }

    let response = await this.http.get('/verify', { params: queryParams });
    let data = response.data;

    return {
      status: data.status,
      phone: data.phone,
      phoneValid: data.phone_valid,
      phoneType: data.phone_type ?? null,
      phoneRegion: data.phone_region ?? null,
      country: data.country ?? null,
      countryCode: data.country_code ?? null,
      countryPrefix: data.country_prefix ?? null,
      internationalNumber: data.international_number ?? null,
      localNumber: data.local_number ?? null,
      e164: data.e164 ?? null,
      carrier: data.carrier ?? null
    };
  }

  async getExamplePhone(params: ExampleParams): Promise<ExampleResponse> {
    let queryParams: Record<string, string> = {
      key: this.token
    };

    if (params.countryCode) {
      queryParams.country_code = params.countryCode;
    }

    if (params.phoneType) {
      queryParams.type = params.phoneType;
    }

    let response = await this.http.get('/example', { params: queryParams });
    let data = response.data;

    return {
      status: data.status,
      phoneType: data.phone_type,
      countryCode: data.country_code,
      countryPrefix: data.country_prefix,
      internationalNumber: data.international_number,
      localNumber: data.local_number,
      e164: data.e164
    };
  }
}
