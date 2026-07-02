import { createAxios } from 'slates';

export interface TurboV3Response {
  status: string;
  error_text: string | Record<string, never>;
  phone_type: string;
  caller_name: string;
  carrier: string;
  caller_type: string;
}

export interface TurboStandardResponse {
  status: string;
  error_text: string | Record<string, never>;
  iscell: string;
  cnam: string;
  carrier: string;
}

export interface ScrubPlusResponse {
  status: string;
  error_text: string | Record<string, never>;
  phone_type: string;
}

export interface ScrubResponse {
  status: string;
  error_text: string | Record<string, never>;
  iscell?: string;
  carrier?: string;
}

export interface ActiveCheckResponse {
  status: string;
  error_text: string | Record<string, never>;
}

export interface WirelessIdResponse {
  RESPONSECODE: string;
  RESPONSEMSG: string | Record<string, never>;
}

export interface DncLookupResponse {
  RESPONSECODE: string;
  RESPONSEMSG: string | Record<string, never>;
  national_dnc: string;
  state_dnc: string;
  dma: string;
  litigator: string;
  iscell: string;
  id: string;
}

export interface DncPlusResponse {
  status: string;
  error_text: string | Record<string, never>;
  iscell: string;
  national_dnc: string;
  state_dnc: string;
  dma: string;
  litigator: string;
}

export interface FraudCheckResponse {
  status: string;
  error_text: string | Record<string, never>;
  id: string;
  req_phone: string;
  tstatus: string;
  tdesc: string;
  phn_type: string;
  phn_desc: string;
  risk_level: string;
  recommendation: string;
  score: string;
  carrier: string;
  location_city: string;
  location_state: string;
  location_zip: string;
  location_metro_code: string;
  location_county: string;
  location_country_name: string;
  location_country_iso2: string;
  location_country_iso3: string;
  location_latitude: string;
  location_longitude: string;
  location_time_zone: string;
}

export interface ReassignedNumberResponse {
  RESPONSECODE: string;
  RESPONSEMSG: string | Record<string, never>;
  reassigned: string;
  id: string;
}

export interface EmailVerifyResponse {
  status: string;
  error_text: string | Record<string, never>;
  disposable?: string;
  connected?: string;
  [key: string]: unknown;
}

export class Client {
  private axios: ReturnType<typeof createAxios>;
  private token: string;

  constructor(config: { token: string }) {
    this.token = config.token;
    this.axios = createAxios({
      baseURL: 'https://api.realvalidation.com/rpvWebService/'
    });
  }

  async turboV3(phone: string): Promise<TurboV3Response> {
    let response = await this.axios.get<TurboV3Response>('TurboV3.php', {
      params: {
        phone,
        token: this.token,
        output: 'json'
      }
    });
    return response.data;
  }

  async turboStandard(phone: string): Promise<TurboStandardResponse> {
    let response = await this.axios.get<TurboStandardResponse>(
      'RealPhoneValidationTurbo.php',
      {
        params: {
          phone,
          token: this.token,
          output: 'json'
        }
      }
    );
    return response.data;
  }

  async scrubPlus(phone: string): Promise<ScrubPlusResponse> {
    let response = await this.axios.get<ScrubPlusResponse>('ScrubPlus.php', {
      params: {
        phone,
        token: this.token,
        output: 'json'
      }
    });
    return response.data;
  }

  async scrub(phone: string): Promise<ScrubResponse> {
    let response = await this.axios.get<ScrubResponse>('RealPhoneValidationScrub.php', {
      params: {
        phone,
        token: this.token,
        output: 'json'
      }
    });
    return response.data;
  }

  async activeCheck(phone: string): Promise<ActiveCheckResponse> {
    let response = await this.axios.get<ActiveCheckResponse>('RealPhoneValidationActive.php', {
      params: {
        phone,
        token: this.token,
        output: 'json'
      }
    });
    return response.data;
  }

  async wirelessId(phone: string): Promise<WirelessIdResponse> {
    let response = await this.axios.get<WirelessIdResponse>('WirelessID.php', {
      params: {
        phone,
        token: this.token,
        output: 'json'
      }
    });
    return response.data;
  }

  async dncLookup(phone: string): Promise<DncLookupResponse> {
    let response = await this.axios.get<DncLookupResponse>('DNCLookup.php', {
      params: {
        phone,
        token: this.token,
        output: 'json'
      }
    });
    return response.data;
  }

  async dncPlus(phone: string): Promise<DncPlusResponse> {
    let response = await this.axios.get<DncPlusResponse>('DNCPlus.php', {
      params: {
        phone,
        token: this.token,
        output: 'json'
      }
    });
    return response.data;
  }

  async fraudCheck(phone: string): Promise<FraudCheckResponse> {
    let response = await this.axios.get<FraudCheckResponse>(
      'RealPhoneValidationFraudChk.php',
      {
        params: {
          phone,
          token: this.token,
          output: 'json'
        }
      }
    );
    return response.data;
  }

  async reassignedNumberLookup(
    phone: string,
    contactDate: string
  ): Promise<ReassignedNumberResponse> {
    let response = await this.axios.get<ReassignedNumberResponse>(
      'ReassignedNumberLookup.php',
      {
        params: {
          phone,
          contact_date: contactDate,
          token: this.token,
          output: 'json'
        }
      }
    );
    return response.data;
  }

  async emailVerify(email: string): Promise<EmailVerifyResponse> {
    let response = await this.axios.get<EmailVerifyResponse>('EmailVerify.php', {
      params: {
        email,
        token: this.token,
        output: 'json'
      }
    });
    return response.data;
  }
}
