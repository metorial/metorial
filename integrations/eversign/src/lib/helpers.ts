import { Client } from './client';

export let createClient = (
  config: { businessId: string; sandbox: boolean },
  auth: { token: string }
): Client => {
  return new Client({
    token: auth.token,
    businessId: config.businessId,
    sandbox: config.sandbox
  });
};
