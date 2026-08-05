export type Datacenter = 'us' | 'eu' | 'in' | 'au' | 'jp' | 'ca' | 'sa' | 'uk';

// Canada uses the zohocloud.ca domain for everything except the API domain (accounts.zoho.ca is NXDOMAIN).
let accountsUrls: Record<Datacenter, string> = {
  us: 'https://accounts.zoho.com',
  eu: 'https://accounts.zoho.eu',
  in: 'https://accounts.zoho.in',
  au: 'https://accounts.zoho.com.au',
  jp: 'https://accounts.zoho.jp',
  ca: 'https://accounts.zohocloud.ca',
  sa: 'https://accounts.zoho.sa',
  uk: 'https://accounts.zoho.uk'
};

let apiBaseUrls: Record<Datacenter, string> = {
  us: 'https://www.zohoapis.com',
  eu: 'https://www.zohoapis.eu',
  in: 'https://www.zohoapis.in',
  au: 'https://www.zohoapis.com.au',
  jp: 'https://www.zohoapis.jp',
  ca: 'https://www.zohoapis.ca',
  sa: 'https://www.zohoapis.sa',
  uk: 'https://www.zohoapis.uk'
};

let deskBaseUrls: Record<Datacenter, string> = {
  us: 'https://desk.zoho.com',
  eu: 'https://desk.zoho.eu',
  in: 'https://desk.zoho.in',
  au: 'https://desk.zoho.com.au',
  jp: 'https://desk.zoho.jp',
  ca: 'https://desk.zohocloud.ca',
  sa: 'https://desk.zoho.sa',
  uk: 'https://desk.zoho.uk'
};

let peopleBaseUrls: Record<Datacenter, string> = {
  us: 'https://people.zoho.com',
  eu: 'https://people.zoho.eu',
  in: 'https://people.zoho.in',
  au: 'https://people.zoho.com.au',
  jp: 'https://people.zoho.jp',
  ca: 'https://people.zohocloud.ca',
  sa: 'https://people.zoho.sa',
  uk: 'https://people.zoho.uk'
};

let projectsBaseUrls: Record<Datacenter, string> = {
  us: 'https://projectsapi.zoho.com',
  eu: 'https://projectsapi.zoho.eu',
  in: 'https://projectsapi.zoho.in',
  au: 'https://projectsapi.zoho.com.au',
  jp: 'https://projectsapi.zoho.jp',
  ca: 'https://projectsapi.zohocloud.ca',
  sa: 'https://projectsapi.zoho.sa',
  uk: 'https://projectsapi.zoho.uk'
};

let locationToDatacenter: Record<string, Datacenter> = {
  us: 'us',
  eu: 'eu',
  in: 'in',
  au: 'au',
  jp: 'jp',
  ca: 'ca',
  sa: 'sa',
  uk: 'uk'
};

export let getAccountsUrl = (dc: Datacenter): string => accountsUrls[dc];
export let getApiBaseUrl = (dc: Datacenter): string => apiBaseUrls[dc];
export let getDeskBaseUrl = (dc: Datacenter): string => deskBaseUrls[dc];
export let getPeopleBaseUrl = (dc: Datacenter): string => peopleBaseUrls[dc];
export let getProjectsBaseUrl = (dc: Datacenter): string => projectsBaseUrls[dc];

export let datacenterFromLocation = (location: string): Datacenter => {
  return locationToDatacenter[location] ?? 'us';
};

export let datacenterFromApiDomain = (apiDomain?: string): Datacenter | undefined => {
  if (!apiDomain) return undefined;

  for (let [dc, baseUrl] of Object.entries(apiBaseUrls)) {
    if (apiDomain.startsWith(baseUrl)) {
      return dc as Datacenter;
    }
  }

  return undefined;
};
