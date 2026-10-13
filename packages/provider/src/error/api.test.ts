import { ServiceError } from '@lowerdeck/error';
import { AxiosError, AxiosHeaders } from 'axios';
import { describe, expect, it } from 'vitest';
import {
  buildApiServiceError,
  collectApiErrorDetails,
  createApiServiceError,
  decodeApiErrorBody,
  getApiErrorResponseWithBody,
  looksLikeHtmlErrorBody,
  pushBoundedApiErrorDetail,
  readApiErrorText,
  truncateApiErrorMessage
} from './api';
import { SlateError } from './base';

let axiosFailure = (status: number, data: unknown) => {
  let config = { url: '/widgets', method: 'get', headers: new AxiosHeaders() };
  return new AxiosError('Request failed', 'ERR_BAD_REQUEST', config, undefined, {
    status,
    statusText: 'Error',
    data,
    headers: {},
    config
  });
};

describe('API service error helpers', () => {
  it('collects unique nested API error details', () => {
    let details: string[] = [];

    collectApiErrorDetails(
      {
        message: 'Invalid request',
        code: 'bad_request',
        errors: [
          {
            detail: 'Missing name'
          },
          'Missing name'
        ]
      },
      details
    );

    expect(details).toEqual(['Invalid request', 'bad_request', 'Missing name']);
  });

  it('builds provider API ServiceErrors with upstream metadata', () => {
    let parent = new Error('Request failed');
    (parent as any).response = {
      status: 429,
      statusText: 'Too Many Requests',
      data: {
        title: 'Rate limit',
        details: [{ message: 'Retry later' }]
      }
    };

    let error = buildApiServiceError(parent, {
      providerLabel: 'Example',
      operation: 'list widgets',
      reason: 'example_api_error',
      detailKeys: ['title', 'message'],
      nestedKeys: ['details'],
      extractUpstreamCode: () => 'RATE_LIMITED'
    });

    expect(error).toBeInstanceOf(ServiceError);
    expect(error.data.message).toBe(
      'Example API list widgets failed: HTTP 429 Too Many Requests: Rate limit - Retry later'
    );
    expect(error.data.reason).toBe('example_api_error');
    expect(error.data.upstreamStatus).toBe(429);
    expect(error.data.upstreamCode).toBe('RATE_LIMITED');
  });

  it('recovers the upstream status from interceptor-normalized SlateErrors', () => {
    // Runtime axios instances reject with SlateError, not AxiosError: the
    // response interceptor consumes error.response, so the status only
    // survives at data.upstream.status / data.status.
    let parent = new SlateError({
      code: 'not_found',
      message: 'Method not found.',
      upstream: { status: 404 }
    });

    let error = buildApiServiceError(parent, {
      providerLabel: 'Example',
      operation: 'search messages',
      reason: 'example_api_error'
    });

    expect(error.data.upstreamStatus).toBe(404);
    expect(error.data.message).toBe(
      'Example API search messages failed: HTTP 404: Method not found.'
    );
  });

  it('allows provider-specific status and message extraction', () => {
    let error = buildApiServiceError(
      {
        status: 503,
        data: {
          message: 'Unavailable'
        }
      },
      {
        providerLabel: 'Example',
        reason: 'example_api_error',
        extractStatus: (input, _response, helpers) =>
          helpers.isRecord(input) && typeof input.status === 'number'
            ? input.status
            : undefined,
        extractMessage: (input, helpers) => {
          if (!helpers.isRecord(input) || !helpers.isRecord(input.data)) return undefined;
          return typeof input.data.message === 'string' ? input.data.message : undefined;
        }
      }
    );

    expect(error.data.message).toBe('Example API request failed: HTTP 503: Unavailable');
    expect(error.data.upstreamStatus).toBe(503);
  });

  it('passes through existing ServiceErrors', () => {
    let existing = createApiServiceError('Already normalized');

    expect(
      buildApiServiceError(existing, {
        providerLabel: 'Example',
        reason: 'example_api_error'
      })
    ).toBe(existing);
  });

  it('recovers the upstream body from SlateError baggage', () => {
    let parent = SlateError.fromAxios(
      axiosFailure(422, { errors: [{ message: 'Name is required' }] })
    );

    expect(parent.name).toBe('SlateError');
    expect((parent as any).response).toBeUndefined();
    expect(getApiErrorResponseWithBody(parent)).toEqual({
      status: 422,
      data: { errors: [{ message: 'Name is required' }] }
    });

    let error = buildApiServiceError(parent, {
      providerLabel: 'Example',
      reason: 'example_api_error',
      extractResponse: (input, helpers) => helpers.getResponseWithBody(input)
    });

    expect(error.data.upstreamStatus).toBe(422);
    expect(error.data.message).toBe('Example API request failed: HTTP 422: Name is required');
  });

  it('prefers an existing response body and ignores non-SlateErrors without one', () => {
    let response = { status: 400, data: { message: 'Direct' } };

    expect(getApiErrorResponseWithBody({ response })).toEqual({
      status: 400,
      statusText: undefined,
      data: { message: 'Direct' }
    });
    expect(
      getApiErrorResponseWithBody({ name: 'Error', data: { baggage: { response: 'x' } } })
    ).toBeUndefined();
  });

  it('detects HTML error pages without dropping plain text that starts with <', () => {
    expect(looksLikeHtmlErrorBody('<!DOCTYPE html><html><body>Bad</body></html>')).toBe(true);
    expect(looksLikeHtmlErrorBody('  <html lang="en">')).toBe(true);
    expect(looksLikeHtmlErrorBody('<h1>502 Bad Gateway</h1>')).toBe(true);
    expect(looksLikeHtmlErrorBody('Error page: <body>oops</body>')).toBe(true);
    expect(looksLikeHtmlErrorBody('<id> is required')).toBe(false);
    expect(looksLikeHtmlErrorBody('<body> is required')).toBe(false);
    expect(looksLikeHtmlErrorBody('Invalid <body> parameter')).toBe(false);
    expect(looksLikeHtmlErrorBody('<title> is required')).toBe(false);
    expect(looksLikeHtmlErrorBody('<p> must be a string')).toBe(false);
    expect(looksLikeHtmlErrorBody('<= 100 items allowed')).toBe(false);
    expect(looksLikeHtmlErrorBody('Field must be a number')).toBe(false);
  });

  it('reads displayable error text and keeps detail lists bounded and unique', () => {
    expect(readApiErrorText('  Bad input ')).toBe('Bad input');
    expect(readApiErrorText(42)).toBe('42');
    expect(readApiErrorText(42, { includeNumbers: false })).toBeUndefined();
    expect(readApiErrorText('[truncated]')).toBeUndefined();
    expect(readApiErrorText('<html></html>')).toBeUndefined();
    expect(readApiErrorText({ message: 'x' })).toBeUndefined();

    let details: string[] = [];
    for (let value of ['a', 'a', '', '[truncated]', 'b', 'c', 'd', 'e', 'f']) {
      pushBoundedApiErrorDetail(details, value);
    }
    expect(details).toEqual(['a', 'b', 'c', 'd', 'e']);

    let fieldDetails: string[] = [];
    pushBoundedApiErrorDetail(fieldDetails, 'is required', { field: 'name' });
    pushBoundedApiErrorDetail(fieldDetails, 'is required', { field: 'name' });
    pushBoundedApiErrorDetail(fieldDetails, 'second', { maxDetails: 1 });
    expect(fieldDetails).toEqual(['name: is required']);
  });

  it('truncates long error messages', () => {
    expect(truncateApiErrorMessage('abc', 5)).toBe('abc');
    expect(truncateApiErrorMessage('abcdef', 3)).toBe('abc...');
    expect(truncateApiErrorMessage('x'.repeat(1_001))).toBe(`${'x'.repeat(1_000)}...`);
  });

  it('decodes text and binary error bodies', () => {
    let json = '{"error":{"message":"Not found"}}';
    let bytes = new TextEncoder().encode(json);

    expect(decodeApiErrorBody(json)).toEqual({ error: { message: 'Not found' } });
    expect(decodeApiErrorBody(bytes.buffer)).toEqual({ error: { message: 'Not found' } });
    expect(decodeApiErrorBody(bytes)).toEqual({ error: { message: 'Not found' } });
    expect(decodeApiErrorBody(Buffer.from(` ${json} `))).toEqual({
      error: { message: 'Not found' }
    });
    expect(decodeApiErrorBody('  plain text  ')).toBe('plain text');
    expect(decodeApiErrorBody('{not json')).toBe('{not json');
    expect(decodeApiErrorBody(new TextEncoder().encode('abcdef'), { maxBytes: 3 })).toBe(
      'abc'
    );
    expect(decodeApiErrorBody({ already: 'parsed' })).toEqual({ already: 'parsed' });
    expect(decodeApiErrorBody(undefined)).toBeUndefined();
  });
});
