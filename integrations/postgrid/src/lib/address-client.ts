import { buildApiServiceError, createApiServiceError, createAuthenticatedAxios } from 'slates';

let ADDRESS_VERIFICATION_BASE_URL = 'https://api.postgrid.com/v1/addver';
let INTL_ADDRESS_VERIFICATION_BASE_URL = 'https://api.postgrid.com/v1/intl_addver';

export class AddressVerificationClient {
  private axios;
  private intlAxios;

  constructor(token: string) {
    if (!token.trim())
      throw createApiServiceError('A PostGrid address verification API key is required.');
    this.axios = createAuthenticatedAxios({
      baseURL: ADDRESS_VERIFICATION_BASE_URL,
      authHeader: { name: 'x-api-key', value: token },
      timeout: 30_000,
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'PostGrid Address Verification',
          reason: 'postgrid_address_api_error'
        })
    });
    this.intlAxios = createAuthenticatedAxios({
      baseURL: INTL_ADDRESS_VERIFICATION_BASE_URL,
      authHeader: { name: 'x-api-key', value: token },
      timeout: 30_000,
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'PostGrid Address Verification',
          reason: 'postgrid_address_api_error'
        })
    });
  }

  // --- Domestic Verification (US/Canada) ---

  async verifyAddress(
    address:
      | string
      | {
          line1: string;
          line2?: string;
          city?: string;
          provinceOrState?: string;
          postalOrZip?: string;
          country?: string;
        },
    options?: {
      includeDetails?: boolean;
      properCase?: boolean;
      geocode?: boolean;
    }
  ) {
    let params: Record<string, string> = {};
    if (options?.includeDetails) params.includeDetails = 'true';
    if (options?.properCase) params.properCase = 'true';
    if (options?.geocode) params.geocode = 'true';

    let res = await this.axios.post('/verifications', { address }, { params });
    if (res.data?.status === 'error') {
      throw createApiServiceError(res.data.message || 'PostGrid address verification failed.');
    }
    return res.data;
  }

  async batchVerifyAddresses(
    addresses: (
      | string
      | {
          line1: string;
          line2?: string;
          city?: string;
          provinceOrState?: string;
          postalOrZip?: string;
          country?: string;
        }
    )[],
    options?: {
      includeDetails?: boolean;
      properCase?: boolean;
      geocode?: boolean;
    }
  ) {
    let params: Record<string, string> = {};
    if (options?.includeDetails) params.includeDetails = 'true';
    if (options?.properCase) params.properCase = 'true';
    if (options?.geocode) params.geocode = 'true';

    let res = await this.axios.post('/verifications/batch', { addresses }, { params });
    if (res.data?.status === 'error') {
      throw createApiServiceError(res.data.message || 'PostGrid address verification failed.');
    }
    return res.data;
  }

  // --- Domestic Autocomplete ---

  async autocompleteAddress(partialStreet: string) {
    let res = await this.axios.get('/completions', {
      params: { partialStreet }
    });
    if (res.data?.status === 'error') {
      throw createApiServiceError(res.data.message || 'PostGrid address verification failed.');
    }
    return res.data;
  }

  // --- International Verification ---

  async verifyInternationalAddress(
    address:
      | string
      | {
          line1: string;
          line2?: string;
          city?: string;
          provinceOrState?: string;
          postalOrZip?: string;
          country?: string;
        },
    options?: {
      includeDetails?: boolean;
      properCase?: boolean;
      geoData?: boolean;
    }
  ) {
    let params: Record<string, string> = {};
    if (options?.includeDetails) params.includeDetails = 'true';
    if (options?.properCase) params.properCase = 'true';
    if (options?.geoData) params.geoData = 'true';

    let res = await this.intlAxios.post('/verifications', { address }, { params });
    if (res.data?.status === 'error') {
      throw createApiServiceError(res.data.message || 'PostGrid address verification failed.');
    }
    return res.data;
  }

  async autocompleteInternationalAddress(partialStreet: string, countriesFilter?: string) {
    let params: Record<string, string> = { partialStreet };
    if (countriesFilter) params.countriesFilter = countriesFilter;

    let res = await this.intlAxios.get('/completions', { params });
    if (res.data?.status === 'error') {
      throw createApiServiceError(res.data.message || 'PostGrid address verification failed.');
    }
    return res.data;
  }
}
