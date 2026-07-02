export let regionToApiDomain = (region: string): string => {
  let map: Record<string, string> = {
    com: 'www.zohoapis.com',
    eu: 'www.zohoapis.eu',
    in: 'www.zohoapis.in',
    'com.au': 'www.zohoapis.com.au',
    jp: 'www.zohoapis.jp',
    ca: 'www.zohoapis.ca'
  };
  return map[region] ?? 'www.zohoapis.com';
};
