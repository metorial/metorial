import { ChatworkClient } from './client';

export let createClient = (auth: {
  token: string;
  refreshToken?: string;
  expiresAt?: string;
  authType?: 'oauth' | 'api_token';
}): ChatworkClient => {
  let authType =
    auth.authType ?? (auth.refreshToken || auth.expiresAt ? 'oauth' : 'api_token');
  return new ChatworkClient(auth.token, authType);
};
