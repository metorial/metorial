import { anyOf } from 'slates';

export let googleSearchConsoleScopes = {
  webmasters: 'https://www.googleapis.com/auth/webmasters',
  webmastersReadonly: 'https://www.googleapis.com/auth/webmasters.readonly',
  userInfoEmail: 'https://www.googleapis.com/auth/userinfo.email',
  userInfoProfile: 'https://www.googleapis.com/auth/userinfo.profile'
} as const;

let siteRead = anyOf(
  googleSearchConsoleScopes.webmasters,
  googleSearchConsoleScopes.webmastersReadonly
);

export let googleSearchConsoleActionScopes = {
  querySearchAnalytics: siteRead,
  listSites: siteRead,
  inspectUrl: siteRead,
  runMobileFriendlyTest: siteRead,
  manageSite: siteRead,
  manageSitemap: siteRead,
  inboundWebhook: siteRead
} as const;
