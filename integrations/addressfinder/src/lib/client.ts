import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  isApiErrorRecord
} from 'slates';

export let addressfinderError = (error: unknown, operation = 'request') =>
  buildApiServiceError(error, {
    providerLabel: 'Addressfinder',
    reason: 'addressfinder_api_error',
    operation,
    extractStatus: (_error, response) => {
      let status = response?.status;
      return typeof status === 'string' && /^\d{3}$/.test(status) ? Number(status) : status;
    },
    extractUpstreamCode: (_error, response) => {
      let data = response?.data;
      if (!isApiErrorRecord(data)) return undefined;
      let code = data.error_code ?? data.error;
      return typeof code === 'string' || typeof code === 'number' ? String(code) : undefined;
    }
  });

export interface ClientConfig {
  token: string;
  secret?: string;
  authMethod: 'api_key' | 'oauth2';
}

export class Client {
  private axios: ReturnType<typeof createAuthenticatedAxios>;
  private token: string;
  private secret?: string;
  private authMethod: 'api_key' | 'oauth2';

  constructor(config: ClientConfig) {
    if (!config.token.trim() || (config.authMethod === 'api_key' && !config.secret?.trim())) {
      throw createApiServiceError(
        'Reconnect with a valid API key and secret or OAuth token.',
        {
          reason: 'addressfinder_missing_auth'
        }
      );
    }
    this.token = config.token;
    this.secret = config.secret;
    this.authMethod = config.authMethod;

    let headers: Record<string, string> = {};
    if (this.authMethod === 'oauth2') {
      headers.Authorization = `Bearer ${this.token}`;
    } else if (this.secret) {
      headers.Authorization = this.secret;
    }

    this.axios = createAuthenticatedAxios({
      baseURL: 'https://api.addressfinder.io/api',
      headers,
      errorAdapter: error => addressfinderError(error)
    });

    this.axios.interceptors.response.use(response => {
      if (!isApiErrorRecord(response.data)) {
        throw createApiServiceError('Addressfinder returned an invalid response.', {
          reason: 'addressfinder_invalid_response',
          upstreamStatus: response.status
        });
      }
      if (response.data.success === false || response.data.error_code || response.data.error) {
        throw addressfinderError({ response }, response.config.url);
      }
      return response;
    });
  }

  private buildParams(
    extra: Record<string, string | number | boolean | undefined> = {}
  ): Record<string, string | number | boolean> {
    let params: Record<string, string | number | boolean> = { format: 'json' };
    if (this.authMethod === 'api_key') {
      params.key = this.token;
    }
    for (let [k, v] of Object.entries(extra)) {
      if (
        typeof v === 'number' &&
        (!Number.isFinite(v) ||
          (['max', 'census', 'strict'].includes(k) && !Number.isInteger(v)))
      ) {
        throw createApiServiceError(`${k} must be a finite whole number.`, {
          reason: 'addressfinder_invalid_input'
        });
      }
      if (k === 'max' && typeof v === 'number' && (v < 1 || v > 100)) {
        throw createApiServiceError('maxResults must be between 1 and 100.', {
          reason: 'addressfinder_invalid_input'
        });
      }
      if (k === 'q' && typeof v === 'string' && !v.trim()) {
        throw createApiServiceError('Enter a non-empty search query.', {
          reason: 'addressfinder_invalid_input'
        });
      }
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
    if (options.max !== undefined && options.max > 15) {
      throw createApiServiceError('International maxResults cannot exceed 15.', {
        reason: 'addressfinder_invalid_input'
      });
    }
    if (options.query.length > 200) {
      throw createApiServiceError('International queries cannot exceed 200 characters.', {
        reason: 'addressfinder_invalid_input'
      });
    }
    let response = await this.axios.get(
      `/${this.internationalCountry(options.country)}/address/v2/autocomplete`,
      {
        params: this.buildParams({
          q: options.query,
          max: options.max
        })
      }
    );
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
    if (![options.addressId, options.gnafId, options.dpid].some(value => value?.trim())) {
      throw createApiServiceError(
        'Provide addressId, gnafId, or dpid for AU address metadata.',
        {
          reason: 'addressfinder_invalid_input'
        }
      );
    }
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
    if (![options.pxid, options.dpid].some(value => value?.trim())) {
      throw createApiServiceError('Provide pxid or dpid for NZ address metadata.', {
        reason: 'addressfinder_invalid_input'
      });
    }
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
    if (!options.addressId?.trim()) {
      throw createApiServiceError(
        'Provide addressId from address_autocomplete for international metadata.',
        {
          reason: 'addressfinder_invalid_input'
        }
      );
    }
    let response = await this.axios.get(
      `/${this.internationalCountry(options.country)}/address/v2/metadata`,
      {
        params: this.buildParams({
          id: options.addressId,
          gps: options.gps
        })
      }
    );
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
    let longitude = Number(options.longitude);
    let latitude = Number(options.latitude);
    if (
      !options.longitude.trim() ||
      !options.latitude.trim() ||
      !Number.isFinite(longitude) ||
      !Number.isFinite(latitude) ||
      Math.abs(longitude) > 180 ||
      Math.abs(latitude) > 90
    ) {
      throw createApiServiceError(
        'Provide valid WGS84 longitude (-180 to 180) and latitude (-90 to 90).',
        {
          reason: 'addressfinder_invalid_input'
        }
      );
    }
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
    verifyFormatOnly?: boolean;
  }) {
    let response = await this.axios.get('/phone/v1/verification', {
      params: this.buildParams({
        phone_number: options.phoneNumber,
        default_country_code: options.defaultCountryCode,
        mobile_only: options.mobileOnly,
        verify_format_only: options.verifyFormatOnly,
        timeout: options.timeout,
        allowed_country_codes: options.allowedCountryCodes
      })
    });
    return response.data;
  }

  async nzPoiAutocomplete(options: { query: string; max?: number }) {
    let response = await this.axios.get('/nz/points_of_interest/autocomplete', {
      params: this.buildParams({ q: options.query, max: options.max })
    });
    return response.data;
  }

  async nzPoiMetadata(options: { id: string }) {
    if (!options.id.trim()) {
      throw createApiServiceError('Provide a POI identifier from poi_autocomplete.', {
        reason: 'addressfinder_invalid_input'
      });
    }
    let response = await this.axios.get('/nz/points_of_interest/metadata', {
      params: this.buildParams({ id: options.id })
    });
    return response.data;
  }

  private internationalCountry(country: string) {
    if (!/^[a-z]{2}$/i.test(country)) {
      throw createApiServiceError(
        'internationalCountryCode must be a two-letter ISO country code.',
        {
          reason: 'addressfinder_invalid_input'
        }
      );
    }
    return country.toLowerCase();
  }
}
