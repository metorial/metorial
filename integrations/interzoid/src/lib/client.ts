import { createAxios } from 'slates';

let api = createAxios({
  baseURL: 'https://api.interzoid.com'
});

export class Client {
  constructor(private token: string) {}

  private async get<T = any>(
    endpoint: string,
    params: Record<string, string> = {}
  ): Promise<T> {
    let response = await api.get(endpoint, {
      params: {
        license: this.token,
        ...params
      }
    });
    return response.data as T;
  }

  // ──────────────────────────────────────────────────────────────
  // Data Matching – Similarity Keys
  // ──────────────────────────────────────────────────────────────

  async getCompanyMatch(company: string, algorithm: string) {
    return this.get<{
      SimKey: string;
      Code: string;
      Credits: number;
    }>('/getcompanymatchadvanced', { company, algorithm });
  }

  async getFullNameMatch(fullname: string) {
    return this.get<{
      SimKey: string;
      Code: string;
      Credits: number;
    }>('/getfullnamematch', { fullname });
  }

  async getAddressMatch(address: string, algorithm: string) {
    return this.get<{
      SimKey: string;
      Code: string;
      Credits: number;
    }>('/getaddressmatchadvanced', { address, algorithm });
  }

  async getGlobalAddressMatch(address: string, algorithm: string) {
    return this.get<{
      SimKey: string;
      Code: string;
      Credits: number;
    }>('/getglobaladdressmatch', { address, algorithm });
  }

  async getProductMatch(product: string, algorithm: string) {
    return this.get<{
      SimKey: string;
      Code: string;
      Credits: number;
    }>('/getproductmatch', { product, algorithm });
  }

  // ──────────────────────────────────────────────────────────────
  // Match Scoring
  // ──────────────────────────────────────────────────────────────

  async getOrgMatchScore(org1: string, org2: string) {
    return this.get<{
      Score: string;
      Code: string;
      Credits: number;
    }>('/getorgmatchscore', { org1, org2 });
  }

  async getFullNameMatchScore(fullname1: string, fullname2: string) {
    return this.get<{
      Score: string;
      Code: string;
      Credits: number;
    }>('/getfullnamematchscore', { fullname1, fullname2 });
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
    return this.get<{
      CompanyStandard: string;
      Code: string;
      Credits: number;
    }>('/getcompanystandard', { company });
  }

  async getCountryStandard(country: string, algorithm?: string) {
    let params: Record<string, string> = { country };
    if (algorithm) params.algorithm = algorithm;
    return this.get<{
      CountryStandard: string;
      Code: string;
      Credits: number;
    }>('/getcountrystandard', params);
  }

  async getStateAbbreviation(state: string, algorithm?: string) {
    let params: Record<string, string> = { state };
    if (algorithm) params.algorithm = algorithm;
    return this.get<{
      StateAbbreviation: string;
      Code: string;
      Credits: number;
    }>('/getstateabbreviation', params);
  }

  async getCityStandard(city: string, algorithm?: string) {
    let params: Record<string, string> = { city };
    if (algorithm) params.algorithm = algorithm;
    return this.get<{
      CityStandard: string;
      Code: string;
      Credits: number;
    }>('/getcitystandard', params);
  }

  // ──────────────────────────────────────────────────────────────
  // Data Analysis and Classification
  // ──────────────────────────────────────────────────────────────

  async getEntityType(text: string) {
    return this.get<{
      EntityType: string;
      Code: string;
      Credits: number;
    }>('/getentitytype', { text });
  }

  async getGender(name: string) {
    return this.get<{
      Gender: string;
      Code: string;
      Credits: number;
    }>('/getgender', { name });
  }

  async getNameOrigin(name: string) {
    return this.get<{
      Origin: string;
      Code: string;
      Credits: number;
    }>('/getnameorigin', { name });
  }

  async identifyLanguage(text: string) {
    return this.get<{
      Language: string;
      Code: string;
      Credits: number;
    }>('/identifylanguage', { text });
  }

  async translateToEnglish(text: string) {
    return this.get<{
      Translation: string;
      Code: string;
      Credits: number;
    }>('/translatetoenglish', { text });
  }

  async translateToAny(text: string, to: string) {
    return this.get<{
      Translation: string;
      Code: string;
      Credits: number;
    }>('/translatetoany', { text, to });
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
    return this.get<{
      Code: string;
      Credits: number;
    }>('/getremainingcredits');
  }
}
