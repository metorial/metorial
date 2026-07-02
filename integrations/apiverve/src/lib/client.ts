import { createAxios } from 'slates';

export interface ApiVerveResponse<T = any> {
  status: string;
  error: string | null;
  data: T;
}

export class Client {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: { token: string }) {
    this.axios = createAxios({
      baseURL: 'https://api.apiverve.com/v1',
      headers: {
        'X-API-Key': config.token,
        'Content-Type': 'application/json',
        Accept: 'application/json'
      }
    });
  }

  async get<T = any>(
    endpoint: string,
    params?: Record<string, any>
  ): Promise<ApiVerveResponse<T>> {
    let response = await this.axios.get<ApiVerveResponse<T>>(endpoint, { params });
    return response.data;
  }

  async post<T = any>(
    endpoint: string,
    data?: Record<string, any>
  ): Promise<ApiVerveResponse<T>> {
    let response = await this.axios.post<ApiVerveResponse<T>>(endpoint, data);
    return response.data;
  }

  // Data Validation
  async validateEmail(email: string) {
    return this.get<{
      domain: string;
      email: string;
      username: string;
      canConnect: boolean;
      hasTypo: boolean;
      isValid: boolean;
      isMxValid: boolean;
      isSmtpValid: boolean;
      isRegexValid: boolean;
      smtp: { valid: boolean; reason: string };
      isCompanyEmail: boolean;
      isFreeEmail: boolean;
      checksum: number;
    }>('/emailvalidator', { email });
  }

  async validatePhoneNumber(number: string, country: string) {
    return this.get<{
      country: string;
      detectedCountry: string;
      countryName: string;
      countrycode: number;
      numberNational: number;
      extension: string | null;
      isvalid: boolean;
      isMobile: boolean;
      type: string;
      formatted: {
        international: string;
        national: string;
        rfc: string;
        e164: string;
      };
    }>('/phonenumbervalidator', { number, country });
  }

  // Weather
  async getWeather(params: { city?: string; zip?: string }) {
    return this.get('/weatherforecast', params);
  }

  // Currency
  async convertCurrency(value: number, from: string, to: string) {
    return this.get<{
      from: string;
      to: string;
      value: number;
      convertedValue: number;
      rate: number;
      change24h: number;
      change24hPct: number;
      changeDirection: string;
      high24h: number;
      low24h: number;
    }>('/currencyconverter', { value, from, to });
  }

  // Domain Data
  async dnsLookup(domain: string) {
    return this.get<{
      domain: string;
      records: {
        A?: string[];
        AAAA?: string[];
        MX?: Array<{ exchange: string; priority: number }>;
        NS?: string[];
        SOA?: {
          nsname: string;
          hostmaster: string;
          serial: number;
          refresh: number;
          retry: number;
          expire: number;
          minttl: number;
        };
        TXT?: string[];
        CNAME?: string[];
      };
    }>('/dnslookup', { domain });
  }

  async checkSsl(domain: string) {
    return this.get<{
      subject: { C: string; ST: string; O: string; CN: string };
      issuer: { C: string; O: string; CN: string };
      subjectaltname: string;
      ca: boolean;
      bits: number;
      valid_from: string;
      valid_to: string;
      serialNumber: string;
      domain: string;
    }>('/sslchecker', { domain });
  }

  // IP Lookup
  async lookupIp(ip: string) {
    return this.get<{
      ip: string;
      country: string;
      countryName: string;
      region: string;
      regionName: string;
      city: string;
      timezone: string;
      coordinates: number[];
    }>('/iplookup', { ip });
  }

  // Text Analysis
  async analyzeSentiment(text: string) {
    return this.post<{
      comparative: number;
      sentimentText: string;
      sentiment: number;
      isPositive: boolean;
      isNegative: boolean;
      normalizedScore: number;
    }>('/sentimentanalysis', { text });
  }

  async checkSpelling(text: string) {
    return this.post<{
      spellPass: boolean;
      mispellingsFound: number;
      corrections: Array<{
        word: string;
        suggestions: string[];
      }>;
    }>('/spellchecker', { text });
  }

  // QR Code Generation
  async generateQrCode(params: {
    value: string;
    type?: string;
    format?: string;
    size?: number;
    margin?: number;
    color?: string;
    backgroundColor?: string;
  }) {
    return this.post<{
      id: string;
      format: string;
      type: string;
      correction: string;
      size: number;
      margin: number;
      expires: number;
      downloadURL: string;
    }>('/qrcodegenerator', params);
  }

  // Generic endpoint call for flexible API access
  async callEndpoint(endpoint: string, method: 'GET' | 'POST', params?: Record<string, any>) {
    if (method === 'GET') {
      return this.get(endpoint, params);
    }
    return this.post(endpoint, params);
  }
}
