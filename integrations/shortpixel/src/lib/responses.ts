import {
  buildApiServiceError,
  createApiServiceError,
  decodeApiErrorBody,
  getResponseHeaderValue,
  isApiErrorRecord
} from 'slates';

export let shortPixelError = (error: unknown) =>
  buildApiServiceError(error, {
    providerLabel: 'ShortPixel',
    reason: 'shortpixel_api_error',
    detailKeys: ['Message', 'message', 'error', 'Code', 'code'],
    nestedKeys: ['Status', 'errors'],
    extractResponse: (value, helpers) => helpers.getResponseWithBody(value),
    extractUpstreamCode: (_value, response) => {
      let body = response?.data;
      if (!isApiErrorRecord(body) || !isApiErrorRecord(body.Status)) return undefined;
      let code = body.Status.Code;
      return typeof code === 'string' || typeof code === 'number' ? String(code) : undefined;
    }
  });

export let readNumber = (value: unknown, field: string): number => {
  let parsed =
    typeof value === 'number'
      ? value
      : typeof value === 'string' && value.trim() !== ''
        ? Number(value)
        : Number.NaN;
  if (!Number.isFinite(parsed)) {
    throw createApiServiceError(`ShortPixel returned an invalid ${field}.`, {
      reason: 'shortpixel_invalid_response'
    });
  }
  return parsed;
};

export let readOptionalNumber = (value: unknown, field: string): number | undefined =>
  value === undefined || value === null ? undefined : readNumber(value, field);

export let assertSuccessfulEnvelope = (data: unknown) => {
  if (!isApiErrorRecord(data)) return;
  if (isApiErrorRecord(data.Status)) {
    let code = readNumber(data.Status.Code, 'status code');
    if (code < 0) {
      throw shortPixelError({ response: { status: 200, data } });
    }
  }
  if (typeof data.error === 'string' && data.error.trim()) {
    throw shortPixelError({ response: { status: 200, data } });
  }
};

export const MAX_OPTIMIZED_IMAGE_BYTES = 25 * 1024 * 1024;

export let readOptimizedImage = (response: {
  status: number;
  headers: unknown;
  data: unknown;
}) => {
  let mimeType = getResponseHeaderValue(response.headers, 'content-type')
    ?.split(';')[0]
    ?.trim()
    .toLowerCase();
  let bytes =
    response.data instanceof ArrayBuffer
      ? new Uint8Array(response.data)
      : ArrayBuffer.isView(response.data)
        ? new Uint8Array(
            response.data.buffer,
            response.data.byteOffset,
            response.data.byteLength
          )
        : undefined;
  if (
    response.status < 200 ||
    response.status >= 300 ||
    !mimeType ||
    !/^image\/[a-z0-9.+-]+$/.test(mimeType)
  ) {
    throw shortPixelError({
      response: {
        status: response.status,
        data: decodeApiErrorBody(response.data, { maxBytes: 16384 })
      }
    });
  }
  if (!bytes?.byteLength || bytes.byteLength > MAX_OPTIMIZED_IMAGE_BYTES) {
    throw createApiServiceError('ShortPixel returned an empty or oversized optimized image.');
  }
  return { bytes, mimeType };
};
