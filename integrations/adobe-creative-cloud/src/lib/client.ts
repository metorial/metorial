import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  isApiErrorRecord
} from 'slates';

export interface AdobeAuthConfig {
  token: string;
  clientId: string;
  orgId?: string;
}

export let adobeApiError = (error: unknown) =>
  buildApiServiceError(error, {
    providerLabel: 'Adobe',
    reason: 'adobe_api_error',
    detailKeys: ['message', 'detail', 'error', 'error_description', 'error_code', 'code'],
    nestedKeys: ['errors', 'errorDetails'],
    extractResponse: (value, helpers) => helpers.getResponseWithBody(value),
    extractUpstreamCode: (_error, response) => {
      let data = response?.data;
      if (!isApiErrorRecord(data)) return undefined;
      let code = data.error_code ?? data.errorCode ?? data.code ?? data.result;
      return typeof code === 'string' || typeof code === 'number' ? String(code) : undefined;
    }
  });

export let createAdobeAxios = (baseURL: string, auth: AdobeAuthConfig) => {
  return createAuthenticatedAxios({
    baseURL,
    errorAdapter: adobeApiError,
    headers: {
      Authorization: `Bearer ${auth.token}`,
      'x-api-key': auth.clientId,
      ...(auth.orgId ? { 'x-gw-ims-org-id': auth.orgId } : {})
    }
  });
};

export let getAdobeJobUrl = (value: string) => {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw createApiServiceError('Provide the complete HTTPS status URL returned by Adobe.');
  }
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    url.port ||
    !['image.adobe.io', 'photoshop-api.adobe.io', 'indesign.adobe.io'].includes(url.hostname)
  ) {
    throw createApiServiceError(
      'The job status URL must use an Adobe image or InDesign API host.'
    );
  }
  return url;
};

// Libraries timestamps are milliseconds; public timestamp fields remain strings.
export let libraryTimestamp = (value: unknown): string | undefined => {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' && Number.isFinite(value)) {
    let date = new Date(value);
    if (!Number.isNaN(date.getTime())) return date.toISOString();
  }
  return undefined;
};
