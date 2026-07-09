import { describe, expect, test } from 'bun:test';
import { SlateError } from '@slates/provider';
import { apolloApiError, apolloOAuthError } from '../src/lib/errors';

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
      baseURL: 'https://api.apollo.io/api/v1/',
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

describe('Apollo errors', () => {
  test('preserves structured SlateErrors and their upstream diagnostics unchanged', () => {
    let structuredError = SlateError.fromAxios(
      makeAxiosError({
        status: 422,
        statusText: 'Unprocessable Entity',
        method: 'post',
        path: 'news_articles/search',
        responseData: {
          error: 'published_at[min] and published_at[max] must be used together'
        }
      })
    );
    let originalResponse = structuredError.toResponse();

    expect(structuredError.code).toBe('upstream.invalid_request');
    expect(structuredError.status).toBe(422);
    expect(structuredError.retryable).toBe(false);
    expect(structuredError.data.upstream).toEqual({
      code: 'published_at[min] and published_at[max] must be used together',
      method: 'POST',
      status: 422,
      url: 'https://api.apollo.io/api/v1/news_articles/search'
    });

    for (let result of [
      apolloApiError(structuredError, 'search news articles'),
      apolloOAuthError('token exchange', structuredError)
    ]) {
      expect(result).toBe(structuredError);
      expect(result.toResponse()).toEqual(originalResponse);
    }
  });

  test('converts raw Axios errors with the shared Apollo API error mapping', () => {
    let result = apolloApiError(
      makeAxiosError({
        status: 422,
        statusText: 'Unprocessable Entity',
        method: 'post',
        path: 'news_articles/search',
        responseData: {
          errors: [{ detail: 'Provide a complete publication date range' }]
        }
      }),
      'search news articles'
    );

    expect(result.data.message).toBe(
      'Apollo API search news articles failed: HTTP 422 Unprocessable Entity: Provide a complete publication date range'
    );
    expect(result.data.reason).toBe('apollo_api_error');
    expect(result.data.upstreamStatus).toBe(422);
  });
});
