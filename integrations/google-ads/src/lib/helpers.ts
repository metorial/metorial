import { GoogleAdsClient } from './client';

export interface AuthOutput {
  token: string;
  refreshToken?: string;
  expiresAt?: string;
  developerToken: string;
}

export interface ConfigOutput {
  loginCustomerId?: string;
}

export let createClient = (auth: AuthOutput, config: ConfigOutput): GoogleAdsClient => {
  return new GoogleAdsClient({
    token: auth.token,
    developerToken: auth.developerToken,
    loginCustomerId: config.loginCustomerId
  });
};
