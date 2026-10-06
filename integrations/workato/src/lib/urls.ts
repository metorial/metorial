import { createApiServiceError } from 'slates';
export const dataCenters = [
  'us',
  'eu',
  'jp',
  'sg',
  'au',
  'il',
  'cn',
  'kr',
  'uk',
  'trial'
] as const;
export type DataCenter = (typeof dataCenters)[number];
export const validateDataCenter = (value: string): DataCenter => {
  const region = dataCenters.find(region => region === value);
  if (!region)
    throw createApiServiceError('Select the documented Workato workspace data center.', {
      reason: 'invalid_data_center'
    });
  return region;
};
export const getApiBaseUrl = (value: string) => {
  const region = validateDataCenter(value);
  if (region === 'us') return 'https://www.workato.com/api';
  if (region === 'cn') return 'https://app.workatoapp.cn/api';
  return `https://app.${region}.workato.com/api`;
};
const serviceBaseUrl = (service: string, value: string) => {
  const region = validateDataCenter(value);
  if (region === 'us') return `https://${service}.workato.com`;
  if (region === 'cn') return `https://${service}.workatoapp.cn`;
  return `https://${service}.${region}.workato.com`;
};
export const getDataTablesBaseUrl = (value: string) => serviceBaseUrl('data-tables', value);
export const getEventStreamsBaseUrl = (value: string) =>
  serviceBaseUrl('event-streams', value);
