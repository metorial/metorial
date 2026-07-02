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

export let exportDataPoints = async (config: ClientConfig, params: ExportParams) => {
  let client = buildExportClient(config);

  let queryParams: Record<string, string> = {
    version: '6',
    hostname: params.hostname,
    start: params.start,
    end: params.end,
    fields: params.fields.join(',')
  };

  if (params.format) queryParams.format = params.format;
  else queryParams.format = 'json';

  if (params.type) queryParams.type = params.type;
  if (params.timezone) queryParams.timezone = params.timezone;
  if (params.robots !== undefined) queryParams.robots = String(params.robots);

  let response = await client.get('/api/export/datapoints', { params: queryParams });
  return response.data;
};
