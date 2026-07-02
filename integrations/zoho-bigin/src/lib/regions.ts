export type ZohoRegion = 'us' | 'eu' | 'au' | 'in' | 'cn' | 'jp' | 'sa' | 'ca';

let accountsUrls: Record<ZohoRegion, string> = {
  us: 'https://accounts.zoho.com',
  eu: 'https://accounts.zoho.eu',
  au: 'https://accounts.zoho.com.au',
  in: 'https://accounts.zoho.in',
  cn: 'https://accounts.zoho.com.cn',
  jp: 'https://accounts.zoho.com',
  sa: 'https://accounts.zoho.com',
  ca: 'https://accounts.zohocloud.ca'
};

let apiDomains: Record<ZohoRegion, string> = {
  us: 'https://www.zohoapis.com',
  eu: 'https://www.zohoapis.eu',
  au: 'https://www.zohoapis.com.au',
  in: 'https://www.zohoapis.in',
  cn: 'https://www.zohoapis.com.cn',
  jp: 'https://www.zohoapis.jp',
  sa: 'https://www.zohoapis.sa',
  ca: 'https://www.zohoapis.ca'
};

export let getAccountsUrl = (region: ZohoRegion): string => {
  return accountsUrls[region] || accountsUrls.us;
};

export let getApiDomain = (region: ZohoRegion): string => {
  return apiDomains[region] || apiDomains.us;
};
