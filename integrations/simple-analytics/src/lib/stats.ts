import { buildStatsClient, type ClientConfig } from './client';

export interface StatsParams {
  hostname: string;
  fields?: string[];
  start?: string;
  end?: string;
  timezone?: string;
  limit?: number;
  interval?: string;
  page?: string;
  country?: string;
  referrer?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
  browserName?: string;
  osName?: string;
  deviceType?: string;
}

export let getStats = async (config: ClientConfig, params: StatsParams) => {
  let client = buildStatsClient(config);

  let queryParams: Record<string, string> = {
    version: '6',
    info: 'false'
  };

  if (params.fields && params.fields.length > 0) {
    queryParams.fields = params.fields.join(',');
  }
  if (params.start) queryParams.start = params.start;
  if (params.end) queryParams.end = params.end;
  if (params.timezone) queryParams.timezone = params.timezone;
  if (params.limit !== undefined) queryParams.limit = String(params.limit);
  if (params.interval) queryParams.interval = params.interval;
  if (params.page) queryParams.page = params.page;
  if (params.country) queryParams.country = params.country;
  if (params.referrer) queryParams.referrer = params.referrer;
  if (params.utmSource) queryParams.utm_source = params.utmSource;
  if (params.utmMedium) queryParams.utm_medium = params.utmMedium;
  if (params.utmCampaign) queryParams.utm_campaign = params.utmCampaign;
  if (params.utmContent) queryParams.utm_content = params.utmContent;
  if (params.utmTerm) queryParams.utm_term = params.utmTerm;
  if (params.browserName) queryParams.browser_name = params.browserName;
  if (params.osName) queryParams.os_name = params.osName;
  if (params.deviceType) queryParams.device_type = params.deviceType;

  let response = await client.get(`/${params.hostname}.json`, { params: queryParams });
  return response.data;
};

export interface EventsParams {
  hostname: string;
  events?: string[];
  start?: string;
  end?: string;
  timezone?: string;
}

export let getEvents = async (config: ClientConfig, params: EventsParams) => {
  let client = buildStatsClient(config);

  let queryParams: Record<string, string> = {
    version: '6',
    info: 'false'
  };

  if (params.events && params.events.length > 0) {
    queryParams.events = params.events.join(',');
  } else {
    queryParams.events = '*';
  }
  if (params.start) queryParams.start = params.start;
  if (params.end) queryParams.end = params.end;
  if (params.timezone) queryParams.timezone = params.timezone;

  let response = await client.get(`/${params.hostname}.json`, { params: queryParams });
  return response.data;
};
