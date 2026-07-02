import { Client } from './client';

export let createClient = (
  config: { token: string },
  appConfig: { siteUrl?: string; appTitle?: string }
): Client => {
  return new Client({
    token: config.token,
    siteUrl: appConfig.siteUrl,
    appTitle: appConfig.appTitle
  });
};
