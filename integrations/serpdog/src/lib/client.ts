import { createAxios } from 'slates';

let axiosInstance = createAxios({
  baseURL: 'https://api.serpdog.io'
});

export class Client {
  private apiKey: string;

  constructor(config: { token: string }) {
    this.apiKey = config.token;
  }

  private async get(path: string, params: Record<string, any> = {}) {
    let cleanParams: Record<string, any> = { api_key: this.apiKey };
    for (let [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== '') {
        cleanParams[key] = value;
      }
    }
    let response = await axiosInstance.get(path, { params: cleanParams });
    return response.data;
  }

  // Google Search
  async googleSearch(params: {
    q: string;
    gl?: string;
    hl?: string;
    num?: number;
    page?: number;
    lr?: string;
    uule?: string;
    duration?: string;
    nfpr?: number;
    tbs?: string;
    safe?: string;
    domain?: string;
    html?: boolean;
    lite?: boolean;
  }) {
    let endpoint = params.lite ? '/lite_search' : '/search';
    let { lite, ...rest } = params;
    return this.get(endpoint, rest);
  }

  // Google News
  async googleNews(params: {
    q: string;
    gl?: string;
    hl?: string;
    num?: number;
    page?: number;
    lr?: string;
    uule?: string;
    duration?: string;
    nfpr?: number;
    tbs?: string;
    safe?: string;
    html?: boolean;
  }) {
    return this.get('/news', params);
  }

  // Google Maps Search
  async googleMapsSearch(params: {
    q: string;
    ll?: string;
    hl?: string;
    page?: number;
    domain?: string;
  }) {
    return this.get('/maps_search', params);
  }

  // Google Maps Reviews
  async googleMapsReviews(params: {
    dataId: string;
    hl?: string;
    sortBy?: string;
    topicId?: string;
    nextPageToken?: string;
  }) {
    return this.get('/reviews', {
      data_id: params.dataId,
      hl: params.hl,
      sort_by: params.sortBy,
      topic_id: params.topicId,
      next_page_token: params.nextPageToken
    });
  }

  // Google Maps Photos
  async googleMapsPhotos(params: {
    dataId: string;
    hl?: string;
    categoryId?: string;
    nextPageToken?: string;
  }) {
    return this.get('/maps_photos', {
      data_id: params.dataId,
      hl: params.hl,
      category_id: params.categoryId,
      next_page_token: params.nextPageToken
    });
  }

  // Google Maps Posts
  async googleMapsPosts(params: { dataId: string }) {
    return this.get('/maps_post', {
      data_id: params.dataId
    });
  }

  // Google Shopping
  async googleShopping(params: {
    q: string;
    gl?: string;
    hl?: string;
    num?: number;
    page?: number;
    lr?: string;
    uule?: string;
    duration?: string;
    nfpr?: number;
    tbs?: string;
    safe?: string;
    html?: boolean;
  }) {
    return this.get('/shopping', params);
  }

  // Google Product
  async googleProduct(params: {
    productId: string;
    gl?: string;
    hl?: string;
    uule?: string;
    page?: number;
    offers?: number;
    specs?: number;
    reviews?: number;
    filters?: string;
  }) {
    return this.get('/product', {
      product_id: params.productId,
      gl: params.gl,
      hl: params.hl,
      uule: params.uule,
      page: params.page,
      offers: params.offers,
      specs: params.specs,
      reviews: params.reviews,
      filters: params.filters
    });
  }

  // Google Scholar
  async googleScholar(params: {
    q: string;
    num?: number;
    hl?: string;
    lr?: string;
    page?: number;
    cites?: string;
    asYlo?: string;
    asYhi?: string;
    scisbd?: string;
    cluster?: string;
    asVis?: string;
    asSdt?: string;
    safe?: string;
    html?: boolean;
  }) {
    return this.get('/scholar', {
      q: params.q,
      num: params.num,
      hl: params.hl,
      lr: params.lr,
      page: params.page,
      cites: params.cites,
      as_ylo: params.asYlo,
      as_yhi: params.asYhi,
      scisbd: params.scisbd,
      cluster: params.cluster,
      as_vis: params.asVis,
      as_sdt: params.asSdt,
      safe: params.safe,
      html: params.html
    });
  }

  // Google Scholar Author Profile
  async googleScholarAuthor(params: {
    authorId: string;
    viewOp?: string;
    sort?: string;
    citationId?: string;
  }) {
    return this.get('/scholar_author', {
      author_id: params.authorId,
      view_op: params.viewOp,
      sort: params.sort,
      citation_id: params.citationId
    });
  }

  // Google Images
  async googleImages(params: {
    q: string;
    gl?: string;
    hl?: string;
    domain?: string;
    lr?: string;
    uule?: string;
    ijn?: number;
    duration?: string;
    nfpr?: number;
    tbs?: string;
    chips?: string;
    safe?: string;
    html?: boolean;
  }) {
    return this.get('/images', params);
  }

  // Google Videos
  async googleVideos(params: {
    q: string;
    gl?: string;
    hl?: string;
    num?: number;
    page?: number;
    lr?: string;
    uule?: string;
    duration?: string;
    nfpr?: number;
    tbs?: string;
    safe?: string;
    html?: boolean;
  }) {
    return this.get('/videos', params);
  }

  // Google Finance
  async googleFinance(params: { q: string; hl?: string; html?: boolean }) {
    return this.get('/finance', params);
  }

  // Google Autocomplete
  async googleAutocomplete(params: { q: string; gl?: string; hl?: string }) {
    return this.get('/autocomplete', params);
  }

  // Google Jobs
  async googleJobs(params: {
    q: string;
    gl?: string;
    hl?: string;
    page?: number;
    chips?: string;
    lrad?: string;
  }) {
    return this.get('/jobs', params);
  }

  // YouTube Search
  async youtubeSearch(params: {
    q: string;
    gl?: string;
    hl?: string;
    sp?: string;
    html?: boolean;
  }) {
    return this.get('/youtube', params);
  }

  // Bing Search
  async bingSearch(params: {
    q: string;
    location?: string;
    lat?: string;
    long?: string;
    mkt?: string;
    cc?: string;
    first?: number;
    count?: number;
    safeSearch?: string;
    filters?: string;
  }) {
    return this.get('/bing_search', params);
  }

  // Amazon Search
  async amazonSearch(params: {
    url: string;
    premium?: boolean;
    country?: string;
    excludeSponsored?: boolean;
  }) {
    return this.get('/amazon_search', {
      url: params.url,
      premium: params.premium,
      country: params.country,
      exclude_sponsored: params.excludeSponsored
    });
  }

  // Amazon Product
  async amazonProduct(params: {
    asin: string;
    domain?: string;
    premium?: boolean;
    country?: string;
  }) {
    return this.get('/amazon_product', params);
  }

  // Amazon Reviews
  async amazonReviews(params: {
    productId: string;
    url?: string;
    page?: string;
    domain?: string;
    premium?: boolean;
    country?: string;
  }) {
    return this.get('/amazon_reviews', {
      product_id: params.productId,
      url: params.url,
      page: params.page,
      domain: params.domain,
      premium: params.premium,
      country: params.country
    });
  }

  // Walmart Product
  async walmartProduct(params: { productId: number; storeId?: number }) {
    return this.get('/walmart_product', {
      product_id: params.productId,
      store_id: params.storeId
    });
  }

  // Yelp Search
  async yelpSearch(params: {
    findLoc: string;
    findDesc?: string;
    sortBy?: string;
    start?: number;
  }) {
    return this.get('/yelp', {
      find_loc: params.findLoc,
      find_desc: params.findDesc,
      sort_by: params.sortBy,
      start: params.start
    });
  }

  // LinkedIn Jobs
  async linkedinJobs(params: {
    q: string;
    geoId: number;
    page?: number;
    jobType?: string;
    sortBy?: string;
    expLevel?: string;
  }) {
    return this.get('/linkedin_jobs', {
      q: params.q,
      geoId: params.geoId,
      page: params.page,
      job_type: params.jobType,
      sort_by: params.sortBy,
      exp_level: params.expLevel
    });
  }

  // Web Scraping
  async scrapeWebPage(params: {
    url: string;
    renderJs?: boolean;
    premium?: boolean;
    wait?: number;
    country?: string;
  }) {
    return this.get('/scrape', {
      url: params.url,
      render_js: params.renderJs,
      premium: params.premium,
      wait: params.wait,
      country: params.country
    });
  }

  // Account Info
  async getAccountInfo() {
    return this.get('/account_info');
  }
}
