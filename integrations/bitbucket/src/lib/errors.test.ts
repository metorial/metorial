import { SlateError } from '@slates/provider';
import { describe, expect, it } from 'vitest';
import { bitbucketApiError, bitbucketServiceError } from './errors';

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
  it('preserves structured SlateErrors unchanged', () => {
    for (let status of [401, 403, 404, 422]) {
      let structuredError = SlateError.fromAxios(
        makeAxiosError({
          status,
          statusText: 'Provider response',
          method: 'get',
          path: `repositories/workspace/repository/${status}`,
          responseData: {
            type: 'error',
            error: {
              message: `Bitbucket response ${status}`
            }
          }
        })
      );
      let originalResponse = structuredError.toResponse();

      expect(structuredError.status).toBe(status);

      let result = bitbucketApiError(structuredError, 'ignored operation');

      expect(result).toBe(structuredError);
      expect(result.toResponse()).toEqual(originalResponse);
    }
  });

  it('converts a raw Axios error with the shared Bitbucket API error mapping', () => {
    let rawError = makeAxiosError({
      status: 422,
      statusText: 'Unprocessable Entity',
      method: 'post',
      path: 'repositories/workspace/repository/pullrequests',
      responseData: {
        type: 'error',
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
    expect(result.data).toMatchObject({
      reason: 'bitbucket_api_error',
      upstreamStatus: 422
    });
  });
});

describe('bitbucketServiceError', () => {
  it('reports validation failures with the Bitbucket validation reason', () => {
    let result = bitbucketServiceError('Provide a repository slug.');

    expect(result.data.message).toBe('Provide a repository slug.');
    expect(result.data).toMatchObject({ reason: 'bitbucket_validation_error' });
  });
});
