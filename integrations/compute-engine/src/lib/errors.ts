import { buildApiServiceError, createApiServiceError } from 'slates';

export let computeEngineApiError = (error: unknown, operation = 'request') =>
  buildApiServiceError(error, {
    providerLabel: 'Compute Engine',
    reason: 'compute_engine_api_error',
    operation,
    detailKeys: ['message', 'reason', 'status', 'code', 'error_description'],
    nestedKeys: ['error', 'errors']
  });

export let computeEngineOAuthError = (operation: string, error: unknown) =>
  buildApiServiceError(error, {
    providerLabel: 'Compute Engine',
    reason: 'compute_engine_oauth_error',
    operation,
    detailKeys: ['message', 'error', 'error_description', 'code'],
    nestedKeys: ['errors'],
    formatMessage: ({ operation, statusLabel, message }) =>
      `Compute Engine OAuth ${operation} failed: ${statusLabel}${message}`
  });

let resolveLocation = (
  value: string | undefined,
  fallback: string | undefined,
  label: 'zone' | 'region'
) => {
  let resolved = value?.trim() || fallback?.trim();
  if (resolved) return resolved;

  throw createApiServiceError(
    `A Compute Engine ${label} is required. Provide ${label} in the tool input or configure default${label === 'zone' ? 'Zone' : 'Region'}.`,
    { reason: 'compute_engine_validation_error' }
  );
};

export let resolveComputeEngineZone = (
  zone: string | undefined,
  defaultZone: string | undefined
) => resolveLocation(zone, defaultZone, 'zone');

export let resolveComputeEngineRegion = (
  region: string | undefined,
  defaultRegion: string | undefined
) => resolveLocation(region, defaultRegion, 'region');
