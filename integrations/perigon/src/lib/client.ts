import { createAxios } from 'slates';

let BASE_URL = 'https://api.perigon.io/v1';

export class PerigonClient {
  private axios;

  constructor(token: string) {
    this.axios = createAxios({
      baseURL: BASE_URL,
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  async searchArticles(params: ArticleSearchParams) {
    let response = await this.axios.get('/all', { params: this.cleanParams(params) });
    return response.data as ArticlesResponse;
  }

  async searchStories(params: StorySearchParams) {
    let response = await this.axios.get('/stories/all', { params: this.cleanParams(params) });
    return response.data as StoriesResponse;
  }

  async searchPeople(params: PeopleSearchParams) {
    let response = await this.axios.get('/people/all', { params: this.cleanParams(params) });
    return response.data as PeopleResponse;
  }

  async searchCompanies(params: CompanySearchParams) {
    let response = await this.axios.get('/companies/all', {
      params: this.cleanParams(params)
    });
    return response.data as CompaniesResponse;
  }

  async searchJournalists(params: JournalistSearchParams) {
    let response = await this.axios.get('/journalists/all', {
      params: this.cleanParams(params)
    });
    return response.data as JournalistsResponse;
  }

  async getJournalistById(journalistId: string) {
    let response = await this.axios.get(`/journalists/${journalistId}`);
    return response.data as JournalistDetail;
  }

  async searchSources(params: SourceSearchParams) {
    let response = await this.axios.get('/sources', { params: this.cleanParams(params) });
    return response.data as SourcesResponse;
  }

  async searchTopics(params: TopicSearchParams) {
    let response = await this.axios.get('/topics', { params: this.cleanParams(params) });
    return response.data as TopicsResponse;
  }

  async searchWikipedia(params: WikipediaSearchParams) {
    let response = await this.axios.get('/wikipedia', { params: this.cleanParams(params) });
    return response.data as WikipediaResponse;
  }

  private cleanParams(params: object): Record<string, unknown> {
    let cleaned: Record<string, unknown> = {};
    for (let [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== '') {
        cleaned[key] = value;
      }
    }
    return cleaned;
  }
}

// --- Request parameter types ---

export interface ArticleSearchParams {
  q?: string;
  title?: string;
  description?: string;
  from?: string;
  to?: string;
  addDateFrom?: string;
  addDateTo?: string;
  source?: string;
  excludeSource?: string;
  sourceGroup?: string;
  category?: string;
  excludeCategory?: string;
  topic?: string;
  country?: string;
  excludeCountry?: string;
  language?: string;
  label?: string;
  excludeLabel?: string;
  personName?: string;
  companyName?: string;
  companyDomain?: string;
  city?: string;
  state?: string;
  clusterId?: string;
  showReprints?: boolean;
  sortBy?: string;
  page?: number;
  size?: number;
}

export interface StorySearchParams {
  q?: string;
  from?: string;
  to?: string;
  source?: string;
  sourceGroup?: string;
  category?: string;
  topic?: string;
  country?: string;
  language?: string;
  personName?: string;
  companyName?: string;
  showDuplicates?: boolean;
  sortBy?: string;
  page?: number;
  size?: number;
}

export interface PeopleSearchParams {
  name?: string;
  page?: number;
  size?: number;
}

export interface CompanySearchParams {
  name?: string;
  page?: number;
  size?: number;
}

export interface JournalistSearchParams {
  name?: string;
  page?: number;
  size?: number;
}

export interface SourceSearchParams {
  name?: string;
  domain?: string;
  country?: string;
  category?: string;
  language?: string;
  paywall?: boolean;
  sortBy?: string;
  page?: number;
  size?: number;
}

export interface TopicSearchParams {
  page?: number;
  size?: number;
}

export interface WikipediaSearchParams {
  q?: string;
  language?: string;
  sortBy?: string;
  pageviewsFrom?: number;
  wikidataId?: string;
  wikidataInstanceOfLabel?: string;
  category?: string;
  withPageviews?: boolean;
  page?: number;
  size?: number;
}

// --- Response types ---

export interface ArticlesResponse {
  status: number;
  numResults: number;
  articles: Article[];
}

export interface Article {
  articleId: string;
  title: string;
  description: string;
  url: string;
  imageUrl: string;
  authorsByline: string;
  matchedAuthors: Array<{ id: string | null; name: string }>;
  pubDate: string;
  addDate: string;
  source: { domain: string; paywall: boolean | null };
  country: string;
  language: string;
  score: number;
  clusterId: string;
  reprint: boolean;
  reprintGroupId: string;
  categories: Array<{ name: string }>;
  topics: Array<{ name: string }>;
  companies: Array<{ id: string; name: string; domains: string[]; mentions: number }>;
  people: Array<{ wikidataId: string; name: string; mentions: number }>;
  sentiment: { positive: number; negative: number; neutral: number };
  labels: string[];
  keywords: Array<{ name: string; weight: number }>;
  entities: Array<{ data: string; type: string; mentions: number }>;
  summary: string;
}

export interface StoriesResponse {
  status: number;
  numResults: number;
  results: Story[];
}

export interface Story {
  id: string;
  name: string;
  summary: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  initializedAt: string;
  uniqueCount: number;
  reprintCount: number;
  totalCount: number;
  categories: Array<{ name: string; count: number }>;
  topics: Array<{ name: string; count: number }>;
  people: Array<{ wikidataId: string; name: string; count: number }>;
  companies: Array<{ id: string; name: string; count: number }>;
  countries: Array<{ name: string; count: number }>;
  keyArticle: Article | null;
}

export interface PeopleResponse {
  status: number;
  numResults: number;
  results: Person[];
}

export interface Person {
  wikidataId: string;
  name: string;
  description: string;
  aliases: string[];
  occupation: Array<{ wikidataId: string; label: string }>;
  position: Array<{
    wikidataId: string;
    label: string;
    startTime: string;
    endTime: string;
    employer: { wikidataId: string; label: string } | null;
  }>;
}

export interface CompaniesResponse {
  status: number;
  numResults: number;
  results: Company[];
}

export interface Company {
  id: string;
  name: string;
  altNames: string[];
  domains: string[];
  description: string;
  ceo: string;
  industry: string;
  sector: string;
  country: string;
  fullTimeEmployees: number;
  address: string;
  city: string;
  state: string;
  zip: string;
}

export interface JournalistsResponse {
  status: number;
  numResults: number;
  results: Journalist[];
}

export interface Journalist {
  id: string;
  name: string;
  title: string;
  bio: string;
  twitterHandle: string;
  location: string;
  topSources: Array<{ name: string; domain: string; count: number }>;
  topCountries: Array<{ name: string; count: number }>;
  topCategories: Array<{ name: string; count: number }>;
  topTopics: Array<{ name: string; count: number }>;
  avgMonthlyPosts: number;
}

export interface JournalistDetail {
  status: number;
  id: string;
  name: string;
  title: string;
  bio: string;
  twitterHandle: string;
  location: string;
  topSources: Array<{ name: string; domain: string; count: number }>;
  topCountries: Array<{ name: string; count: number }>;
  topCategories: Array<{ name: string; count: number }>;
  topTopics: Array<{ name: string; count: number }>;
  avgMonthlyPosts: number;
}

export interface SourcesResponse {
  status: number;
  numResults: number;
  results: Source[];
}

export interface Source {
  id: string;
  domain: string;
  name: string;
  altNames: string[];
  description: string;
  paywall: boolean | null;
  avgMonthlyPosts: number;
  topCategories: Array<{ name: string; count: number }>;
  topTopics: Array<{ name: string; count: number }>;
}

export interface TopicsResponse {
  status: number;
  numResults: number;
  results: Topic[];
}

export interface Topic {
  name: string;
}

export interface WikipediaResponse {
  status: number;
  numResults: number;
  results: WikipediaPage[];
}

export interface WikipediaPage {
  title: string;
  summary: string;
  content: string;
  pageviews: number;
  wikidataId: string;
  wikiCode: string;
  wikiRevisionTs: string;
  wikidataInstanceOf: string[];
  categories: string[];
}
