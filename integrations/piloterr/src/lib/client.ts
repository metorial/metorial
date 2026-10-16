import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  decodeApiErrorBody,
  isApiErrorRecord
} from 'slates';

export class PiloterrClient {
  private axios: ReturnType<typeof createAuthenticatedAxios>;

  constructor(token: string) {
    this.axios = createAuthenticatedAxios({
      baseURL: 'https://api.piloterr.com',
      authHeader: { name: 'x-api-key', value: token },
      maxRedirects: 0,
      timeout: 120_000,
      errorMapping: {
        extractResponseData: response =>
          decodeApiErrorBody(response.data, { maxBytes: 65_536 })
      },
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Piloterr',
          reason: 'piloterr_api_error',
          parent: {},
          extractResponse: (input, helpers) => helpers.getResponseWithBody(input)
        })
    });
  }

  private readResponse(data: any, expected: 'object' | 'array' | 'string'): any {
    if (isApiErrorRecord(data) && typeof data.error === 'string') {
      throw buildApiServiceError(
        { response: { status: 200, data } },
        {
          providerLabel: 'Piloterr',
          reason: 'piloterr_api_error',
          parent: {},
          extractResponse: (input, helpers) => helpers.getResponseWithBody(input)
        }
      );
    }
    let valid =
      expected === 'array'
        ? Array.isArray(data)
        : expected === 'string'
          ? typeof data === 'string'
          : isApiErrorRecord(data);
    if (!valid)
      throw createApiServiceError(`Piloterr returned an invalid ${expected} response.`);
    return data;
  }

  async captureScreenshot(params: Record<string, unknown>) {
    return this.axios.get<ArrayBuffer>('/v2/website/screenshot', {
      params: { ...params, s3_url: false },
      paramsSerializer: { indexes: null },
      responseType: 'arraybuffer'
    });
  }

  async suggestLinkedInJobs(params: { query: string; location?: boolean }): Promise<any[]> {
    let response = await this.axios.get('/v2/linkedin/job/suggest', { params });
    return this.readResponse(response.data, 'array');
  }

  // === Website ===

  async crawlWebsite(params: {
    url: string;
    allowRedirects?: boolean;
    returnPageSource?: boolean;
  }): Promise<string> {
    let response = await this.axios.get('/v2/website/crawler', {
      params: {
        query: params.url,
        allow_redirects: params.allowRedirects,
        return_page_source: params.returnPageSource
      }
    });
    return this.readResponse(response.data, 'string');
  }

  async renderWebsite(params: {
    url: string;
    waitInSeconds?: number;
    waitFor?: string;
    blockAds?: boolean;
    timeout?: number;
  }): Promise<string> {
    let response = await this.axios.get('/v2/website/rendering', {
      params: {
        query: params.url,
        wait_in_seconds: params.waitInSeconds,
        wait_for: params.waitFor,
        block_ads: params.blockAds,
        timeout: params.timeout
      }
    });
    return this.readResponse(response.data, 'string');
  }

  async webUnlocker(params: {
    url: string;
    allowRedirects?: boolean;
    returnPageSource?: boolean;
  }): Promise<string> {
    let response = await this.axios.get('/v2/website/webunlocker', {
      params: {
        query: params.url,
        allow_redirects: params.allowRedirects,
        return_page_source: params.returnPageSource
      }
    });
    return this.readResponse(response.data, 'string');
  }

  async detectTechnology(params: { url: string; mode?: 'simple' | 'expert' }): Promise<any> {
    let response = await this.axios.get('/v2/website/technology', {
      params: {
        query: params.url,
        mode: params.mode ?? 'expert'
      }
    });
    return this.readResponse(response.data, 'object');
  }

  async extractContactInfo(params: { url: string; countryCode?: string }): Promise<any> {
    let response = await this.axios.get('/v2/website/email_phone_extractor', {
      params: {
        query: params.url,
        country_code: params.countryCode
      }
    });
    return this.readResponse(response.data, 'object');
  }

  async screenshotWebsite(params: { url: string }): Promise<any> {
    let response = await this.axios.get('https://piloterr.com/api/v2/website/screenshot', {
      params: { query: params.url }
    });
    return response.data;
  }

  // === Company ===

  async getCompanyInfo(params: { query: string }): Promise<any> {
    let response = await this.axios.get('/v2/company', {
      params: { query: params.query }
    });
    return this.readResponse(response.data, 'object');
  }

  // === LinkedIn ===

  async getLinkedInCompany(params: { query?: string; domain?: string }): Promise<any> {
    let response = await this.axios.get('/v2/linkedin/company/info', {
      params: {
        query: params.query,
        domain: params.domain
      }
    });
    return this.readResponse(response.data, 'object');
  }

  async getLinkedInProfile(params: { query: string }): Promise<any> {
    let response = await this.axios.get('/v2/linkedin/profile/info', {
      params: { query: params.query }
    });
    return this.readResponse(response.data, 'object');
  }

  async getLinkedInJob(params: { query: string }): Promise<any> {
    let response = await this.axios.get('/v2/linkedin/job/info', {
      params: { query: params.query }
    });
    return this.readResponse(response.data, 'object');
  }

  async searchLinkedInJobs(params: {
    keyword?: string;
    experienceLevel?: string;
    jobType?: string;
    when?: string;
    flexibility?: string;
    distance?: number;
    geoId?: string;
    companyId?: string;
    page?: number;
  }): Promise<any> {
    let response = await this.axios.get('/v2/linkedin/job/search', {
      params: {
        keyword: params.keyword,
        experience_level: params.experienceLevel,
        job_type: params.jobType,
        when: params.when,
        flexibility: params.flexibility,
        distance: params.distance,
        geo_id: params.geoId,
        company_id: params.companyId,
        page: params.page
      }
    });
    return this.readResponse(response.data, 'array');
  }

  async getLinkedInJobCount(params: {
    keyword?: string;
    experienceLevel?: string;
    jobType?: string;
    when?: string;
    flexibility?: string;
    distance?: number;
    geoId?: string;
    companyId?: string;
  }): Promise<any> {
    let response = await this.axios.get('/v2/linkedin/job/count', {
      params: {
        keyword: params.keyword,
        experience_level: params.experienceLevel,
        job_type: params.jobType,
        when: params.when,
        flexibility: params.flexibility,
        distance: params.distance,
        geo_id: params.geoId,
        company_id: params.companyId
      }
    });
    return this.readResponse(response.data, 'object');
  }

  async getLinkedInPost(params: { query: string }): Promise<any> {
    let response = await this.axios.get('/v2/linkedin/post/info', {
      params: { query: params.query }
    });
    return this.readResponse(response.data, 'object');
  }

  async getLinkedInProduct(params: { query: string }): Promise<any> {
    let response = await this.axios.get('/v2/linkedin/product/info', {
      params: { query: params.query }
    });
    return this.readResponse(response.data, 'object');
  }

  // === Search Engines ===

  async googleSearch(params: {
    query: string;
    tbs?: string;
    location?: string;
    uule?: string;
    gl?: string;
    safe?: 'active' | 'off';
    hl?: string;
    page?: number;
    num?: number;
  }): Promise<any> {
    let response = await this.axios.get('/v2/google/search', {
      params: {
        query: params.query,
        tbs: params.tbs,
        location: params.location,
        uule: params.uule,
        gl: params.gl,
        safe: params.safe,
        hl: params.hl,
        page: params.page,
        num: params.num
      }
    });
    return this.readResponse(response.data, 'object');
  }

  async googleNews(params: {
    query: string;
    location?: string;
    uule?: string;
    gl?: string;
    safe?: 'active' | 'off';
    hl?: string;
    page?: number;
    num?: number;
  }): Promise<any> {
    let response = await this.axios.get('/v2/google/news', {
      params: {
        query: params.query,
        location: params.location,
        uule: params.uule,
        gl: params.gl,
        safe: params.safe,
        hl: params.hl,
        page: params.page,
        num: params.num
      }
    });
    return this.readResponse(response.data, 'object');
  }

  async googleImages(params: {
    query: string;
    gl?: string;
    safe?: 'active' | 'off';
    hl?: string;
    page?: number;
  }): Promise<any> {
    let response = await this.axios.get('/v2/google/images', {
      params: {
        query: params.query,
        gl: params.gl,
        safe: params.safe,
        hl: params.hl,
        page: params.page
      }
    });
    return this.readResponse(response.data, 'object');
  }

  async googleVideos(params: {
    query: string;
    location?: string;
    uule?: string;
    gl?: string;
    safe?: 'active' | 'off';
    hl?: string;
    page?: number;
    num?: number;
  }): Promise<any> {
    let response = await this.axios.get('/v2/google/videos', {
      params: {
        query: params.query,
        location: params.location,
        uule: params.uule,
        gl: params.gl,
        safe: params.safe,
        hl: params.hl,
        page: params.page,
        num: params.num
      }
    });
    return this.readResponse(response.data, 'object');
  }

  async googleAutocomplete(params: {
    query: string;
    cp?: number;
    gl?: string;
    hl?: string;
  }): Promise<any> {
    let response = await this.axios.get('/v2/google/search/autocomplete', {
      params: {
        query: params.query,
        cp: params.cp,
        gl: params.gl,
        hl: params.hl
      }
    });
    return this.readResponse(response.data, 'object');
  }

  async bingSearch(params: {
    query: string;
    page?: number;
    num?: number;
    location?: string;
    mkt?: string;
    cc?: string;
  }): Promise<any> {
    let response = await this.axios.get('/v2/bing/search', {
      params: {
        query: params.query,
        page: params.page,
        num: params.num,
        location: params.location,
        mkt: params.mkt,
        cc: params.cc
      }
    });
    return this.readResponse(response.data, 'object');
  }

  async braveSearch(params: { query: string; page?: number }): Promise<any> {
    let response = await this.axios.get('/v2/brave/search', {
      params: {
        query: params.query,
        page: params.page
      }
    });
    return this.readResponse(response.data, 'object');
  }

  // === Email ===

  async verifyEmail(params: { email: string }): Promise<any> {
    let response = await this.axios.get('/v2/email/verify', {
      params: { query: params.email }
    });
    return this.readResponse(response.data, 'object');
  }

  async analyzeEmailDomain(params: { domain: string }): Promise<any> {
    let response = await this.axios.get('/v2/email/analyzes', {
      params: { query: params.domain }
    });
    return this.readResponse(response.data, 'object');
  }

  async findEmail(params: {
    fullName: string;
    companyDomain?: string;
    companyName?: string;
  }): Promise<any> {
    let response = await this.axios.get('/v2/email/finder', {
      params: {
        query: params.fullName,
        company_domain: params.companyDomain,
        company_name: params.companyName
      }
    });
    return this.readResponse(response.data, 'object');
  }

  // === Domain ===

  async domainWhois(params: { domain: string }): Promise<any> {
    let response = await this.axios.get('/v2/domain/whois', {
      params: { query: params.domain }
    });
    return this.readResponse(response.data, 'object');
  }

  async domainMalicious(params: { query: string }): Promise<any> {
    let response = await this.axios.get('/v2/domain/malicious', {
      params: { query: params.query }
    });
    return this.readResponse(response.data, 'object');
  }

  async domainDnsbl(params: { query: string }): Promise<any> {
    let response = await this.axios.get('/v2/domain/dnsbl', {
      params: { query: params.query }
    });
    return this.readResponse(response.data, 'object');
  }

  // === Amazon ===

  async searchAmazon(params: { query: string; domain?: string; page?: number }): Promise<any> {
    let response = await this.axios.get('/v2/amazon/search', {
      params: {
        query: params.query,
        domain: params.domain,
        page: params.page
      }
    });
    return this.readResponse(response.data, 'array');
  }

  async getAmazonProduct(params: { asin: string; domain?: string }): Promise<any> {
    let response = await this.axios.get('/v2/amazon/product', {
      params: {
        query: params.asin,
        domain: params.domain
      }
    });
    return this.readResponse(response.data, 'object');
  }

  async getAmazonOffers(params: {
    asin: string;
    domain?: string;
    page?: number;
  }): Promise<any> {
    let response = await this.axios.get('/v2/amazon/product/offer', {
      params: {
        query: params.asin,
        domain: params.domain,
        page: params.page
      }
    });
    return this.readResponse(response.data, 'object');
  }

  // === Shopify ===

  async getShopifyProduct(params: { url: string }): Promise<any> {
    let response = await this.axios.get('/v2/shopify/product', {
      params: { query: params.url }
    });
    return this.readResponse(response.data, 'object');
  }

  // === Walmart ===

  async getWalmartProduct(params: { url: string }): Promise<any> {
    let response = await this.axios.get('/v2/walmart/product', {
      params: { query: params.url }
    });
    return this.readResponse(response.data, 'object');
  }

  // === Best Buy ===

  async getBestbuyProduct(params: { url: string }): Promise<any> {
    let response = await this.axios.get('/v2/bestbuy/product', {
      params: { query: params.url }
    });
    return this.readResponse(response.data, 'object');
  }

  async searchBestbuy(params: { query: string }): Promise<any> {
    let response = await this.axios.get('/v2/bestbuy/search', {
      params: { query: params.query }
    });
    return this.readResponse(response.data, 'object');
  }

  // === Crunchbase ===

  async getCrunchbaseCompany(params: { query?: string; domain?: string }): Promise<any> {
    let response = await this.axios.get('/v2/crunchbase/company/info', {
      params: {
        query: params.query,
        domain: params.domain
      }
    });
    return this.readResponse(response.data, 'object');
  }

  async searchCrunchbase(params: { query: string }): Promise<any> {
    let response = await this.axios.get('/v2/crunchbase/search', {
      params: { query: params.query }
    });
    return this.readResponse(response.data, 'object');
  }

  async getCrunchbasePerson(params: { query: string }): Promise<any> {
    let response = await this.axios.get('/v2/crunchbase/people/info', {
      params: { query: params.query }
    });
    return this.readResponse(response.data, 'object');
  }

  async getCrunchbaseFundingRounds(params: {
    daysSinceAnnouncement?: number;
    investmentType?: string;
    investorIdentifiers?: string;
    fundedOrganizationIdentifier?: string;
  }): Promise<any> {
    let response = await this.axios.get('/v2/crunchbase/funding_rounds', {
      params: {
        days_since_announcement: params.daysSinceAnnouncement,
        investment_type: params.investmentType,
        investor_identifiers: params.investorIdentifiers,
        funded_organization_identifier: params.fundedOrganizationIdentifier
      }
    });
    return this.readResponse(response.data, 'object');
  }

  async getCrunchbaseFundingRound(params: { query: string }): Promise<any> {
    let response = await this.axios.get('/v2/crunchbase/funding_round', {
      params: { query: params.query }
    });
    return this.readResponse(response.data, 'object');
  }

  async getCrunchbaseEvent(params: { query: string }): Promise<any> {
    let response = await this.axios.get('/v2/crunchbase/event', {
      params: { query: params.query }
    });
    return this.readResponse(response.data, 'object');
  }

  // === Instagram ===

  async getInstagramUser(params: { query: string }): Promise<any> {
    let response = await this.axios.get('/v2/instagram/user/info', {
      params: { query: params.query }
    });
    return this.readResponse(response.data, 'object');
  }

  async getInstagramPost(params: { query: string }): Promise<any> {
    let response = await this.axios.get('/v2/instagram/post/info', {
      params: { query: params.query }
    });
    return this.readResponse(response.data, 'object');
  }

  // === GitHub ===

  async getGithubUser(params: { query: string }): Promise<any> {
    let response = await this.axios.get('/v2/github/user/info', {
      params: { query: params.query }
    });
    return this.readResponse(response.data, 'object');
  }

  // === Trustpilot ===

  async getTrustpilotCompany(params: { query: string }): Promise<any> {
    let response = await this.axios.get('/v2/trustpilot/company/info', {
      params: { query: params.query }
    });
    return this.readResponse(response.data, 'object');
  }

  // === Usage ===

  async getUsage(): Promise<any> {
    let response = await this.axios.get('/v2/usage');
    return this.readResponse(response.data, 'object');
  }
}
