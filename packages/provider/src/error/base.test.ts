import {
  badRequestError,
  conflictError,
  forbiddenError,
  goneError,
  internalServerError,
  invalidVersion,
  notAcceptableError,
  notFoundError,
  notImplementedError,
  paymentRequiredError,
  preconditionFailedError,
  timeoutError,
  tooManyRequestsError,
  unauthorizedError,
  validationError
} from '@lowerdeck/error';
import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import { describe, expect, it } from 'vitest';
import { SlateError } from './base';

let createConfig = (overrides: Partial<InternalAxiosRequestConfig> = {}) =>
  ({
    url: '/issues',
    method: 'get',
    headers: {},
    ...overrides
  }) as InternalAxiosRequestConfig;

let createResponse = (overrides: Partial<AxiosResponse> = {}) =>
  ({
    status: 429,
    statusText: 'Too Many Requests',
    headers: {
      'x-request-id': 'req_123'
    },
    config: createConfig(),
    data: {
      error: {
        code: 'rate_limited',
        message: 'GitHub API rate limit exceeded',
        type: 'rate_limit'
      }
    },
    ...overrides
  }) as AxiosResponse;

describe('SlateError', () => {
  it('maps axios responses to structured slate errors', () => {
    let axiosError = new AxiosError(
      'Request failed with status code 429',
      'ERR_BAD_REQUEST',
      createConfig(),
      undefined,
      createResponse()
    );

    let error = SlateError.fromAxios(axiosError, {
      defaults: {
        provider: {
          service: 'github',
          operation: 'issues.list'
        }
      }
    });

    expect(error).toBeInstanceOf(SlateError);
    expect(error.code).toBe('upstream.rate_limited');
    expect(error.status).toBe(429);
    expect(error.retryable).toBe(true);
    expect(error.data.provider).toEqual({
      service: 'github',
      operation: 'issues.list'
    });
    expect(error.data.upstream).toMatchObject({
      status: 429,
      code: 'rate_limited',
      type: 'rate_limit',
      requestId: 'req_123',
      method: 'GET',
      url: '/issues'
    });
    expect(error.data.baggage?.response).toBeTruthy();
  });

  it('maps transport failures without responses', () => {
    let axiosError = new AxiosError('socket hang up', 'ECONNRESET', createConfig());

    let error = SlateError.fromAxios(axiosError);

    expect(error.code).toBe('upstream.network_error');
    expect(error.kind).toBe('upstream');
    expect(error.retryable).toBe(true);
    expect(error.data.upstream).toMatchObject({
      method: 'GET',
      url: '/issues'
    });
  });

  it('lets providers override inferred axios mappings', () => {
    let axiosError = new AxiosError(
      'Request failed with status code 404',
      'ERR_BAD_REQUEST',
      createConfig({ method: 'post', url: '/contacts' }),
      undefined,
      createResponse({
        status: 404,
        statusText: 'Not Found',
        data: {
          error: {
            code: 'contact_missing',
            message: 'Contact does not exist'
          }
        }
      })
    );

    let error = SlateError.fromAxios(axiosError, {
      mapAxiosError: (_, inferred) => ({
        ...inferred,
        code: 'resource.not_found',
        message: 'Salesforce contact was not found',
        provider: {
          ...inferred.provider,
          service: 'salesforce',
          operation: 'contacts.create'
        },
        baggage: {
          ...inferred.baggage,
          entity: 'contact'
        }
      })
    });

    expect(error.code).toBe('resource.not_found');
    expect(error.message).toBe('Salesforce contact was not found');
    expect(error.data.provider).toEqual({
      service: 'salesforce',
      operation: 'contacts.create'
    });
    expect(error.data.baggage?.entity).toBe('contact');
  });

  it('maps service errors to canonical slate errors', () => {
    let serviceErrors = [
      [
        validationError({ entity: 'request', errors: [], message: 'Invalid request data' }),
        'input.invalid'
      ],
      [badRequestError({ message: 'Bad request' }), 'request.bad'],
      [notFoundError('handler', 'missing'), 'resource.not_found'],
      [unauthorizedError({ message: 'Please log in' }), 'auth.required'],
      [forbiddenError({ message: 'Forbidden' }), 'permission.denied'],
      [invalidVersion({ message: 'Invalid version' }), 'request.invalid_version'],
      [conflictError({ message: 'Conflict' }), 'resource.conflict'],
      [goneError({ message: 'Gone' }), 'resource.gone'],
      [paymentRequiredError({ message: 'Payment required' }), 'payment.required'],
      [
        preconditionFailedError({ message: 'Precondition failed' }),
        'request.precondition_failed'
      ],
      [notAcceptableError({ message: 'Not acceptable' }), 'request.not_acceptable'],
      [notImplementedError({ message: 'Not implemented' }), 'operation.not_implemented'],
      [tooManyRequestsError({ message: 'Too many requests' }), 'request.rate_limited'],
      [timeoutError({ message: 'Timed out' }), 'internal.timeout'],
      [internalServerError({ message: 'Internal error' }), 'internal.unexpected']
    ] as const;

    for (let [serviceError, code] of serviceErrors) {
      let error = SlateError.fromServiceError(serviceError);
      expect(error.code).toBe(code);
      expect(error.data.baggage?.serviceError).toMatchObject({
        code: serviceError.data.code,
        status: serviceError.data.status
      });
    }
  });
});
