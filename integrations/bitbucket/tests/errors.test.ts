import { describe, expect, test } from 'bun:test';
import { SlateError } from '@slates/provider';
import { bitbucketApiError } from '../src/lib/errors';

let makeAxiosError = ({
  status,
  statusText,
  method,
  path,
  responseData
}: {
  status: number;
  statusText: string;
  method: string;
  path: string;
  responseData: unknown;
}) => {
  let error = new Error(`Request failed with status code ${status}`);

  return Object.assign(error, {
    code: 'ERR_BAD_REQUEST',
    config: {
      baseURL: 'https://api.bitbucket.org/2.0/',
      method,
      url: path
    },
    isAxiosError: true,
    response: {
      data: responseData,
      headers: {},
      status,
      statusText
    }
  });
};

describe('bitbucketApiError', () => {
  test('preserves structured SlateErrors and their upstream diagnostics unchanged', () => {
    let longResponseValue = 'x'.repeat(2_001);
    let cases = [
      { code: 'auth.invalid', method: 'get', retryable: false, status: 401 },
      { code: 'permission.denied', method: 'post', retryable: false, status: 403 },
      { code: 'resource.not_found', method: 'get', retryable: false, status: 404 },
      { code: 'upstream.invalid_request', method: 'post', retryable: false, status: 422 }
    ] as const;

    for (let item of cases) {
      let path = `repositories/workspace/repository/${item.status}`;
      let responseData = {
        detail: longResponseValue,
        error: {
          message: `Bitbucket response ${item.status}`
        }
      };
      let structuredError = SlateError.fromAxios(
        makeAxiosError({
          status: item.status,
          statusText: 'Provider response',
          method: item.method,
          path,
          responseData
        })
      );
      let originalResponse = structuredError.toResponse();

      expect(structuredError.code).toBe(item.code);
      expect(structuredError.status).toBe(item.status);
      expect(structuredError.retryable).toBe(item.retryable);
      expect(structuredError.data.upstream).toEqual({
        method: item.method.toUpperCase(),
        status: item.status,
        url: `https://api.bitbucket.org/2.0/${path}`
      });
      expect(structuredError.data.baggage?.response).toEqual({
        detail: `${'x'.repeat(2_000)}...[truncated]`,
        error: {
          message: `Bitbucket response ${item.status}`
        }
      });

      let result = bitbucketApiError(structuredError, 'ignored operation');

      expect(result).toBe(structuredError);
      expect(result.toResponse()).toEqual(originalResponse);
    }
  });

  test('converts a raw Axios error with the shared Bitbucket API error mapping', () => {
    let rawError = makeAxiosError({
      status: 422,
      statusText: 'Unprocessable Entity',
      method: 'post',
      path: 'repositories/workspace/repository/pullrequests',
      responseData: {
        error: {
          detail: 'Check the source branch name',
          message: 'Source branch does not exist'
        }
      }
    });

    let result = bitbucketApiError(rawError, 'create pull request');

    expect(result.data.message).toBe(
      'Bitbucket API create pull request failed: HTTP 422 Unprocessable Entity: Source branch does not exist - Check the source branch name'
    );
    expect(result.data.reason).toBe('bitbucket_api_error');
    expect(result.data.upstreamStatus).toBe(422);
  });
});
