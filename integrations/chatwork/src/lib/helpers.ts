import { ChatworkClient } from './client';

export let createClient = (auth: {
  token: string;
  refreshToken?: string;
  expiresAt?: string;
}): ChatworkClient => {
  let isOauth = !!auth.refreshToken || !!auth.expiresAt;
  return new ChatworkClient(auth.token, isOauth ? 'oauth' : 'api_token');
};
