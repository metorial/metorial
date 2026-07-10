import { SlateError } from '@slates/provider';
import { describe, expect, it } from 'vitest';
import { apolloApiError, apolloOAuthError, apolloServiceError } from './errors';

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
  it('preserves structured SlateErrors unchanged', () => {
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

    expect(structuredError.status).toBe(422);

    for (let result of [
      apolloApiError(structuredError, 'search news articles'),
      apolloOAuthError('token exchange', structuredError)
    ]) {
      expect(result).toBe(structuredError);
      expect(result.toResponse()).toEqual(originalResponse);
    }
  });

  it('converts raw Axios errors with the shared Apollo API error mapping', () => {
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
    expect(result.data).toMatchObject({
      reason: 'apollo_api_error',
      upstreamStatus: 422
    });
  });

  it('reports validation failures with the Apollo validation reason', () => {
    let result = apolloServiceError('publishedAtMin must use YYYY-MM-DD format.');

    expect(result.data.message).toBe('publishedAtMin must use YYYY-MM-DD format.');
    expect(result.data).toMatchObject({ reason: 'apollo_validation_error' });
  });
});
