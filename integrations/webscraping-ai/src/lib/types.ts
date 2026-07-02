export interface ScrapingOptions {
  url: string;
  js?: boolean;
  jsTimeout?: number;
  timeout?: number;
  waitFor?: string;
  proxy?: 'datacenter' | 'residential';
  country?: string;
  device?: 'desktop' | 'mobile' | 'tablet';
  headers?: Record<string, string>;
  jsScript?: string;
  customProxy?: string;
  errorOn404?: boolean;
  errorOnRedirect?: boolean;
}

export interface HtmlGetOptions extends ScrapingOptions {}

export interface HtmlPostOptions extends ScrapingOptions {
  body?: string;
}

export interface TextOptions extends ScrapingOptions {
  textFormat?: 'plain' | 'json' | 'xml';
  returnLinks?: boolean;
}

export interface SelectedOptions extends ScrapingOptions {
  selector: string;
}

export interface SelectedMultipleOptions extends ScrapingOptions {
  selectors: string[];
}

export interface AiQuestionOptions extends ScrapingOptions {
  question: string;
}

export interface AiFieldsOptions extends ScrapingOptions {
  fields: Record<string, string>;
}

export interface AccountInfo {
  email: string;
  remainingApiCalls: number;
  resetsAt: string;
  remainingConcurrency: number;
}
