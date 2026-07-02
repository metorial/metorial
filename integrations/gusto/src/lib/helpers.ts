let BASE_URLS: Record<string, string> = {
  production: 'https://api.gusto.com',
  demo: 'https://api.gusto-demo.com'
};

export let getBaseUrl = (environment?: string): string => {
  return BASE_URLS[environment || 'production'] || BASE_URLS.production!;
};
