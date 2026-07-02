// ── SERP Live Search ──

export interface LiveSearchParams {
  q: string;
  domain: string;
  lang: string;
  device: string;
  serp_type: string;
  loc?: string;
  loc_id?: number;
  verbatim?: number;
  gfilter?: number;
  page?: number;
  num_result?: number;
  date_range?: string;
}

// ── SERP Scheduled/Batch ──

export interface ScheduleSearchParams {
  q: string;
  domain: string;
  lang: string;
  device: string;
  serp_type: string;
  loc?: string;
  loc_id?: number;
  verbatim?: number;
  gfilter?: number;
  page?: number;
  num_result?: number;
  date_range?: string;
  postback_url?: string;
  pingback_url?: string;
}

export interface ScheduleSearchResponse {
  status: string;
  msg: string;
  results: any[];
}

export interface CheckStatusResponse {
  status: string;
  msg: string;
  results: any;
}

export interface GetResultParams {
  taskId: string;
  responseType?: 'json' | 'html';
}

// ── Google Specialized APIs ──

export interface GoogleJobsParams {
  q: string;
  domain: string;
  lang: string;
  loc?: string;
  loc_id?: number;
  date_range?: string;
}

export interface GoogleVideosParams {
  q: string;
  domain: string;
  lang: string;
  device: string;
  loc?: string;
  loc_id?: number;
  date_range?: string;
  page?: number;
  video_duration?: string;
  video_quality?: string;
  video_captions?: string;
}

export interface GoogleShortVideosParams {
  q: string;
  domain: string;
  lang: string;
  device: string;
  loc?: string;
  loc_id?: number;
  date_range?: string;
  page?: number;
  video_quality?: string;
  video_captions?: string;
}

// ── Google Trends ──

export interface TrendsSearchParams {
  keywords: string;
  time: string;
  time_zone_offset: number;
  property?: string;
  category?: number;
  geo?: string;
  language_code?: string;
}

export interface TrendsScheduleParams {
  keywords: string;
  time: string;
  time_zone_offset: number;
  property?: string;
  category?: number;
  geo?: string;
  language_code?: string;
  postback_url?: string;
  pingback_url?: string;
}

// ── Location & Language ──

export interface LocationSearchParams {
  query: string;
  searchEngine: string;
}

export interface LanguageListParams {
  searchEngine: string;
}

// ── Account ──

export interface AccountInfoResponse {
  status: string;
  msg: string;
  results: {
    name?: string;
    email?: string;
    api_key?: string;
    plan?: {
      name?: string;
      type?: string;
      price?: string;
    };
    credit?: {
      available?: number;
      total?: number;
      scheduled_available?: number;
      scheduled_total?: number;
    };
    [key: string]: any;
  };
}
