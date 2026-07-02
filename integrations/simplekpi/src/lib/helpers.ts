import { Client } from './client';

export let createClient = (
  config: { subdomain: string },
  auth: { email: string; token: string }
) => {
  return new Client({
    subdomain: config.subdomain,
    email: auth.email,
    token: auth.token
  });
};
