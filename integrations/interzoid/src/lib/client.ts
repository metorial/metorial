import {
  buildApiServiceError,
  createApiServiceError,
  createAxios,
  isApiErrorRecord
} from 'slates';

let api = createAxios({
  baseURL: 'https://api.interzoid.com'
});

let interzoidApiError = (error: unknown, operation: string) =>
  buildApiServiceError(error, {
    providerLabel: 'Interzoid',
    reason: 'interzoid_api_error',
    operation,
    detailKeys: ['Code', 'Message', 'message', 'Error', 'error'],
    extractResponse: (failure, helpers) => helpers.getResponseWithBody(failure),
    extractUpstreamCode: (_failure, response) =>
      isApiErrorRecord(response?.data) && typeof response.data.Code === 'string'
        ? response.data.Code
        : undefined
  });

export class Client {
  constructor(private token: string) {
    if (!token.trim()) {
      throw createApiServiceError('An Interzoid API license key is required.');
    }
  }

  private async get<T = any>(
    endpoint: string,
    params: Record<string, string> = {}
  ): Promise<T> {
    try {
      let response = await api.get<T>(endpoint, {
        params: {
          license: this.token,
          ...params
        }
      });
      let data = response.data;
      if (
        isApiErrorRecord(data) &&
        typeof data.Code === 'string' &&
        data.Code.toLowerCase() !== 'success'
      ) {
        throw interzoidApiError({ response: { status: response.status, data } }, endpoint);
      }
      return data;
    } catch (error) {
      throw interzoidApiError(error, endpoint);
    }
  }

  private async getStandardResponse<T extends Record<string, unknown>>(
    endpoint: string,
    params: Record<string, string> = {}
  ): Promise<T & { Code: string; Credits: number }> {
    let result = await this.get<T & { Code: string; Credits: number | string }>(
      endpoint,
      params
    );
    let credits =
      typeof result.Credits === 'string' && result.Credits.trim() !== ''
        ? Number(result.Credits)
        : result.Credits;
    if (typeof credits !== 'number' || !Number.isFinite(credits)) {
      throw createApiServiceError('Interzoid returned an invalid remaining credit balance.', {
        reason: 'interzoid_invalid_response'
      });
    }
    return { ...result, Credits: credits };
  }

  private readResult(data: Record<string, unknown>, currentKey: string, legacyKey: string) {
    let value = data[currentKey] ?? data[legacyKey];
    if (typeof value !== 'string') {
      throw createApiServiceError(`Interzoid returned an invalid ${currentKey} value.`, {
        reason: 'interzoid_invalid_response'
      });
    }
    return value;
  }

  // ──────────────────────────────────────────────────────────────
  // Data Matching – Similarity Keys
  // ──────────────────────────────────────────────────────────────

  async getCompanyMatch(company: string, algorithm: string) {
    return this.getStandardResponse<{ SimKey: string }>('/getcompanymatchadvanced', {
      company,
      algorithm
    });
  }

  async getFullNameMatch(fullname: string) {
    return this.getStandardResponse<{ SimKey: string }>('/getfullnamematch', { fullname });
  }

  async getAddressMatch(address: string, algorithm: string) {
    return this.getStandardResponse<{ SimKey: string }>('/getaddressmatchadvanced', {
      address,
      algorithm
    });
  }

  async getGlobalAddressMatch(address: string, algorithm: string) {
    return this.getStandardResponse<{ SimKey: string }>('/getglobaladdressmatch', {
      address,
      algorithm
    });
  }

  async getProductMatch(product: string, algorithm: string) {
    return this.getStandardResponse<{ SimKey: string }>('/getproductmatch', {
      product,
      algorithm
    });
  }

  // ──────────────────────────────────────────────────────────────
  // Match Scoring
  // ──────────────────────────────────────────────────────────────

  async getOrgMatchScore(org1: string, org2: string) {
    return this.getStandardResponse<{ Score: string }>('/getorgmatchscore', { org1, org2 });
  }

  async getFullNameMatchScore(fullname1: string, fullname2: string) {
    return this.getStandardResponse<{ Score: string }>('/getfullnamematchscore', {
      fullname1,
      fullname2
    });
  }

  // ──────────────────────────────────────────────────────────────
  // Data Enrichment
  // ──────────────────────────────────────────────────────────────

  async getCustomEnrichment(
    topic: string,
    lookup: string,
    outputFields: string[],
    model?: string
  ) {
    let params: Record<string, string> = {
      topic,
      lookup,
      output: JSON.stringify(outputFields)
    };
    if (model) {
      params.model = model;
    }
    return this.get<Record<string, any>>('/getcustom', params);
  }

  async getBusinessInfo(lookup: string) {
    return this.get<Record<string, any>>('/getbusinessinfo', { lookup });
  }

  async getParentCompany(company: string) {
    return this.get<Record<string, any>>('/getparentcompany', { company });
  }

  async getExecutiveProfile(lookup: string) {
    return this.get<Record<string, any>>('/getexecutiveprofile', { lookup });
  }

  async getEmailTrustScore(lookup: string) {
    return this.get<{
      Email: string;
      Score: string;
      Reasoning: string;
      Code: string;
      Credits: number;
    }>('/emailtrustscore', { lookup });
  }

  async getIPProfile(lookup: string) {
    return this.get<Record<string, any>>('/getipprofile', { lookup });
  }

  async getPhoneProfile(lookup: string) {
    return this.get<Record<string, any>>('/getphoneprofile', { lookup });
  }

  async getCompanyVerification(lookup: string) {
    return this.get<{
      Score: string;
      Reasoning: string;
      Code: string;
      Credits: number;
    }>('/getcompanyverification', { lookup });
  }

  async getStockInfo(lookup: string) {
    return this.get<Record<string, any>>('/getstockinfo', { lookup });
  }

  // ──────────────────────────────────────────────────────────────
  // Data Standardization
  // ──────────────────────────────────────────────────────────────

  async getCompanyStandard(company: string) {
    return this.getStandardResponse<{ CompanyStandard: string }>('/getcompanystandard', {
      company
    });
  }

  async getCountryStandard(country: string, algorithm?: string) {
    let params: Record<string, string> = { country };
    if (algorithm) params.algorithm = algorithm;
    return this.getStandardResponse<{ CountryStandard: string }>(
      '/getcountrystandard',
      params
    );
  }

  async getStateAbbreviation(state: string, algorithm?: string) {
    let params: Record<string, string> = { state };
    if (algorithm) params.algorithm = algorithm;
    let result = await this.getStandardResponse<{
      Abbreviation?: string;
      StateAbbreviation?: string;
    }>('/getstateabbreviation', params);
    return {
      ...result,
      StateAbbreviation: this.readResult(result, 'Abbreviation', 'StateAbbreviation')
    };
  }

  async getCityStandard(city: string, algorithm?: string) {
    let params: Record<string, string> = { city };
    if (algorithm) params.algorithm = algorithm;
    return this.getStandardResponse<{ CityStandard: string }>('/getcitystandard', params);
  }

  // ──────────────────────────────────────────────────────────────
  // Data Analysis and Classification
  // ──────────────────────────────────────────────────────────────

  async getEntityType(text: string) {
    let result = await this.getStandardResponse<{ Result?: string; EntityType?: string }>(
      '/getentitytype',
      { text }
    );
    return { ...result, EntityType: this.readResult(result, 'Result', 'EntityType') };
  }

  async getGender(name: string) {
    return this.getStandardResponse<{ Gender: string }>('/getgender', { name });
  }

  async getNameOrigin(name: string) {
    return this.getStandardResponse<{ Origin: string }>('/getnameorigin', { name });
  }

  async identifyLanguage(text: string) {
    return this.getStandardResponse<{ Language: string }>('/identifylanguage', { text });
  }

  async translateToEnglish(text: string) {
    let result = await this.getStandardResponse<{ Result?: string; Translation?: string }>(
      '/translatetoenglish',
      { text }
    );
    return { ...result, Translation: this.readResult(result, 'Result', 'Translation') };
  }

  async translateToAny(text: string, to: string) {
    let result = await this.getStandardResponse<{ Result?: string; Translation?: string }>(
      '/translatetoany',
      { text, to }
    );
    return { ...result, Translation: this.readResult(result, 'Result', 'Translation') };
  }

  // ──────────────────────────────────────────────────────────────
  // Email Validation
  // ──────────────────────────────────────────────────────────────

  async getEmailInfo(email: string) {
    return this.get<Record<string, any>>('/getemailinfo', { email });
  }

  // ──────────────────────────────────────────────────────────────
  // Address Parsing
  // ──────────────────────────────────────────────────────────────

  async addressParse(address: string) {
    return this.get<Record<string, any>>('/addressparse', { address });
  }

  // ──────────────────────────────────────────────────────────────
  // Utility
  // ──────────────────────────────────────────────────────────────

  async getWeatherZipCode(zip: string) {
    return this.get<Record<string, any>>('/getweatherzipcode', { zip });
  }

  async getGlobalWeather(location: string) {
    return this.get<Record<string, any>>('/getglobalweather', { location });
  }

  async getCurrencyRate(symbol: string) {
    return this.get<Record<string, any>>('/getcurrencyrate', { symbol });
  }

  async getGlobalPageLoad(origin: string, url: string) {
    return this.get<Record<string, any>>('/globalpageload', { origin, url });
  }

  async getRemainingCredits() {
    return this.getStandardResponse<Record<never, never>>('/getremainingcredits');
  }

  async getAddressAndFullNameMatch(address: string, fullname: string) {
    return this.get<Record<string, unknown>>('/getaddressandfullnamematch', {
      address,
      fullname
    });
  }

  async getCompanyAndAddressMatch(company: string, address: string) {
    return this.get<Record<string, unknown>>('/getcompanyandaddressmatch', {
      company,
      address
    });
  }

  async getCompanyAndFullNameMatch(company: string, fullname: string) {
    return this.get<Record<string, unknown>>('/getcompanyandfullnamematch', {
      company,
      fullname
    });
  }

  async getCountryInfo(country: string, algorithm?: string) {
    return this.get<Record<string, unknown>>('/getcountryinfo', {
      country,
      ...(algorithm === undefined ? {} : { algorithm })
    });
  }

  async getOrganizationStandard(org: string) {
    return this.get<Record<string, unknown>>('/getorgstandard', { org });
  }

  async getParentCompanyInfo(lookup: string) {
    return this.get<Record<string, unknown>>('/getparentcompanyinfo', { lookup });
  }
}
