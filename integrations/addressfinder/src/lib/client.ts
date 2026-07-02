import { createAxios } from 'slates';

export interface ClientConfig {
  token: string;
  secret?: string;
  authMethod: 'api_key' | 'oauth2';
}

export class Client {
  private axios: ReturnType<typeof createAxios>;
  private token: string;
  private secret?: string;
  private authMethod: 'api_key' | 'oauth2';

  constructor(config: ClientConfig) {
    this.token = config.token;
    this.secret = config.secret;
    this.authMethod = config.authMethod;

    let headers: Record<string, string> = {};
    if (this.authMethod === 'oauth2') {
      headers.Authorization = `Bearer ${this.token}`;
    } else if (this.secret) {
      headers.Authorization = this.secret;
    }

    this.axios = createAxios({
      baseURL: 'https://api.addressfinder.io/api',
      headers
    });
  }

  private buildParams(
    extra: Record<string, string | number | undefined> = {}
  ): Record<string, string | number> {
    let params: Record<string, string | number> = { format: 'json' };
    if (this.authMethod === 'api_key') {
      params.key = this.token;
    }
    for (let [k, v] of Object.entries(extra)) {
      if (v !== undefined && v !== null && v !== '') {
        params[k] = v;
      }
    }
    return params;
  }

  // ---- Address Autocomplete ----

  async auAddressAutocomplete(options: {
    query: string;
    max?: number;
    stateCodes?: string;
    source?: string;
    postBox?: string;
    canonical?: string;
  }) {
    let response = await this.axios.get('/au/address/autocomplete', {
      params: this.buildParams({
        q: options.query,
        max: options.max,
        state_codes: options.stateCodes,
        source: options.source,
        post_box: options.postBox,
        canonical: options.canonical
      })
    });
    return response.data;
  }

  async nzAddressAutocomplete(options: {
    query: string;
    max?: number;
    regionCode?: string;
    delivered?: string;
    postBox?: string;
    rural?: string;
    strict?: number;
  }) {
    let response = await this.axios.get('/nz/address/autocomplete', {
      params: this.buildParams({
        q: options.query,
        max: options.max,
        region_code: options.regionCode,
        delivered: options.delivered,
        post_box: options.postBox,
        rural: options.rural,
        strict: options.strict
      })
    });
    return response.data;
  }

  async intAddressAutocomplete(options: { country: string; query: string; max?: number }) {
    let response = await this.axios.get(`/${options.country}/address/v2/autocomplete`, {
      params: this.buildParams({
        q: options.query,
        max: options.max
      })
    });
    return response.data;
  }

  // ---- Address Metadata ----

  async auAddressMetadata(options: {
    addressId?: string;
    gnafId?: string;
    dpid?: string;
    source?: string;
    gps?: string;
    census?: number;
  }) {
    let response = await this.axios.get('/au/address/metadata', {
      params: this.buildParams({
        id: options.addressId,
        gnaf_id: options.gnafId,
        dpid: options.dpid,
        source: options.source,
        gps: options.gps,
        census: options.census
      })
    });
    return response.data;
  }

  async nzAddressMetadata(options: { pxid?: string; dpid?: string; census?: number }) {
    let response = await this.axios.get('/nz/address/metadata', {
      params: this.buildParams({
        pxid: options.pxid,
        dpid: options.dpid,
        census: options.census
      })
    });
    return response.data;
  }

  async intAddressMetadata(options: { country: string; addressId: string; gps?: string }) {
    let response = await this.axios.get(`/${options.country}/address/v2/metadata`, {
      params: this.buildParams({
        id: options.addressId,
        gps: options.gps
      })
    });
    return response.data;
  }

  // ---- Address Verification ----

  async auAddressVerification(options: {
    query: string;
    gnaf?: string;
    paf?: string;
    postBox?: string;
    gps?: string;
    extended?: string;
    census?: number;
    stateCodes?: string;
  }) {
    let response = await this.axios.get('/au/address/v2/verification', {
      params: this.buildParams({
        q: options.query,
        gnaf: options.gnaf,
        paf: options.paf,
        post_box: options.postBox,
        gps: options.gps,
        extended: options.extended,
        census: options.census,
        state_codes: options.stateCodes
      })
    });
    return response.data;
  }

  async nzAddressVerification(options: {
    query: string;
    postBox?: string;
    regionCode?: string;
    census?: number;
  }) {
    let response = await this.axios.get('/nz/address/verification', {
      params: this.buildParams({
        q: options.query,
        post_box: options.postBox,
        region_code: options.regionCode,
        census: options.census
      })
    });
    return response.data;
  }

  // ---- Location Autocomplete ----

  async auLocationAutocomplete(options: {
    query: string;
    max?: number;
    locationTypes?: string;
    stateCodes?: string;
  }) {
    let response = await this.axios.get('/au/location/autocomplete', {
      params: this.buildParams({
        q: options.query,
        max: options.max,
        location_types: options.locationTypes,
        state_codes: options.stateCodes
      })
    });
    return response.data;
  }

  async nzLocationAutocomplete(options: {
    query: string;
    max?: number;
    street?: string;
    suburb?: string;
    city?: string;
    region?: string;
    regionCode?: string;
    strict?: number;
  }) {
    let response = await this.axios.get('/nz/location/autocomplete', {
      params: this.buildParams({
        q: options.query,
        max: options.max,
        street: options.street,
        suburb: options.suburb,
        city: options.city,
        region: options.region,
        region_code: options.regionCode,
        strict: options.strict
      })
    });
    return response.data;
  }

  // ---- Location Metadata ----

  async auLocationMetadata(options: { locationId: string }) {
    let response = await this.axios.get('/au/location/metadata', {
      params: this.buildParams({
        id: options.locationId
      })
    });
    return response.data;
  }

  async nzLocationMetadata(options: { pxid: string }) {
    let response = await this.axios.get('/nz/location/metadata', {
      params: this.buildParams({
        pxid: options.pxid
      })
    });
    return response.data;
  }

  // ---- Reverse Geocoding (NZ only) ----

  async nzReverseGeocode(options: { longitude: string; latitude: string; max?: number }) {
    let response = await this.axios.get('/nz/address/reverse_geocode', {
      params: this.buildParams({
        x: options.longitude,
        y: options.latitude,
        max: options.max
      })
    });
    return response.data;
  }

  // ---- Email Verification ----

  async verifyEmail(options: { email: string; features?: string }) {
    let response = await this.axios.get('/email/v1/verification', {
      params: this.buildParams({
        email: options.email,
        features: options.features
      })
    });
    return response.data;
  }

  // ---- Phone Verification ----

  async verifyPhone(options: {
    phoneNumber: string;
    defaultCountryCode: string;
    mobileOnly?: boolean;
    timeout?: number;
    allowedCountryCodes?: string;
  }) {
    let response = await this.axios.get('/phone/v1/verification', {
      params: this.buildParams({
        phone_number: options.phoneNumber,
        default_country_code: options.defaultCountryCode,
        mobile_only:
          options.mobileOnly !== undefined ? (options.mobileOnly ? '1' : '0') : undefined,
        timeout: options.timeout,
        allowed_country_codes: options.allowedCountryCodes
      })
    });
    return response.data;
  }
}
