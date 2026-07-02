import { WixClient } from './client';

export interface WixAuthConfig {
  token: string;
  siteId?: string;
  accountId?: string;
}

export interface WixConfig {
  siteId?: string;
  accountId?: string;
}

export let createWixClient = (auth: WixAuthConfig, config: WixConfig): WixClient => {
  return new WixClient({
    token: auth.token,
    siteId: auth.siteId || config.siteId,
    accountId: auth.accountId || config.accountId
  });
};
