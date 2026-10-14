import { createApiServiceError } from 'slates';
import { buildStatsClient, type ClientConfig } from './client';

let applyMetadataFilters = (
  queryParams: Record<string, string>,
  filters?: Record<string, string | number | boolean>
) => {
  for (let [key, value] of Object.entries(filters ?? {})) {
    if (!/^[a-zA-Z0-9_]+$/.test(key)) {
      throw createApiServiceError(
        'Metadata filter keys may contain only letters, numbers, and underscores. Use the key without its storage type suffix.'
      );
    }
    queryParams[`metadata.${key}`] = String(value);
  }
};

export interface StatsParams {
  hostname: string;
  fields?: string[];
  start?: string;
  end?: string;
  timezone?: string;
  limit?: number;
  interval?: string;
  page?: string;
  pages?: string[];
  metadataFilters?: Record<string, string | number | boolean>;
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
  if (
    params.limit !== undefined &&
    (!Number.isInteger(params.limit) || params.limit < 1 || params.limit > 1000)
  ) {
    throw createApiServiceError('The statistics limit must be a whole number from 1 to 1000.');
  }
  if (params.page !== undefined && params.pages !== undefined) {
    throw createApiServiceError('Use either page or pages for the page filter, not both.');
  }
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
  if (params.pages?.length) queryParams.pages = params.pages.join(',');
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
  applyMetadataFilters(queryParams, params.metadataFilters);

  let response = await client.get(`/${params.hostname}.json`, { params: queryParams });
  return response.data;
};

export interface EventsParams {
  hostname: string;
  events?: string[];
  start?: string;
  end?: string;
  timezone?: string;
  pages?: string[];
  metadataFilters?: Record<string, string | number | boolean>;
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
  if (params.pages?.length) queryParams.pages = params.pages.join(',');
  applyMetadataFilters(queryParams, params.metadataFilters);

  let response = await client.get(`/${params.hostname}.json`, { params: queryParams });
  return response.data;
};
