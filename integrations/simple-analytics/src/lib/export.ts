import { createApiServiceError } from 'slates';
import { z } from 'zod';
import { buildExportClient, type ClientConfig } from './client';

export interface ExportParams {
  hostname: string;
  start: string;
  end: string;
  fields: string[];
  format?: string;
  type?: string;
  timezone?: string;
  robots?: boolean;
}

export let buildExportQuery = (params: ExportParams) => {
  if (params.fields.length === 0) {
    throw createApiServiceError('Select at least one field to export.');
  }

  let datePattern = /^\d{4}-\d{2}-\d{2}(?:T(?:[01]\d|2[0-3]))?$/;
  let hourlyPrefix = /^\d{4}-\d{2}-\d{2}T/;
  let isHourly = hourlyPrefix.test(params.start) || hourlyPrefix.test(params.end);
  if (
    isHourly &&
    (!datePattern.test(params.start) ||
      !datePattern.test(params.end) ||
      !params.start.includes('T') ||
      !params.end.includes('T') ||
      params.start.slice(0, 10) !== params.end.slice(0, 10))
  ) {
    throw createApiServiceError(
      'Hourly exports require YYYY-MM-DDTHH in both dates, hours between 00 and 23, and a single day.'
    );
  }
  if (
    datePattern.test(params.start) &&
    datePattern.test(params.end) &&
    params.start > params.end
  ) {
    throw createApiServiceError('The export start date must not be after the end date.');
  }

  let queryParams: Record<string, string> = {
    version: '6',
    hostname: params.hostname,
    start: params.start,
    end: params.end,
    fields: [
      ...new Set(
        params.fields.map(field =>
          field === 'scroll_percentage' ? 'scrolled_percentage' : field
        )
      )
    ].join(',')
  };

  if (params.format) queryParams.format = params.format;
  else queryParams.format = 'json';

  if (params.type) queryParams.type = params.type;
  if (params.timezone) queryParams.timezone = params.timezone;
  if (params.robots !== undefined) queryParams.robots = String(params.robots);

  return queryParams;
};

export let getExportDownloadDetails = (config: ClientConfig, params: ExportParams) => {
  if (!config.userId) {
    throw createApiServiceError(
      'User-Id is required for the Export API. Please provide your Simple Analytics User ID in the authentication settings.'
    );
  }

  return {
    url: 'https://simpleanalytics.com/api/export/datapoints',
    headers: { 'Api-Key': config.token, 'User-Id': config.userId },
    query: buildExportQuery(params)
  };
};

export let exportDataPoints = async (config: ClientConfig, params: ExportParams) => {
  let client = buildExportClient(config);
  let response = await client.get('/api/export/datapoints', {
    params: buildExportQuery(params)
  });
  let rawData = Array.isArray(response.data) ? response.data : response.data?.data;
  let parsed = z.array(z.record(z.string(), z.unknown())).safeParse(rawData);
  if (!parsed.success) {
    throw createApiServiceError(
      'Simple Analytics returned an unexpected raw export response.'
    );
  }

  if (params.fields.includes('scroll_percentage')) {
    return parsed.data.map(point =>
      point.scroll_percentage === undefined && point.scrolled_percentage !== undefined
        ? { ...point, scroll_percentage: point.scrolled_percentage }
        : point
    );
  }
  return parsed.data;
};
