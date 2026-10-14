import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  isApiErrorRecord
} from 'slates';
import { z } from 'zod';

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
  line1: string | null;
  line2?: string;
  city: string | null;
  provinceOrState: string | null;
  postalOrZip: string | null;
  zipPlus4?: string;
  firmName?: string;
  country: string | null;
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
  line1: string | null;
  line2?: string;
  city: string | null;
  provinceOrState: string | null;
  postalOrZip: string | null;
  country: string | null;
  countryName?: string;
  zipPlus4?: string;
  status?: string;
  errors?: VerificationErrors;
  geocodeResult?: GeocodeResult;
}

export interface IntlVerificationSummary {
  status: string;
  verificationStatus?: string;
  matchScore?: number;
  message?: string;
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
  status?: 'verified' | 'corrected' | 'failed';
  error?: string;
  countryName?: string;
  formattedAddress?: string;
  line1?: string;
  line2?: string;
  line3?: string;
  line4?: string;
  city?: string;
  provinceOrState?: string;
  postalOrZip?: string;
  country?: string;
  countryCode?: string;
  provinceCode?: string;
  building?: string;
  department?: string;
  company?: string;
  summary?: IntlVerificationSummary;
  geoData?: IntlGeoData;
  errors?: VerificationErrors;
  details?: Record<string, unknown>;
}

export interface IntlAutocompletePreview {
  error?: string;
  id: string;
  type: string;
  text: string;
  highlight?: string;
  description?: string;
}

export interface IntlAutocompleteResult {
  status?: 'verified' | 'corrected' | 'failed';
  error?: string;
  countryName?: string;
  formattedAddress?: string;
  line1?: string;
  line2?: string;
  line3?: string;
  line4?: string;
  city?: string;
  provinceOrState?: string;
  postalOrZip?: string;
  country?: string;
  countryCode?: string;
  provinceCode?: string;
  building?: string;
  department?: string;
  company?: string;
  errors?: VerificationErrors;
  geoData?: IntlGeoData;
}

interface ApiResponse<T> {
  status: 'success' | 'error';
  message?: string;
  data: T;
}

interface BatchResult<T> {
  verifiedAddress?: T;
  error?: string;
}

export interface LookupInfo {
  freeLimit: number | null;
  subscribed: boolean;
  used: number;
}

export interface ParsedAddress {
  category?: string;
  city?: string;
  cityDistrict?: string;
  country?: string;
  house?: string;
  houseNumber?: string;
  island?: string;
  level?: string;
  near?: string;
  poBox?: string;
  postcode?: string;
  road?: string;
  state?: string;
  stateDistrict?: string;
  suburb?: string;
  unit?: string;
}

export interface PostalLocality {
  city: string;
  country: string;
  provinceOrState: string;
  county?: string;
  countyFIPS?: string;
  mailable?: boolean;
  preferredCity?: string;
  zipClass?: string;
}

let selectionSchema = z.object({
  partialStreet: z.string().min(1),
  index: z.number().refine(value => Number.isInteger(value) && value >= 0),
  properCase: z.boolean().optional()
});
let selectionPrefix = 'postgrid-preview:';

export class Client {
  private standardApi: ReturnType<typeof createAuthenticatedAxios>;
  private intlApi: ReturnType<typeof createAuthenticatedAxios>;

  constructor(params: { token: string }) {
    if (!params.token.trim()) {
      throw createApiServiceError('A PostGrid address verification API key is required.');
    }
    let settings = {
      authHeader: { name: 'x-api-key', value: params.token.trim() },
      errorAdapter: (error: unknown) =>
        buildApiServiceError(error, {
          providerLabel: 'PostGrid Verify',
          reason: 'postgrid_verify_api_error'
        })
    };
    this.standardApi = createAuthenticatedAxios({
      ...settings,
      baseURL: 'https://api.postgrid.com/v1/addver'
    });
    this.intlApi = createAuthenticatedAxios({
      ...settings,
      baseURL: 'https://api.postgrid.com/v1/intl_addver'
    });
  }

  private unwrap<T>(response: { data: ApiResponse<T> }): T {
    let body = response.data;
    if (
      !isApiErrorRecord(body) ||
      body.status !== 'success' ||
      body.data === null ||
      body.data === undefined
    ) {
      throw createApiServiceError(
        body?.message || 'PostGrid did not return a successful result.',
        {
          reason: 'postgrid_verify_api_error'
        }
      );
    }
    return body.data;
  }

  private normalizeStandard<T extends AutocompleteResult>(result: T): T {
    let normalized = Object.fromEntries(
      Object.entries(result).filter(([, value]) => value !== null)
    ) as T;
    normalized.line1 = result.line1 ?? null;
    normalized.city = result.city ?? null;
    normalized.provinceOrState = result.provinceOrState ?? null;
    normalized.postalOrZip = result.postalOrZip ?? null;
    normalized.country = result.country ?? null;
    if ('details' in normalized && isApiErrorRecord(normalized.details)) {
      normalized.details = Object.fromEntries(
        Object.entries(normalized.details).filter(([, value]) => value !== null)
      );
    }
    return normalized;
  }

  async verifyAddress(
    address: StructuredAddress | string,
    options?: VerificationOptions
  ): Promise<VerificationResult> {
    let response = await this.standardApi.post<ApiResponse<VerificationResult>>(
      '/verifications',
      { address },
      { params: options }
    );
    let result = this.normalizeStandard(this.unwrap(response));
    if (!['verified', 'corrected', 'failed'].includes(result.status)) {
      throw createApiServiceError('PostGrid did not return a verification status.');
    }
    return result;
  }

  async batchVerifyAddresses(
    addresses: (StructuredAddress | string)[],
    options?: VerificationOptions
  ): Promise<VerificationResult[]> {
    let response = await this.standardApi.post<
      ApiResponse<VerificationResult[] | { results: BatchResult<VerificationResult>[] }>
    >('/verifications/batch', { addresses }, { params: options });
    let data = this.unwrap(response);
    if (Array.isArray(data)) return data.map(result => this.normalizeStandard(result));
    if (!Array.isArray(data.results)) {
      throw createApiServiceError('PostGrid did not return batch verification results.');
    }
    return data.results.map(result =>
      this.normalizeStandard(
        result.verifiedAddress ?? {
          line1: null,
          city: null,
          provinceOrState: null,
          postalOrZip: null,
          country: null,
          status: 'failed',
          errors: { generic: [result.error || 'Address verification failed.'] }
        }
      )
    );
  }

  async getAutocompletePreviews(
    partialStreet: string,
    options?: { properCase?: boolean; provInsteadOfPC?: boolean }
  ): Promise<AutocompletePreview[]> {
    let response = await this.standardApi.get<
      ApiResponse<
        {
          id?: string;
          type?: string;
          text?: string;
          preview?: AutocompletePreview['preview'];
        }[]
      >
    >('/completions', { params: { partialStreet, ...options } });
    let previews = this.unwrap(response);
    return previews.map((preview, index) => ({
      ...preview,
      id:
        preview.id ??
        selectionPrefix +
          Buffer.from(
            JSON.stringify({
              partialStreet,
              index,
              properCase: options?.properCase
            })
          ).toString('base64url'),
      type: preview.type ?? 'Address',
      text:
        preview.text ??
        [
          preview.preview?.address,
          preview.preview?.city,
          preview.preview?.prov,
          preview.preview?.pc
        ]
          .filter(Boolean)
          .join(', ')
    }));
  }

  async completeAddress(
    previewId: string,
    options?: { geocode?: boolean; properCase?: boolean }
  ): Promise<AutocompleteResult> {
    if (previewId.startsWith(selectionPrefix)) {
      let selection: z.infer<typeof selectionSchema>;
      try {
        selection = selectionSchema.parse(
          JSON.parse(
            Buffer.from(previewId.slice(selectionPrefix.length), 'base64url').toString('utf8')
          )
        );
      } catch {
        throw createApiServiceError(
          'The previewId is invalid. Get fresh suggestions with autocomplete_address.'
        );
      }
      let response = await this.standardApi.post<ApiResponse<AutocompleteResult>>(
        '/completions',
        { partialStreet: selection.partialStreet },
        {
          params: {
            index: selection.index,
            verify: true,
            ...options,
            properCase: options?.properCase ?? selection.properCase
          }
        }
      );
      return this.normalizeStandard(this.unwrap(response));
    }
    // Keep provider-issued IDs usable for existing connections and older previews.
    let response = await this.standardApi.post<ApiResponse<AutocompleteResult>>(
      '/completions',
      { id: previewId },
      { params: options }
    );
    return this.normalizeStandard(this.unwrap(response));
  }

  async getAutocompleteDrilldown(
    containerId: string,
    options?: { properCase?: boolean; provInsteadOfPC?: boolean }
  ): Promise<AutocompletePreview[]> {
    let response = await this.standardApi.get<ApiResponse<AutocompletePreview[]>>(
      '/completions',
      { params: { container: containerId, advanced: true, ...options } }
    );
    return this.unwrap(response);
  }

  private normalizeInternational(result: IntlVerificationResult): IntlVerificationResult {
    let normalized = Object.fromEntries(
      Object.entries(result).filter(([, value]) => value !== null)
    ) as IntlVerificationResult;
    if (normalized.summary) {
      let summary = normalized.summary;
      normalized.summary = {
        ...Object.fromEntries(Object.entries(summary).filter(([, value]) => value !== null)),
        status: summary.status ?? summary.verificationStatus ?? normalized.status ?? 'unknown'
      };
    }
    if (normalized.geoData) {
      let geo = normalized.geoData;
      let latitude: unknown = geo.latitude;
      let longitude: unknown = geo.longitude;
      normalized.geoData = {
        ...geo,
        latitude:
          latitude === undefined || latitude === null || latitude === ''
            ? undefined
            : Number(latitude),
        longitude:
          longitude === undefined || longitude === null || longitude === ''
            ? undefined
            : Number(longitude),
        accuracy:
          geo.accuracy ?? (typeof geo.geoAccuracy === 'string' ? geo.geoAccuracy : undefined)
      };
      if (
        (normalized.geoData.latitude !== undefined &&
          !Number.isFinite(normalized.geoData.latitude)) ||
        (normalized.geoData.longitude !== undefined &&
          !Number.isFinite(normalized.geoData.longitude))
      ) {
        throw createApiServiceError(
          'PostGrid returned invalid international geographic coordinates.'
        );
      }
    }
    return normalized;
  }

  async verifyInternationalAddress(
    address: StructuredAddress | string,
    options?: { includeDetails?: boolean; geoData?: boolean; properCase?: boolean }
  ): Promise<IntlVerificationResult> {
    let response = await this.intlApi.post<ApiResponse<IntlVerificationResult>>(
      '/verifications',
      { address },
      { params: options }
    );
    return this.normalizeInternational(this.unwrap(response));
  }

  async batchVerifyInternationalAddresses(
    addresses: (StructuredAddress | string)[],
    options?: { includeDetails?: boolean; geoData?: boolean; properCase?: boolean }
  ): Promise<IntlVerificationResult[]> {
    let response = await this.intlApi.post<
      ApiResponse<
        IntlVerificationResult[] | { results: BatchResult<IntlVerificationResult>[] }
      >
    >('/verifications/batch', { addresses }, { params: options });
    let data = this.unwrap(response);
    if (Array.isArray(data)) return data.map(result => this.normalizeInternational(result));
    if (!Array.isArray(data.results)) {
      throw createApiServiceError(
        'PostGrid did not return international batch verification results.'
      );
    }
    return data.results.map(result =>
      this.normalizeInternational(
        result.verifiedAddress ?? {
          status: 'failed',
          error: result.error || 'Address verification failed.',
          errors: { generic: [result.error || 'Address verification failed.'] }
        }
      )
    );
  }

  private normalizeIntlPreviews(
    previews: IntlAutocompletePreview[]
  ): IntlAutocompletePreview[] {
    return previews.map(preview => {
      if (preview.error) {
        throw createApiServiceError(`PostGrid autocomplete failed: ${preview.error}`);
      }
      if (!preview.id || !preview.type || !preview.text) {
        throw createApiServiceError(
          'PostGrid returned an incomplete international address suggestion.'
        );
      }
      return Object.fromEntries(
        Object.entries(preview).filter(([, value]) => value !== null)
      ) as IntlAutocompletePreview;
    });
  }

  async getIntlAutocompletePreviews(
    partialStreet: string,
    options?: { countriesFilter?: string; properCase?: boolean }
  ): Promise<IntlAutocompletePreview[]> {
    let response = await this.intlApi.get<ApiResponse<IntlAutocompletePreview[]>>(
      '/completions',
      { params: { partialStreet, ...options } }
    );
    return this.normalizeIntlPreviews(this.unwrap(response));
  }

  async completeIntlAddress(
    previewId: string,
    options?: { geoData?: boolean; properCase?: boolean }
  ): Promise<IntlAutocompleteResult> {
    let response = await this.intlApi.post<ApiResponse<IntlAutocompleteResult>>(
      '/completions',
      { id: previewId },
      { params: { properCase: options?.properCase } }
    );
    let result = this.normalizeInternational(this.unwrap(response));
    if (result.error)
      throw createApiServiceError(`PostGrid could not resolve this address: ${result.error}`);
    if (options?.geoData) {
      if (
        !(result.formattedAddress?.trim() || result.line1) ||
        !(result.countryCode || result.country)
      ) {
        throw createApiServiceError(
          'PostGrid did not return an address with a country for geographic lookup.'
        );
      }
      let fullAddress =
        (result.formattedAddress?.trim()
          ? `${result.formattedAddress.trim()}, ${result.countryCode || result.country}`
          : undefined) ||
        [
          result.company,
          result.department,
          result.building,
          result.line1,
          result.line2,
          result.line3,
          result.line4,
          result.city,
          result.provinceCode || result.provinceOrState,
          result.postalOrZip,
          result.countryCode || result.country
        ]
          .filter(Boolean)
          .join(', ');
      let verification = await this.verifyInternationalAddress(fullAddress, {
        geoData: true,
        properCase: options.properCase
      });
      return {
        ...result,
        geoData: verification.geoData,
        status: verification.status ?? result.status,
        errors: result.errors ?? verification.errors
      };
    }
    return result;
  }

  async getIntlAutocompleteDrilldown(
    containerId: string,
    options?: { countriesFilter?: string; properCase?: boolean }
  ): Promise<IntlAutocompletePreview[]> {
    let response = await this.intlApi.get<ApiResponse<IntlAutocompletePreview[]>>(
      '/completions',
      { params: { container: containerId, advanced: true, ...options } }
    );
    return this.normalizeIntlPreviews(this.unwrap(response));
  }

  async getLookupInfo(): Promise<LookupInfo> {
    return this.unwrap(await this.standardApi.get<ApiResponse<LookupInfo>>('/'));
  }

  async parseAddress(address: string): Promise<ParsedAddress> {
    return this.unwrap(
      await this.standardApi.post<ApiResponse<ParsedAddress>>('/parses', { address })
    );
  }

  async lookupCityState(postalOrZip: string): Promise<PostalLocality[]> {
    return this.unwrap(
      await this.standardApi.post<ApiResponse<PostalLocality[]>>('/city_states', {
        postalOrZip
      })
    );
  }
}
