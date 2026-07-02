let fetchBaseUrls: Record<string, string> = {
  usa: 'https://api.aglty.io',
  usa2: 'https://api-usa2.aglty.io',
  canada: 'https://api-ca.aglty.io',
  europe: 'https://api-eu.aglty.io',
  australia: 'https://api-aus.aglty.io'
};

let mgmtBaseUrls: Record<string, string> = {
  usa: 'https://mgmt.aglty.io',
  usa2: 'https://mgmt-usa2.aglty.io',
  canada: 'https://mgmt-ca.aglty.io',
  europe: 'https://mgmt-eu.aglty.io',
  australia: 'https://mgmt-aus.aglty.io'
};

export let getFetchBaseUrl = (region: string): string => {
  return fetchBaseUrls[region] ?? 'https://api.aglty.io';
};

export let getMgmtBaseUrl = (region: string): string => {
  return mgmtBaseUrls[region] ?? 'https://mgmt.aglty.io';
};
