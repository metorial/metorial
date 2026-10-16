import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  isApiErrorRecord,
  pickDefined
} from 'slates';

export interface AdyntelAuth {
  token: string;
  email: string;
}

export class Client {
  private http;

  constructor(private auth: AdyntelAuth) {
    if (!auth.token.trim() || !auth.email.trim()) {
      throw createApiServiceError('Reconnect Adyntel with an API key and its account email.');
    }
    this.http = createAuthenticatedAxios({
      baseURL: 'https://api.adyntel.com',
      timeout: 120_000,
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Adyntel',
          reason: 'adyntel_request_failed',
          extractResponse: (input, helpers) => helpers.getResponseWithBody(input)
        })
    });
  }

  private async post(path: string, params: Record<string, unknown>) {
    let response = await this.http.post<unknown>(path, {
      ...pickDefined(params),
      api_key: this.auth.token,
      email: this.auth.email
    });
    if (response.status === 204 || response.data === '') return undefined;
    if (!isApiErrorRecord(response.data)) {
      throw createApiServiceError('Adyntel returned an unexpected response. Try again later.');
    }
    // TikTok's upstream code uses 0 for success. Other endpoints use HTTP status codes.
    if (
      response.data.error ||
      response.data.success === false ||
      ((path === '/tiktok_search' || path === '/tiktok_ad_details') &&
        response.data.code !== undefined &&
        response.data.code !== 0)
    ) {
      throw buildApiServiceError(
        { response: { status: response.status, data: response.data } },
        { providerLabel: 'Adyntel', reason: 'adyntel_api_error' }
      );
    }
    return response.data;
  }

  private domain(value: string) {
    let domain = value
      .trim()
      .replace(/^https?:\/\//i, '')
      .replace(/^www\./i, '');
    if (!domain || /[\s/?#]/.test(domain) || !domain.includes('.')) {
      throw createApiServiceError(
        'Provide a company domain such as example.com, without a path.'
      );
    }
    return domain;
  }

  private companyTarget(companyDomain?: string, alternate?: string | number) {
    if (
      (!companyDomain?.trim() && alternate === undefined) ||
      (companyDomain && alternate !== undefined)
    ) {
      throw createApiServiceError(
        'Provide exactly one company domain or platform page identifier.'
      );
    }
    return companyDomain === undefined ? undefined : this.domain(companyDomain);
  }

  async lookupMetaAds(params: {
    companyDomain?: string;
    facebookUrl?: string;
    continuationToken?: string;
    mediaType?: string;
    countryCode?: string;
    activeStatus?: string;
    language?: string | string[];
    checkUgc?: boolean;
    adType?: string;
  }) {
    let companyDomain = this.companyTarget(params.companyDomain, params.facebookUrl);
    if (params.facebookUrl) {
      let url: URL;
      try {
        url = new URL(params.facebookUrl);
      } catch {
        throw createApiServiceError(
          'Provide a complete Facebook page URL starting with https://.'
        );
      }
      if (url.protocol !== 'https:' || !/(^|\.)facebook\.com$/i.test(url.hostname)) {
        throw createApiServiceError('Provide a Facebook page URL starting with https://.');
      }
    }
    if (params.checkUgc && params.mediaType !== 'video') {
      throw createApiServiceError('Set mediaType to video when enabling checkUgc.');
    }
    if (params.adType === 'political' && params.countryCode?.toUpperCase() !== 'US') {
      throw createApiServiceError('Meta political ad searches require countryCode US.');
    }
    return this.post('/facebook', {
      company_domain: companyDomain,
      facebook_url: params.facebookUrl,
      continuation_token: params.continuationToken,
      media_type: params.mediaType,
      country_code: params.countryCode,
      active_status: params.activeStatus,
      language: params.language,
      check_ugc: params.checkUgc,
      ad_type: params.adType
    });
  }

  async searchMetaAds(params: { keyword: string; countryCode?: string }) {
    if (!params.keyword.trim())
      throw createApiServiceError('Provide a keyword to search for.');
    return this.post('/facebook_ad_search', {
      keyword: params.keyword,
      country_code: params.countryCode
    });
  }

  async lookupLinkedInAds(params: {
    companyDomain?: string;
    linkedinPageId?: number;
    continuationToken?: string;
    dateFilter?: 'last30d' | 'month' | 'year' | 'lastyear';
    startDate?: string;
    endDate?: string;
    impressionData?: boolean;
  }) {
    let companyDomain = this.companyTarget(params.companyDomain, params.linkedinPageId);
    if (
      params.linkedinPageId !== undefined &&
      (!Number.isSafeInteger(params.linkedinPageId) || params.linkedinPageId <= 0)
    ) {
      throw createApiServiceError(
        'Provide a positive, safe integer LinkedIn page ID or use a company domain.'
      );
    }
    let customRange = params.startDate !== undefined || params.endDate !== undefined;
    if (
      (customRange && (!params.startDate || !params.endDate || params.dateFilter)) ||
      (params.impressionData && (params.dateFilter || customRange))
    ) {
      throw createApiServiceError(
        'Use a date preset or a complete custom date range. Impression data cannot be combined with date filters.'
      );
    }
    if (customRange) {
      let start = params.startDate ?? '';
      let end = params.endDate ?? '';
      let validDate = (date: string) =>
        /^\d{4}-\d{2}-\d{2}$/.test(date) &&
        Number.isFinite(Date.parse(date)) &&
        new Date(date).toISOString().slice(0, 10) === date;
      let days = (Date.parse(end) - Date.parse(start)) / 86_400_000;
      if (
        !validDate(start) ||
        !validDate(end) ||
        days < 0 ||
        days > 364 ||
        end >= new Date().toISOString().slice(0, 10)
      ) {
        throw createApiServiceError(
          'Use valid YYYY-MM-DD dates, with the end before today and no more than 364 days after the start.'
        );
      }
    }
    return this.post('/linkedin', {
      company_domain: companyDomain,
      linkedin_page_id: params.linkedinPageId,
      continuation_token: params.continuationToken,
      date_filter: customRange
        ? { startdate: params.startDate, enddate: params.endDate }
        : params.dateFilter,
      impression_data: params.impressionData
    });
  }

  async lookupGoogleAds(params: {
    companyDomain: string;
    mediaType?: string;
    continuationToken?: string;
    countryCode?: string;
    extractText?: boolean;
  }) {
    return this.post('/google', {
      company_domain: this.domain(params.companyDomain),
      media_type: params.mediaType,
      continuation_token: params.continuationToken,
      country_code: params.countryCode,
      'extract-text': params.extractText
    });
  }

  async submitGoogleShoppingSearch(params: { companyDomain: string }) {
    return this.post('/google_shopping', {
      company_domain: this.domain(params.companyDomain)
    });
  }

  async getGoogleShoppingStatus(params: { requestId: string }) {
    if (!params.requestId.trim())
      throw createApiServiceError(
        'Provide the request ID returned by the Google Shopping search.'
      );
    return this.post('/google_shopping_status', { id: params.requestId });
  }

  async searchTikTokAds(params: { keyword: string; countryCode?: string }) {
    if (!params.keyword.trim())
      throw createApiServiceError('Provide a keyword to search for.');
    if (
      params.countryCode &&
      !/^(AT|BE|BG|CH|CY|CZ|DE|DK|EE|ES|FI|FR|GB|GR|HR|HU|IE|IS|IT|LI|LT|LU|LV|MT|NL|NO|PL|PT|RO|SE|SI|SK|ALL)$/i.test(
        params.countryCode
      )
    ) {
      throw createApiServiceError(
        'Use a supported European country code, ALL, or omit the TikTok country filter. US is not supported.'
      );
    }
    return this.post('/tiktok_search', {
      keyword: params.keyword,
      country_code: params.countryCode
    });
  }

  // Keep the numeric tool's original untyped response contract for existing connections.
  getTikTokAdDetails(params: { adId: number }): Promise<any>;
  getTikTokAdDetails(params: { adId: string }): Promise<Record<string, unknown> | undefined>;
  async getTikTokAdDetails(params: { adId: number | string }) {
    if (
      (typeof params.adId === 'number' &&
        (!Number.isSafeInteger(params.adId) || params.adId <= 0)) ||
      (typeof params.adId === 'string' && !/^\d+$/.test(params.adId))
    ) {
      throw createApiServiceError(
        'Use the exact positive ad ID returned by Search TikTok Ads.'
      );
    }
    return this.post('/tiktok_ad_details', { id: params.adId });
  }

  async getKeywordAnalysis(params: { companyDomain: string }) {
    return this.post('/domain-keywords', {
      company_domain: this.domain(params.companyDomain)
    });
  }
}
