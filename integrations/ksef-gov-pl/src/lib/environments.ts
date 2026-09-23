import { createApiServiceError } from 'slates';

export const KSEF_API_BASE_URLS = {
  TEST: 'https://api-test.ksef.mf.gov.pl/v2',
  DEMO: 'https://api-demo.ksef.mf.gov.pl/v2',
  PRODUCTION: 'https://api.ksef.mf.gov.pl/v2'
} as const;

export type KsefEnvironment = keyof typeof KSEF_API_BASE_URLS;

export function getKsefBaseUrl(environment: KsefEnvironment): string {
  const baseUrl = KSEF_API_BASE_URLS[environment];
  if (!baseUrl) {
    throw createApiServiceError('Select TEST, DEMO, or PRODUCTION as the KSeF environment.', {
      reason: 'ksef_invalid_environment'
    });
  }
  return baseUrl;
}
