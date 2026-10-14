import { pickDefined } from 'slates';
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
  let body = pickDefined({
    hostname: params.hostname,
    timezone: params.timezone,
    public: params.isPublic,
    label: params.label
  });

  let response = await client.post('/api/websites/add', body);
  return response.data;
};
