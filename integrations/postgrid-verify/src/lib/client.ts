import { createAxios } from 'slates';

export interface StructuredAddress {
  line1: string;
  line2?: string;
  city?: string;
  provinceOrState?: string;
  postalOrZip?: string;
  country?: string;
}

export interface VerificationOptions {
  includeDetails?: boolean;
  properCase?: boolean;
  geocode?: boolean;
}

export type VerificationErrors = Record<string, string[]>;

export interface GeocodeResult {
  location: {
    lat: number;
    lng: number;
  };
  accuracy: number;
  accuracyType: string;
}

export interface VerificationDetails {
  streetNumber?: string;
  streetName?: string;
  streetType?: string;
  streetDirection?: string;
  suiteKey?: string;
  suiteID?: string;
  county?: string;
  residential?: boolean;
  vacant?: boolean;
  [key: string]: unknown;
}

export interface VerificationResult {
  line1: string;
  line2?: string;
  city: string;
  provinceOrState: string;
  postalOrZip: string;
  zipPlus4?: string;
  firmName?: string;
  country: string;
  countryName?: string;
  status: 'verified' | 'corrected' | 'failed';
  errors?: VerificationErrors;
  details?: VerificationDetails;
  geocodeResult?: GeocodeResult;
}

export interface AutocompletePreview {
  id: string;
  type: string;
  text: string;
  highlight?: string;
  description?: string;
  preview?: {
    address?: string;
    city?: string;
    pc?: string;
    prov?: string;
  };
}

export interface AutocompleteResult {
  line1: string;
  line2?: string;
  city: string;
  provinceOrState: string;
  postalOrZip: string;
  country: string;
  countryName?: string;
  zipPlus4?: string;
  status?: string;
  errors?: VerificationErrors;
  geocodeResult?: GeocodeResult;
}

export interface IntlVerificationSummary {
  status: string;
  inputMatchLevel?: string;
  verifiedMatchLevel?: string;
  parsingStatus?: string;
  [key: string]: unknown;
}

export interface IntlGeoData {
  latitude?: number;
  longitude?: number;
  accuracy?: string;
  [key: string]: unknown;
}

export interface IntlVerificationResult {
  formattedAddress?: string;
  line1?: string;
  line2?: string;
  line3?: string;
  line4?: string;
  city?: string;
  provinceOrState?: string;
  postalOrZip?: string;
  country?: string;
  building?: string;
  department?: string;
  company?: string;
  summary?: IntlVerificationSummary;
  geoData?: IntlGeoData;
  errors?: VerificationErrors;
  details?: Record<string, unknown>;
}

export interface IntlAutocompletePreview {
  id: string;
  type: string;
  text: string;
  highlight?: string;
  description?: string;
}

export interface IntlAutocompleteResult {
  formattedAddress?: string;
  line1?: string;
  line2?: string;
  line3?: string;
  line4?: string;
  city?: string;
  provinceOrState?: string;
  postalOrZip?: string;
  country?: string;
  building?: string;
  department?: string;
  company?: string;
  errors?: VerificationErrors;
}

export class Client {
  private standardApi: ReturnType<typeof createAxios>;
  private intlApi: ReturnType<typeof createAxios>;

  constructor(params: { token: string }) {
    this.standardApi = createAxios({
      baseURL: 'https://api.postgrid.com/v1/addver',
      headers: {
        'x-api-key': params.token,
        'Content-Type': 'application/json'
      }
    });

    this.intlApi = createAxios({
      baseURL: 'https://api.postgrid.com/v1/intl_addver',
      headers: {
        'x-api-key': params.token,
        'Content-Type': 'application/json'
      }
    });
  }

  async verifyAddress(
    address: StructuredAddress | string,
    options?: VerificationOptions
  ): Promise<VerificationResult> {
    let params: Record<string, string> = {};
    if (options?.includeDetails) params.includeDetails = 'true';
    if (options?.properCase) params.properCase = 'true';
    if (options?.geocode) params.geocode = 'true';

    let response = await this.standardApi.post('/verifications', { address }, { params });
    return response.data.data;
  }

  async batchVerifyAddresses(
    addresses: (StructuredAddress | string)[],
    options?: VerificationOptions
  ): Promise<VerificationResult[]> {
    let params: Record<string, string> = {};
    if (options?.includeDetails) params.includeDetails = 'true';
    if (options?.properCase) params.properCase = 'true';
    if (options?.geocode) params.geocode = 'true';

    let response = await this.standardApi.post(
      '/verifications/batch',
      { addresses },
      { params }
    );
    return response.data.data;
  }

  async getAutocompletePreviews(
    partialStreet: string,
    options?: { properCase?: boolean; provInsteadOfPC?: boolean }
  ): Promise<AutocompletePreview[]> {
    let params: Record<string, string> = { partialStreet };
    if (options?.properCase) params.properCase = 'true';
    if (options?.provInsteadOfPC) params.provInsteadOfPC = 'true';

    let response = await this.standardApi.get('/completions', { params });
    return response.data.data;
  }

  async completeAddress(
    previewId: string,
    options?: { geocode?: boolean; properCase?: boolean }
  ): Promise<AutocompleteResult> {
    let params: Record<string, string> = {};
    if (options?.geocode) params.geocode = 'true';
    if (options?.properCase) params.properCase = 'true';

    let response = await this.standardApi.post('/completions', { id: previewId }, { params });
    return response.data.data;
  }

  async getAutocompleteDrilldown(
    containerId: string,
    options?: { properCase?: boolean; provInsteadOfPC?: boolean }
  ): Promise<AutocompletePreview[]> {
    let params: Record<string, string> = {
      container: containerId,
      advanced: 'true'
    };
    if (options?.properCase) params.properCase = 'true';
    if (options?.provInsteadOfPC) params.provInsteadOfPC = 'true';

    let response = await this.standardApi.get('/completions', { params });
    return response.data.data;
  }

  async verifyInternationalAddress(
    address: StructuredAddress | string,
    options?: { includeDetails?: boolean; geoData?: boolean; properCase?: boolean }
  ): Promise<IntlVerificationResult> {
    let params: Record<string, string> = {};
    if (options?.includeDetails) params.includeDetails = 'true';
    if (options?.geoData) params.geoData = 'true';
    if (options?.properCase) params.properCase = 'true';

    let response = await this.intlApi.post('/verifications', { address }, { params });
    return response.data.data;
  }

  async batchVerifyInternationalAddresses(
    addresses: (StructuredAddress | string)[],
    options?: { includeDetails?: boolean; geoData?: boolean; properCase?: boolean }
  ): Promise<IntlVerificationResult[]> {
    let params: Record<string, string> = {};
    if (options?.includeDetails) params.includeDetails = 'true';
    if (options?.geoData) params.geoData = 'true';
    if (options?.properCase) params.properCase = 'true';

    let response = await this.intlApi.post('/verifications/batch', { addresses }, { params });
    return response.data.data;
  }

  async getIntlAutocompletePreviews(
    partialStreet: string,
    options?: { countriesFilter?: string; properCase?: boolean }
  ): Promise<IntlAutocompletePreview[]> {
    let params: Record<string, string> = { partialStreet };
    if (options?.countriesFilter) params.countriesFilter = options.countriesFilter;
    if (options?.properCase) params.properCase = 'true';

    let response = await this.intlApi.get('/completions', { params });
    return response.data.data;
  }

  async completeIntlAddress(
    previewId: string,
    options?: { geoData?: boolean; properCase?: boolean }
  ): Promise<IntlAutocompleteResult> {
    let params: Record<string, string> = {};
    if (options?.geoData) params.geoData = 'true';
    if (options?.properCase) params.properCase = 'true';

    let response = await this.intlApi.post('/completions', { id: previewId }, { params });
    return response.data.data;
  }

  async getIntlAutocompleteDrilldown(
    containerId: string,
    options?: { countriesFilter?: string; properCase?: boolean }
  ): Promise<IntlAutocompletePreview[]> {
    let params: Record<string, string> = {
      container: containerId,
      advanced: 'true'
    };
    if (options?.countriesFilter) params.countriesFilter = options.countriesFilter;
    if (options?.properCase) params.properCase = 'true';

    let response = await this.intlApi.get('/completions', { params });
    return response.data.data;
  }
}
