import {
  createApiServiceError,
  createAuthenticatedAxios,
  isApiErrorRecord,
  requestAxios
} from 'slates';
import { highLevelApiError, highLevelResponseMetadata } from './errors';
import { requireHighLevelScope } from './scopes';
import type { HighLevelAuth, HighLevelRequest } from './types';

export let HIGHLEVEL_API_BASE_URL = 'https://services.leadconnectorhq.com';
export let HIGHLEVEL_API_VERSION = 'v3';

export let createHighLevelClient = (auth: HighLevelAuth) => {
  if (!auth.token || !auth.locationId) {
    throw createApiServiceError(
      'Reconnect HighLevel to a single sub-account before using this tool.'
    );
  }

  let assertLocation = (locationId?: string) => {
    if (locationId !== undefined && locationId !== auth.locationId) {
      throw createApiServiceError(
        'This connection can only access its connected HighLevel sub-account. Connect the other sub-account separately.',
        { reason: 'highlevel_location_mismatch' }
      );
    }
    return auth.locationId;
  };

  let api = createAuthenticatedAxios({
    baseURL: HIGHLEVEL_API_BASE_URL,
    authHeader: { value: `Bearer ${auth.token}` },
    headers: { Version: HIGHLEVEL_API_VERSION, Accept: 'application/json' },
    timeout: 30_000,
    maxRedirects: 0,
    // Keep response headers available for rate-limit and trace diagnostics.
    validateStatus: () => true,
    paramsSerializer: {
      serialize: params => {
        let query = new URLSearchParams();
        for (let [key, value] of Object.entries(params)) {
          if (value === undefined) continue;
          if (Array.isArray(value)) {
            for (let item of value) query.append(key, String(item));
          } else {
            query.append(key, String(value));
          }
        }
        return query.toString();
      }
    }
  });

  let requestWithMetadata = async <T>(request: HighLevelRequest) => {
    requireHighLevelScope(auth, request.scope);
    if (
      !request.path.startsWith('/') ||
      request.path.startsWith('//') ||
      request.path.includes('://')
    ) {
      throw createApiServiceError('HighLevel requests must use a relative API endpoint.');
    }
    let pathLocation =
      request.path.match(/^\/(?:locations|emails\/locations)\/([^/?#]+)/)?.[1] ??
      request.path.match(
        /^\/social-media-posting\/([^/?#]+)\/(?:accounts|posts)(?:\/|$)/
      )?.[1];
    if (pathLocation) assertLocation(pathLocation);
    for (let values of [request.query, request.body]) {
      if (!isApiErrorRecord(values)) continue;
      for (let key of ['locationId', 'altId']) {
        if (values[key] !== undefined) {
          if (typeof values[key] !== 'string') {
            throw createApiServiceError(`HighLevel ${key} must be a sub-account identifier.`);
          }
          assertLocation(values[key]);
        }
      }
    }

    let operation = `${request.method} ${request.path}`;
    let response = await requestAxios<T>(
      operation,
      () =>
        api.request<T>({
          method: request.method,
          url: request.path,
          params: request.query,
          data: request.body
        }),
      error => highLevelApiError(error, operation, [auth.token])
    );
    if (
      response.status < 200 ||
      response.status >= 300 ||
      (isApiErrorRecord(response.data) && response.data.success === false)
    ) {
      throw highLevelApiError(
        {
          response: {
            status: response.status,
            statusText: response.statusText,
            headers: response.headers,
            data: response.data
          }
        },
        operation,
        [auth.token]
      );
    }
    return {
      data: response.data,
      metadata: highLevelResponseMetadata(response.status, response.headers, response.data)
    };
  };

  return {
    locationId: auth.locationId,
    assertLocation,
    requestWithMetadata,
    request: async <T>(request: HighLevelRequest): Promise<T> =>
      (await requestWithMetadata<T>(request)).data
  };
};
