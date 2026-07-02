import { Client } from './client';

export interface AuthOutput {
  token: string;
  refreshToken?: string;
  expiresAt?: string;
  instanceName: string;
}

export interface ConfigOutput {
  instanceName: string;
}

export let createClient = (auth: AuthOutput, config: ConfigOutput): Client => {
  let isBasicAuth = !auth.refreshToken && !auth.expiresAt;

  return new Client({
    token: auth.token,
    instanceName: auth.instanceName || config.instanceName,
    authType: isBasicAuth ? 'basic' : 'oauth'
  });
};
