export interface SearchParams {
  query: string;
  dateContext?: string;
  location?: string;
  model?: string;
  responseLanguage?: string;
  answerType?: string;
  searchType?: string;
  returnCitations?: boolean;
  returnSources?: boolean;
  returnImages?: boolean;
  recencyFilter?: string;
}

export interface CustomSearchParams {
  systemPrompt: string;
  userPrompt: string;
  location?: string;
  model?: string;
  responseLanguage?: string;
  searchType?: string;
  temperature?: number;
  topP?: number;
  returnSources?: boolean;
  returnImages?: boolean;
  recencyFilter?: string;
}

export interface QueryFromUrlParams {
  url: string;
  query: string;
  model?: string;
  responseLanguage?: string;
  answerType?: string;
}

export interface SearchSource {
  title: string;
  url: string;
  snippet?: string;
}

export interface SearchImage {
  url: string;
  description?: string;
}

export interface SearchResponse {
  llmResponse: string;
  sources?: SearchSource[];
  images?: SearchImage[];
  responseTime?: number;
}

export interface CustomSearchResponse {
  llmResponse: string;
  sources?: SearchSource[];
  images?: SearchImage[];
  responseTime?: number;
}

export interface QueryFromUrlResponse {
  llmResponse: string;
  responseTime?: number;
}

export interface WebsiteTextResponse {
  websiteUrl: string;
  text: string;
}

export interface WebsiteMarkdownResponse {
  websiteUrl: string;
  markdown: string;
}

export interface WebsiteScreenshotResponse {
  websiteUrl: string;
  screenshotUrl: string;
}
