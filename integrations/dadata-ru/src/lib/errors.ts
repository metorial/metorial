import { buildApiServiceError, createApiServiceError } from 'slates';

export let dadataApiError = (error: unknown, operation = 'request') =>
  buildApiServiceError(error, {
    providerLabel: 'DaData',
    operation,
    reason: 'dadata_api_error',
    extractResponse: (error, helpers) => helpers.getResponseWithBody(error),
    detailKeys: ['message', 'error', 'detail', 'code', 'description'],
    nestedKeys: ['message', 'messages', 'error', 'errors', 'details'],
    extractUpstreamCode: (_error, response, helpers) =>
      helpers.isRecord(response?.data) && typeof response.data.code === 'string'
        ? response.data.code
        : undefined
  });

export let validateCount = (count: number | undefined, maximum = 20) => {
  if (count !== undefined && (!Number.isInteger(count) || count < 1 || count > maximum)) {
    throw createApiServiceError(`count must be an integer from 1 to ${maximum}.`, {
      reason: 'dadata_invalid_count'
    });
  }
};

export let validateCoordinates = (lat: number, lon: number) => {
  if (
    !Number.isFinite(lat) ||
    lat < -90 ||
    lat > 90 ||
    !Number.isFinite(lon) ||
    lon < -180 ||
    lon > 180
  ) {
    throw createApiServiceError(
      'Latitude must be between -90 and 90, and longitude between -180 and 180.',
      {
        reason: 'dadata_invalid_coordinates'
      }
    );
  }
};

export let validateRadius = (radius: number | undefined, maximum?: number) => {
  if (
    radius !== undefined &&
    (!Number.isFinite(radius) || radius <= 0 || (maximum !== undefined && radius > maximum))
  ) {
    throw createApiServiceError(
      `Search radius must be positive${maximum ? ` and no greater than ${maximum} meters` : ''}.`,
      {
        reason: 'dadata_invalid_radius'
      }
    );
  }
};
