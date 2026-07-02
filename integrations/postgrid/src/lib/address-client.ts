import { createAxios } from 'slates';

let ADDRESS_VERIFICATION_BASE_URL = 'https://api.postgrid.com/addver';
let INTL_ADDRESS_VERIFICATION_BASE_URL = 'https://api.postgrid.com/v1/intl_addver';

export class AddressVerificationClient {
  private axios;
  private intlAxios;

  constructor(private token: string) {
    this.axios = createAxios({
      baseURL: ADDRESS_VERIFICATION_BASE_URL,
      headers: {
        'x-api-key': this.token
      }
    });
    this.intlAxios = createAxios({
      baseURL: INTL_ADDRESS_VERIFICATION_BASE_URL,
      headers: {
        'x-api-key': this.token
      }
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
    return res.data;
  }

  // --- Domestic Autocomplete ---

  async autocompleteAddress(partialStreet: string) {
    let res = await this.axios.get('/completions', {
      params: { partialStreet }
    });
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
    return res.data;
  }

  async autocompleteInternationalAddress(partialStreet: string, countriesFilter?: string) {
    let params: Record<string, string> = { partialStreet };
    if (countriesFilter) params.countriesFilter = countriesFilter;

    let res = await this.intlAxios.get('/completions', { params });
    return res.data;
  }
}
