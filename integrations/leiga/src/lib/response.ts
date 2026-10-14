import { createApiServiceError, isApiErrorRecord } from 'slates';
import type { LeigaResponse } from './client';

export let assertLeigaResponse = <T>(response: LeigaResponse<T>, operation: string) => {
  if (!isApiErrorRecord(response) || String(response.code) !== '0') {
    throw createApiServiceError(
      `Leiga ${operation} failed: ${response?.msg || 'The API returned an unsuccessful response.'}`,
      {
        reason: 'leiga_api_error',
        upstreamCode: response?.code == null ? undefined : String(response.code)
      }
    );
  }

  if (
    response.success === false ||
    (isApiErrorRecord(response.data) && response.data.success === false)
  ) {
    throw createApiServiceError(
      `Leiga ${operation} failed: ${response.msg || 'The operation was not successful.'}`,
      {
        reason: 'leiga_api_error',
        upstreamCode: String(response.code)
      }
    );
  }

  return response;
};
