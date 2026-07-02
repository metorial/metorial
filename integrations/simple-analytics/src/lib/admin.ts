import { buildAdminClient, type ClientConfig } from './client';

export let listWebsites = async (config: ClientConfig) => {
  let client = buildAdminClient(config);
  let response = await client.get('/api/websites');
  return response.data;
};

export interface AddWebsiteParams {
  hostname: string;
  timezone?: string;
  isPublic?: boolean;
  label?: string;
}

export let addWebsite = async (config: ClientConfig, params: AddWebsiteParams) => {
  let client = buildAdminClient(config);
  let body: Record<string, unknown> = {
    hostname: params.hostname
  };
  if (params.timezone) body.timezone = params.timezone;
  if (params.isPublic !== undefined) body.public = params.isPublic;
  if (params.label) body.label = params.label;

  let response = await client.post('/api/websites/add', body);
  return response.data;
};
