type DataCenter = 'us' | 'eu' | 'jp' | 'sg' | 'au';

let apiBaseUrls: Record<DataCenter, string> = {
  us: 'https://www.workato.com/api',
  eu: 'https://app.eu.workato.com/api',
  jp: 'https://app.jp.workato.com/api',
  sg: 'https://app.sg.workato.com/api',
  au: 'https://app.au.workato.com/api'
};

let dataTablesBaseUrls: Record<DataCenter, string> = {
  us: 'https://data-tables.workato.com',
  eu: 'https://data-tables.eu.workato.com',
  jp: 'https://data-tables.jp.workato.com',
  sg: 'https://data-tables.sg.workato.com',
  au: 'https://data-tables.au.workato.com'
};

let eventStreamsBaseUrls: Record<DataCenter, string> = {
  us: 'https://event-streams.workato.com',
  eu: 'https://event-streams.eu.workato.com',
  jp: 'https://event-streams.jp.workato.com',
  sg: 'https://event-streams.sg.workato.com',
  au: 'https://event-streams.au.workato.com'
};

export let getApiBaseUrl = (dc: string): string => {
  return apiBaseUrls[dc as DataCenter] ?? apiBaseUrls.us;
};

export let getDataTablesBaseUrl = (dc: string): string => {
  return dataTablesBaseUrls[dc as DataCenter] ?? dataTablesBaseUrls.us;
};

export let getEventStreamsBaseUrl = (dc: string): string => {
  return eventStreamsBaseUrls[dc as DataCenter] ?? eventStreamsBaseUrls.us;
};
