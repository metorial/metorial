import { createAxios } from 'slates';

export interface SearchParams {
  q: string;
  searchEngine?: string;
  location?: string;
  hl?: string;
  gl?: string;
  num?: number;
  start?: number;
  tbm?: string;
  tbs?: string;
  lat?: string;
  lng?: string;
  device?: string;
}

export interface ReverseImageSearchParams {
  imageUrl: string;
  num?: number;
  start?: number;
}

export interface TrendsParams {
  keywords: string[];
  timeframe?: string;
  category?: string;
  type?: string;
  hl?: string;
  gl?: string;
}

export interface ShoppingDetailParams {
  productId: string;
  location?: string;
  hl?: string;
  gl?: string;
}

export class Client {
  private token: string;
  private searchApi;
  private v1Api;

  constructor(config: { token: string }) {
    this.token = config.token;
    this.searchApi = createAxios({
      baseURL: 'https://app.zenserp.com/api/v2',
      headers: { apikey: this.token }
    });
    this.v1Api = createAxios({
      baseURL: 'https://app.zenserp.com/api/v1',
      headers: { apikey: this.token }
    });
  }

  async search(params: SearchParams): Promise<any> {
    let queryParams: Record<string, string | number> = {
      q: params.q
    };

    if (params.searchEngine) queryParams.search_engine = params.searchEngine;
    if (params.location) queryParams.location = params.location;
    if (params.hl) queryParams.hl = params.hl;
    if (params.gl) queryParams.gl = params.gl;
    if (params.num !== undefined) queryParams.num = params.num;
    if (params.start !== undefined) queryParams.start = params.start;
    if (params.tbm) queryParams.tbm = params.tbm;
    if (params.tbs) queryParams.tbs = params.tbs;
    if (params.lat) queryParams.lat = params.lat;
    if (params.lng) queryParams.lng = params.lng;
    if (params.device) queryParams.device = params.device;

    let response = await this.searchApi.get('/search', {
      params: queryParams
    });

    return response.data;
  }

  async reverseImageSearch(params: ReverseImageSearchParams): Promise<any> {
    let queryParams: Record<string, string | number> = {
      image_url: params.imageUrl
    };

    if (params.num !== undefined) queryParams.num = params.num;
    if (params.start !== undefined) queryParams.start = params.start;

    let response = await this.searchApi.get('/search', {
      params: queryParams
    });

    return response.data;
  }

  async getTrends(params: TrendsParams): Promise<any> {
    let queryParams: Record<string, string | string[]> = {};

    queryParams['keyword[]'] = params.keywords;

    if (params.timeframe) queryParams.timeframe = params.timeframe;
    if (params.category) queryParams.cat = params.category;
    if (params.type) queryParams.type = params.type;
    if (params.hl) queryParams.hl = params.hl;
    if (params.gl) queryParams.gl = params.gl;

    let response = await this.v1Api.get('/trends', {
      params: queryParams
    });

    return response.data;
  }

  async getShoppingDetails(params: ShoppingDetailParams): Promise<any> {
    let queryParams: Record<string, string> = {
      product_id: params.productId,
      tbm: 'shop'
    };

    if (params.location) queryParams.location = params.location;
    if (params.hl) queryParams.hl = params.hl;
    if (params.gl) queryParams.gl = params.gl;

    let response = await this.v1Api.get('/shopping', {
      params: queryParams
    });

    return response.data;
  }

  async getStatus(): Promise<any> {
    let response = await this.v1Api.get('/status', {});

    return response.data;
  }
}
