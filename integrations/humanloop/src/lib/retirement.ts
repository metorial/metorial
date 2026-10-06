import { createApiServiceError } from 'slates';

export const HUMANLOOP_SUNSET_DATE = '2025-09-08';
export const HUMANLOOP_SUNSET_URL = 'https://humanloop.com/docs/changelog/2025/08';
export const HUMANLOOP_RETIREMENT_MESSAGE =
  'Humanloop shut down on September 8, 2025. Its platform and API are no longer available. Use data exported before the shutdown with your chosen replacement platform. See https://humanloop.com/docs/guides/migrating-from-humanloop.';

// The provider permanently retired every endpoint, including account setup.
export const rejectHumanloopOperation = (): never => {
  throw createApiServiceError(HUMANLOOP_RETIREMENT_MESSAGE, {
    reason: 'humanloop_platform_sunset'
  });
};
