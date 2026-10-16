import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  isApiErrorRecord,
  pickDefined
} from 'slates';

export class Client {
  private axios;
  private localityLanguage: string;

  constructor(config: { token: string; localityLanguage?: string }) {
    if (!config.token.trim()) {
      throw createApiServiceError('Provide your BigDataCloud API key.');
    }
    this.localityLanguage = config.localityLanguage ?? 'en';
    this.axios = createAuthenticatedAxios({
      baseURL: 'https://api-bdc.net',
      timeout: 30_000,
      authHeader: { name: 'x-bdc-key', value: config.token },
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'BigDataCloud',
          reason: 'bigdatacloud_request_failed',
          extractResponse: (input, helpers) => helpers.getResponseWithBody(input)
        })
    });
  }

  private async get(
    path: string,
    params: Record<string, string | number | undefined>,
    localised = true
  ) {
    let response = await this.axios.get(`/data/${path}`, {
      params: pickDefined({
        ...(localised ? { localityLanguage: this.localityLanguage } : {}),
        ...params
      })
    });
    let data: unknown = response.data;
    if (!isApiErrorRecord(data)) {
      throw createApiServiceError('BigDataCloud returned an invalid lookup response.');
    }
    return response.data;
  }

  async ipGeolocation(params: { ip?: string }) {
    return this.get('ip-geolocation-full', params);
  }

  async reverseGeocode(params: { latitude: number; longitude: number }) {
    if (Math.abs(params.latitude) > 90 || Math.abs(params.longitude) > 180) {
      throw createApiServiceError(
        'Provide latitude between -90 and 90 and longitude between -180 and 180.'
      );
    }
    return this.get('reverse-geocode-with-timezone', params);
  }

  async ipHazardReport(params: { ip?: string }) {
    return this.get('ip-geolocation-full', params);
  }

  async phoneNumberValidate(params: { number: string; countryCode?: string }) {
    return this.get('phone-number-validate', params);
  }

  async emailVerify(params: { emailAddress: string }) {
    return this.get('email-verify', params, false);
  }

  async asnInfo(params: { asn: string; limit?: number }) {
    if (
      params.limit !== undefined &&
      (!Number.isInteger(params.limit) || params.limit < 0 || params.limit > 50)
    ) {
      throw createApiServiceError('Provide an integer ASN peer limit between 0 and 50.');
    }
    return this.get('asn-info-full', { asn: params.asn, peersCap: params.limit });
  }

  async countryInfo(params: { code: string }) {
    return this.get('country-info', params);
  }

  async timezoneInfo(params: { timeZoneId: string; utcReference?: number }) {
    return this.get('timezone-info', params, false);
  }

  async asnPeers(params: {
    asn: string;
    direction: 'receiving_from' | 'transit_to';
    batchSize?: number;
    offset?: number;
  }) {
    return this.get(
      params.direction === 'receiving_from'
        ? 'asn-info-receiving-from'
        : 'asn-info-transit-to',
      {
        asn: params.asn,
        batchSize: params.batchSize,
        offset: params.offset
      }
    );
  }

  async networkByCidr(params: {
    cidr: string;
    depthLimit?: number;
    subnetsBatchSize?: number;
    subnetsOffset?: number;
  }) {
    return this.get('network-by-cidr', params);
  }

  async networkByIp(params: { ip?: string }) {
    return this.get('network-by-ip', params);
  }
}
