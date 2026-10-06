import { createApiServiceError } from 'slates';

export type Region = 'eu' | 'us' | 'ca' | 'ap' | 'cn';
const hosts = {
  eu: 'mapi.storyblok.com',
  us: 'api-us.storyblok.com',
  ca: 'api-ca.storyblok.com',
  ap: 'api-ap.storyblok.com',
  cn: 'app.storyblokchina.cn'
};
export function getBaseUrl(region: string): string {
  if (!Object.hasOwn(hosts, region))
    throw createApiServiceError(
      'Select a supported Storyblok credential region: eu, us, ca, ap or cn.',
      { reason: 'invalid_region' }
    );
  return `https://${hosts[region as Region]}/v1`;
}
export function getOAuthBaseUrl(region: Region) {
  // The current official app-extension-auth client uses region-helper's API hosts.
  return region === 'eu'
    ? 'https://api.storyblok.com/oauth'
    : `${getBaseUrl(region).slice(0, -3)}/oauth`;
}
