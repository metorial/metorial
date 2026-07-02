import { SquareClient } from './client';

export let createClient = (
  auth: { token: string },
  config: { environment: 'production' | 'sandbox' }
) => {
  return new SquareClient({
    token: auth.token,
    environment: config.environment
  });
};

export let generateIdempotencyKey = (): string => {
  return crypto.randomUUID();
};
