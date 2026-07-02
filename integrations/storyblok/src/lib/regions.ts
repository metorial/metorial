let regionBaseUrls: Record<string, string> = {
  eu: 'https://mapi.storyblok.com/v1',
  us: 'https://api-us.storyblok.com/v1',
  ca: 'https://api-ca.storyblok.com/v1',
  ap: 'https://api-ap.storyblok.com/v1',
  cn: 'https://app.storyblokchina.cn/v1'
};

export let getBaseUrl = (region: string): string => {
  return regionBaseUrls[region] || regionBaseUrls.eu!;
};
