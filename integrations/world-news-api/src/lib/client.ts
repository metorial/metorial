import { createAxios } from 'slates';

export interface SearchNewsParams {
  text?: string;
  textMatchIndexes?: string;
  sourceCountry?: string;
  language?: string;
  minSentiment?: number;
  maxSentiment?: number;
  earliestPublishDate?: string;
  latestPublishDate?: string;
  newsSources?: string;
  authors?: string;
  categories?: string;
  entities?: string;
  locationFilter?: string;
  sort?: string;
  sortDirection?: string;
  offset?: number;
  number?: number;
}

export interface NewsArticle {
  id: number;
  title: string;
  text: string;
  summary: string;
  url: string;
  image: string | null;
  video: string | null;
  publish_date: string;
  authors: string[];
  category: string | null;
  language: string;
  source_country: string;
  sentiment: number | null;
}

export interface SearchNewsResponse {
  offset: number;
  number: number;
  available: number;
  news: NewsArticle[];
}

export interface TopNewsCluster {
  news: NewsArticle[];
}

export interface TopNewsResponse {
  top_news: TopNewsCluster[];
  language: string;
  country: string;
}

export interface FrontPageResponse {
  front_page: {
    name: string;
    date: string;
    language: string;
    country: string;
    image: string;
  };
}

export interface ExtractNewsResponse {
  title: string;
  text: string;
  url: string;
  image: string | null;
  images: Array<{
    url: string;
    width: number | null;
    height: number | null;
    caption: string | null;
  }>;
  video: string | null;
  videos: Array<{
    url: string;
    summary: string | null;
    duration: number | null;
    thumbnail: string | null;
  }>;
  publish_date: string;
  authors: string[];
  language: string;
  source_country: string;
  sentiment: number | null;
}

export interface NewsSource {
  url: string;
  name: string;
  language: string;
}

export interface SearchSourcesResponse {
  available: number;
  sources: NewsSource[];
}

export interface GeoCoordinatesResponse {
  latitude: number;
  longitude: number;
  city: string | null;
}

export interface ExtractLinksResponse {
  news_links: string[];
}

export interface RetrieveNewsResponse {
  news: NewsArticle[];
}

export class Client {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: { token: string }) {
    this.axios = createAxios({
      baseURL: 'https://api.worldnewsapi.com',
      headers: {
        'x-api-key': config.token
      }
    });
  }

  async searchNews(params: SearchNewsParams): Promise<SearchNewsResponse> {
    let queryParams: Record<string, string | number> = {};

    if (params.text) queryParams.text = params.text;
    if (params.textMatchIndexes) queryParams['text-match-indexes'] = params.textMatchIndexes;
    if (params.sourceCountry) queryParams['source-country'] = params.sourceCountry;
    if (params.language) queryParams.language = params.language;
    if (params.minSentiment !== undefined) queryParams['min-sentiment'] = params.minSentiment;
    if (params.maxSentiment !== undefined) queryParams['max-sentiment'] = params.maxSentiment;
    if (params.earliestPublishDate)
      queryParams['earliest-publish-date'] = params.earliestPublishDate;
    if (params.latestPublishDate)
      queryParams['latest-publish-date'] = params.latestPublishDate;
    if (params.newsSources) queryParams['news-sources'] = params.newsSources;
    if (params.authors) queryParams.authors = params.authors;
    if (params.categories) queryParams.categories = params.categories;
    if (params.entities) queryParams.entities = params.entities;
    if (params.locationFilter) queryParams['location-filter'] = params.locationFilter;
    if (params.sort) queryParams.sort = params.sort;
    if (params.sortDirection) queryParams['sort-direction'] = params.sortDirection;
    if (params.offset !== undefined) queryParams.offset = params.offset;
    if (params.number !== undefined) queryParams.number = params.number;

    let response = await this.axios.get<SearchNewsResponse>('/search-news', {
      params: queryParams
    });
    return response.data;
  }

  async getTopNews(params: {
    sourceCountry: string;
    language: string;
    date?: string;
    headlinesOnly?: boolean;
    maxNewsPerCluster?: number;
  }): Promise<TopNewsResponse> {
    let queryParams: Record<string, string | number | boolean> = {
      'source-country': params.sourceCountry,
      language: params.language
    };

    if (params.date) queryParams.date = params.date;
    if (params.headlinesOnly !== undefined)
      queryParams['headlines-only'] = params.headlinesOnly;
    if (params.maxNewsPerCluster !== undefined)
      queryParams['max-news-per-cluster'] = params.maxNewsPerCluster;

    let response = await this.axios.get<TopNewsResponse>('/top-news', {
      params: queryParams
    });
    return response.data;
  }

  async retrieveNews(ids: number[]): Promise<RetrieveNewsResponse> {
    let response = await this.axios.get<RetrieveNewsResponse>('/retrieve-news', {
      params: {
        ids: ids.join(',')
      }
    });
    return response.data;
  }

  async extractNews(params: { url: string; analyze?: boolean }): Promise<ExtractNewsResponse> {
    let queryParams: Record<string, string | boolean> = {
      url: params.url
    };
    if (params.analyze !== undefined) queryParams.analyze = params.analyze;

    let response = await this.axios.get<ExtractNewsResponse>('/extract-news', {
      params: queryParams
    });
    return response.data;
  }

  async extractNewsLinks(params: {
    url: string;
    prefix?: string;
    subDomain?: boolean;
  }): Promise<ExtractLinksResponse> {
    let queryParams: Record<string, string | boolean> = {
      url: params.url
    };
    if (params.prefix) queryParams.prefix = params.prefix;
    if (params.subDomain !== undefined) queryParams['sub-domain'] = params.subDomain;

    let response = await this.axios.get<ExtractLinksResponse>('/extract-news-links', {
      params: queryParams
    });
    return response.data;
  }

  async searchNewsSources(name: string): Promise<SearchSourcesResponse> {
    let response = await this.axios.get<SearchSourcesResponse>('/search-news-sources', {
      params: { name }
    });
    return response.data;
  }

  async getGeoCoordinates(location: string): Promise<GeoCoordinatesResponse> {
    let response = await this.axios.get<GeoCoordinatesResponse>('/geo-coordinates', {
      params: { location }
    });
    return response.data;
  }

  async retrieveFrontPage(params: {
    sourceCountry?: string;
    sourceName?: string;
    date?: string;
  }): Promise<FrontPageResponse> {
    let queryParams: Record<string, string> = {};
    if (params.sourceCountry) queryParams['source-country'] = params.sourceCountry;
    if (params.sourceName) queryParams['source-name'] = params.sourceName;
    if (params.date) queryParams.date = params.date;

    let response = await this.axios.get<FrontPageResponse>('/retrieve-front-page', {
      params: queryParams
    });
    return response.data;
  }
}
