import { createAxios } from 'slates';

export class PiloterrClient {
  private axios: ReturnType<typeof createAxios>;

  constructor(token: string) {
    this.axios = createAxios({
      baseURL: 'https://piloterr.com',
      headers: {
        'x-api-key': token
      }
    });
  }

  // === Website ===

  async crawlWebsite(params: {
    url: string;
    allowRedirects?: boolean;
    returnPageSource?: boolean;
  }): Promise<string> {
    let response = await this.axios.get('/api/v2/website/crawler', {
      params: {
        query: params.url,
        allow_redirects: params.allowRedirects,
        return_page_source: params.returnPageSource
      }
    });
    return response.data;
  }

  async renderWebsite(params: {
    url: string;
    waitInSeconds?: number;
    waitFor?: string;
    blockAds?: boolean;
    timeout?: number;
  }): Promise<string> {
    let response = await this.axios.get('/api/v2/website/rendering', {
      params: {
        query: params.url,
        wait_in_seconds: params.waitInSeconds,
        wait_for: params.waitFor,
        block_ads: params.blockAds,
        timeout: params.timeout
      }
    });
    return response.data;
  }

  async webUnlocker(params: {
    url: string;
    allowRedirects?: boolean;
    returnPageSource?: boolean;
  }): Promise<string> {
    let response = await this.axios.get('/api/v2/website/webunlocker', {
      params: {
        query: params.url,
        allow_redirects: params.allowRedirects,
        return_page_source: params.returnPageSource
      }
    });
    return response.data;
  }

  async detectTechnology(params: { url: string; mode?: 'simple' | 'expert' }): Promise<any> {
    let response = await this.axios.get('/api/v2/website/technology', {
      params: {
        query: params.url,
        mode: params.mode ?? 'expert'
      }
    });
    return response.data;
  }

  async extractContactInfo(params: { url: string; countryCode?: string }): Promise<any> {
    let response = await this.axios.get('/api/v2/website/email_phone_extractor', {
      params: {
        query: params.url,
        country_code: params.countryCode
      }
    });
    return response.data;
  }

  async screenshotWebsite(params: { url: string }): Promise<any> {
    let response = await this.axios.get('/api/v2/website/screenshot', {
      params: { query: params.url }
    });
    return response.data;
  }

  // === Company ===

  async getCompanyInfo(params: { query: string }): Promise<any> {
    let response = await this.axios.get('/api/v2/company', {
      params: { query: params.query }
    });
    return response.data;
  }

  // === LinkedIn ===

  async getLinkedInCompany(params: { query?: string; domain?: string }): Promise<any> {
    let response = await this.axios.get('/api/v2/linkedin/company/info', {
      params: {
        query: params.query,
        domain: params.domain
      }
    });
    return response.data;
  }

  async getLinkedInProfile(params: { query: string }): Promise<any> {
    let response = await this.axios.get('/api/v2/linkedin/profile/info', {
      params: { query: params.query }
    });
    return response.data;
  }

  async getLinkedInJob(params: { query: string }): Promise<any> {
    let response = await this.axios.get('/api/v2/linkedin/job/info', {
      params: { query: params.query }
    });
    return response.data;
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
    let response = await this.axios.get('/api/v2/linkedin/job/search', {
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
    return response.data;
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
    let response = await this.axios.get('/api/v2/linkedin/job/count', {
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
    return response.data;
  }

  async getLinkedInPost(params: { query: string }): Promise<any> {
    let response = await this.axios.get('/api/v2/linkedin/post/info', {
      params: { query: params.query }
    });
    return response.data;
  }

  async getLinkedInProduct(params: { query: string }): Promise<any> {
    let response = await this.axios.get('/api/v2/linkedin/product/info', {
      params: { query: params.query }
    });
    return response.data;
  }

  // === Search Engines ===

  async googleSearch(params: {
    query: string;
    tbs?: string;
    location?: string;
    gl?: string;
    hl?: string;
    page?: number;
    num?: number;
  }): Promise<any> {
    let response = await this.axios.post('/api/v2/google/search', {
      query: params.query,
      tbs: params.tbs,
      location: params.location,
      gl: params.gl,
      hl: params.hl,
      page: params.page,
      num: params.num
    });
    return response.data;
  }

  async googleNews(params: {
    query: string;
    location?: string;
    gl?: string;
    hl?: string;
    page?: number;
    num?: number;
  }): Promise<any> {
    let response = await this.axios.post('/api/v2/google/news', {
      query: params.query,
      location: params.location,
      gl: params.gl,
      hl: params.hl,
      page: params.page,
      num: params.num
    });
    return response.data;
  }

  async googleImages(params: {
    query: string;
    gl?: string;
    hl?: string;
    page?: number;
  }): Promise<any> {
    let response = await this.axios.post('/api/v2/google/images', {
      query: params.query,
      gl: params.gl,
      hl: params.hl,
      page: params.page
    });
    return response.data;
  }

  async googleVideos(params: {
    query: string;
    location?: string;
    gl?: string;
    hl?: string;
    page?: number;
    num?: number;
  }): Promise<any> {
    let response = await this.axios.post('/api/v2/google/videos', {
      query: params.query,
      location: params.location,
      gl: params.gl,
      hl: params.hl,
      page: params.page,
      num: params.num
    });
    return response.data;
  }

  async googleAutocomplete(params: {
    query: string;
    cp?: number;
    gl?: string;
    hl?: string;
  }): Promise<any> {
    let response = await this.axios.post('/api/v2/google/search/autocomplete', {
      query: params.query,
      cp: params.cp,
      gl: params.gl,
      hl: params.hl
    });
    return response.data;
  }

  async bingSearch(params: {
    query: string;
    page?: number;
    num?: number;
    location?: string;
    mkt?: string;
    cc?: string;
  }): Promise<any> {
    let response = await this.axios.post('/api/v2/bing/search', {
      query: params.query,
      page: params.page,
      num: params.num,
      location: params.location,
      mkt: params.mkt,
      cc: params.cc
    });
    return response.data;
  }

  async braveSearch(params: { query: string; page?: number }): Promise<any> {
    let response = await this.axios.post('/api/v2/brave/search', {
      query: params.query,
      page: params.page
    });
    return response.data;
  }

  // === Email ===

  async verifyEmail(params: { email: string }): Promise<any> {
    let response = await this.axios.get('/api/v2/email/verify', {
      params: { query: params.email }
    });
    return response.data;
  }

  async analyzeEmailDomain(params: { domain: string }): Promise<any> {
    let response = await this.axios.get('/api/v2/email/analyzes', {
      params: { query: params.domain }
    });
    return response.data;
  }

  async findEmail(params: {
    fullName: string;
    companyDomain?: string;
    companyName?: string;
  }): Promise<any> {
    let response = await this.axios.get('/api/v2/email/finder', {
      params: {
        query: params.fullName,
        company_domain: params.companyDomain,
        company_name: params.companyName
      }
    });
    return response.data;
  }

  // === Domain ===

  async domainWhois(params: { domain: string }): Promise<any> {
    let response = await this.axios.get('/api/v2/domain/whois', {
      params: { query: params.domain }
    });
    return response.data;
  }

  async domainMalicious(params: { query: string }): Promise<any> {
    let response = await this.axios.get('/api/v2/domain/malicious', {
      params: { query: params.query }
    });
    return response.data;
  }

  async domainDnsbl(params: { query: string }): Promise<any> {
    let response = await this.axios.get('/api/v2/domain/dnsbl', {
      params: { query: params.query }
    });
    return response.data;
  }

  // === Amazon ===

  async searchAmazon(params: { query: string; domain?: string; page?: number }): Promise<any> {
    let response = await this.axios.post('/api/v2/amazon/search', {
      query: params.query,
      domain: params.domain,
      page: params.page
    });
    return response.data;
  }

  async getAmazonProduct(params: { asin: string; domain?: string }): Promise<any> {
    let response = await this.axios.get('/api/v2/amazon/product/product', {
      params: {
        query: params.asin,
        domain: params.domain
      }
    });
    return response.data;
  }

  async getAmazonOffers(params: {
    asin: string;
    domain?: string;
    page?: number;
  }): Promise<any> {
    let response = await this.axios.get('/api/v2/amazon/product/offer', {
      params: {
        query: params.asin,
        domain: params.domain,
        page: params.page
      }
    });
    return response.data;
  }

  // === Shopify ===

  async getShopifyProduct(params: { url: string }): Promise<any> {
    let response = await this.axios.get('/api/v2/shopify/product', {
      params: { query: params.url }
    });
    return response.data;
  }

  // === Walmart ===

  async getWalmartProduct(params: { url: string }): Promise<any> {
    let response = await this.axios.get('/api/v2/walmart/product', {
      params: { query: params.url }
    });
    return response.data;
  }

  // === Best Buy ===

  async getBestbuyProduct(params: { url: string }): Promise<any> {
    let response = await this.axios.get('/api/v2/bestbuy/product', {
      params: { query: params.url }
    });
    return response.data;
  }

  async searchBestbuy(params: { query: string }): Promise<any> {
    let response = await this.axios.get('/api/v2/bestbuy/search', {
      params: { query: params.query }
    });
    return response.data;
  }

  // === Crunchbase ===

  async getCrunchbaseCompany(params: { query?: string; domain?: string }): Promise<any> {
    let response = await this.axios.get('/api/v2/crunchbase/company/info', {
      params: {
        query: params.query,
        domain: params.domain
      }
    });
    return response.data;
  }

  async searchCrunchbase(params: { query: string }): Promise<any> {
    let response = await this.axios.get('/api/v2/crunchbase/search', {
      params: { query: params.query }
    });
    return response.data;
  }

  async getCrunchbasePerson(params: { query: string }): Promise<any> {
    let response = await this.axios.get('/api/v2/crunchbase/people/info', {
      params: { query: params.query }
    });
    return response.data;
  }

  async getCrunchbaseFundingRounds(params: {
    daysSinceAnnouncement?: number;
    investmentType?: string;
    investorIdentifiers?: string;
    fundedOrganizationIdentifier?: string;
  }): Promise<any> {
    let response = await this.axios.get('/api/v2/crunchbase/funding_rounds', {
      params: {
        days_since_announcement: params.daysSinceAnnouncement,
        investment_type: params.investmentType,
        investor_identifiers: params.investorIdentifiers,
        funded_organization_identifier: params.fundedOrganizationIdentifier
      }
    });
    return response.data;
  }

  async getCrunchbaseFundingRound(params: { query: string }): Promise<any> {
    let response = await this.axios.get('/api/v2/crunchbase/funding_round', {
      params: { query: params.query }
    });
    return response.data;
  }

  async getCrunchbaseEvent(params: { query: string }): Promise<any> {
    let response = await this.axios.get('/api/v2/crunchbase/event', {
      params: { query: params.query }
    });
    return response.data;
  }

  // === Instagram ===

  async getInstagramUser(params: { query: string }): Promise<any> {
    let response = await this.axios.get('/api/v2/instagram/user/info', {
      params: { query: params.query }
    });
    return response.data;
  }

  async getInstagramPost(params: { query: string }): Promise<any> {
    let response = await this.axios.get('/api/v2/instagram/post/info', {
      params: { query: params.query }
    });
    return response.data;
  }

  // === GitHub ===

  async getGithubUser(params: { query: string }): Promise<any> {
    let response = await this.axios.get('/api/v2/github/user/info', {
      params: { query: params.query }
    });
    return response.data;
  }

  // === Trustpilot ===

  async getTrustpilotCompany(params: { query: string }): Promise<any> {
    let response = await this.axios.get('/api/v2/trustpilot/company/info', {
      params: { query: params.query }
    });
    return response.data;
  }

  // === Usage ===

  async getUsage(): Promise<any> {
    let response = await this.axios.get('/api/usage');
    return response.data;
  }
}
