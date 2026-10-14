import { Client } from './client';

export let createClient = (
  config: { sandbox: boolean; [key: string]: unknown },
  auth: { token: string; authType?: 'api_key' | 'oauth' },
  businessId?: string
): Client => {
  return new Client({
    token: auth.token,
    businessId:
      businessId ?? (typeof config.businessId === 'string' ? config.businessId : undefined),
    sandbox: config.sandbox,
    isOauth: auth.authType === 'oauth'
  });
};

export let asOptionalString = (value: unknown): string | undefined =>
  typeof value === 'string' || typeof value === 'number' ? String(value) : undefined;

export let asOptionalNumber = (value: unknown): number | undefined => {
  if (typeof value !== 'number' && (typeof value !== 'string' || !value.trim())) {
    return undefined;
  }
  let number = Number(value);
  return Number.isFinite(number) ? number : undefined;
};

export let isEnabled = (value: unknown): boolean =>
  value === 1 || value === '1' || value === true;
