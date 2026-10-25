import { badRequestError, ServiceError } from '@lowerdeck/error';
import { describe, expect, expectTypeOf, it } from 'vitest';
import { createApiServiceError } from '../../../provider/src/error/api';
import { SlateError } from '../../../provider/src/error/base';
import type { SlateErrorResponse } from '../../../provider/src/error/types';
import { type SlatesErrorResponse, slatesErrorResponse } from '../types';
import {
  createSlatesProviderProtoHandler,
  SlatesProviderProtoHandlerManager
} from './provider';

// Zod looseObject adds index signatures that interfaces lack; compare declared fields only.
type Declared<T> = T extends readonly (infer Item)[]
  ? Declared<Item>[]
  : T extends object
    ? {
        [Key in keyof T as string extends Key
          ? never
          : number extends Key
            ? never
            : Key]: Declared<T[Key]>;
      }
    : T;

describe('slate error response shape', () => {
  it('keeps the provider SlateErrorResponse and the proto schema in sync', () => {
    type Provider = Declared<SlateErrorResponse>;
    type Proto = Declared<SlatesErrorResponse>;

    expectTypeOf<Provider>().toExtend<Proto>();
    expectTypeOf<keyof Provider>().toEqualTypeOf<keyof Proto>();
    expectTypeOf<keyof NonNullable<Provider['upstream']>>().toEqualTypeOf<
      keyof NonNullable<Proto['upstream']>
    >();
    expectTypeOf<keyof NonNullable<Provider['provider']>>().toEqualTypeOf<
      keyof NonNullable<Proto['provider']>
    >();
  });
});

describe('SlatesProviderProtoHandlerManager', () => {
  it('serializes SlateError instances directly into JSON-RPC errors', async () => {
    let manager = await createSlatesProviderProtoHandler(async manager => {
      manager.onRequest('slates/provider.identify', async () => {
        throw new SlateError({
          code: 'upstream.rate_limited',
          kind: 'upstream',
          message: 'GitHub rate limit exceeded',
          retryable: true,
          upstream: {
            status: 429,
            code: 'rate_limited'
          },
          baggage: {
            scope: 'issues'
          }
        });
      });
    }).run();

    let response = await SlatesProviderProtoHandlerManager.handleInput(manager, {
      jsonrpc: '2.0',
      id: 'req_1',
      method: 'slates/provider.identify',
      params: {}
    });

    expect(response).toEqual({
      jsonrpc: '2.0',
      id: 'req_1',
      error: {
        code: 'upstream.rate_limited',
        kind: 'upstream',
        message: 'GitHub rate limit exceeded',
        retryable: true,
        status: 429,
        upstream: {
          status: 429,
          code: 'rate_limited'
        },
        upstreamCode: 'rate_limited',
        baggage: {
          scope: 'issues'
        }
      }
    });
  });

  it('maps ServiceError instances to SlateError protocol responses', async () => {
    let manager = await createSlatesProviderProtoHandler(async manager => {
      manager.onRequest('slates/provider.identify', async () => {
        throw new ServiceError(
          badRequestError({
            message: 'Invalid provider state'
          })
        );
      });
    }).run();

    let response = await SlatesProviderProtoHandlerManager.handleInput(manager, {
      jsonrpc: '2.0',
      id: 'req_2',
      method: 'slates/provider.identify',
      params: {}
    });

    expect(response).toEqual({
      jsonrpc: '2.0',
      id: 'req_2',
      error: {
        code: 'request.bad',
        kind: 'request',
        message: 'Invalid provider state',
        retryable: false,
        status: 400,
        baggage: {
          serviceError: {
            code: 'bad_request',
            status: 400
          }
        }
      }
    });
  });

  it('returns slate errors for protocol validation failures', async () => {
    let manager = await createSlatesProviderProtoHandler(async () => {}).run();

    let response = await SlatesProviderProtoHandlerManager.handleInput(manager, {
      jsonrpc: '1.0',
      id: 'req_3',
      method: 'slates/provider.identify',
      params: {}
    } as any);

    expect(response).toEqual({
      jsonrpc: '2.0',
      id: 'req_3',
      error: {
        code: 'request.bad',
        kind: 'request',
        message: 'Invalid jsonrpc version',
        retryable: false,
        status: 400,
        baggage: {
          serviceError: {
            code: 'bad_request',
            status: 400
          }
        }
      }
    });
  });

  let throwFromIdentify = async (error: unknown) => {
    let manager = await createSlatesProviderProtoHandler(async manager => {
      manager.onRequest('slates/provider.identify', async () => {
        throw error;
      });
    }).run();

    let response = await SlatesProviderProtoHandlerManager.handleInput(manager, {
      jsonrpc: '2.0',
      id: 'req_upstream',
      method: 'slates/provider.identify',
      params: {}
    });

    return (response as { error: Record<string, unknown> }).error;
  };

  it('surfaces the upstream code of API service errors as a top-level field', async () => {
    let error = await throwFromIdentify(
      createApiServiceError('Stripe API request failed: 402 - Card declined', {
        upstreamStatus: 402,
        upstreamCode: 'card_declined'
      })
    );

    expect(error).toEqual({
      code: 'request.bad',
      kind: 'request',
      message: 'Stripe API request failed: 402 - Card declined',
      retryable: false,
      status: 400,
      upstreamCode: 'card_declined',
      baggage: {
        serviceError: {
          code: 'bad_request',
          status: 400
        },
        serviceErrorData: {
          upstreamStatus: 402,
          upstreamCode: 'card_declined'
        }
      }
    });
    expect(slatesErrorResponse.parse(error).upstreamCode).toBe('card_declined');
  });

  it('omits upstreamCode when the service error has no string upstream code', async () => {
    for (let upstreamCode of [undefined, '']) {
      let error = await throwFromIdentify(
        createApiServiceError('Upstream failed', { upstreamStatus: 500, upstreamCode })
      );
      expect(error).not.toHaveProperty('upstreamCode');
    }

    let numeric = new ServiceError(badRequestError({ message: 'Upstream failed' }));
    numeric.data.upstreamCode = 42;
    expect(await throwFromIdentify(numeric)).not.toHaveProperty('upstreamCode');
  });

  it('drops upstreamCode values that are not code-shaped', async () => {
    for (let upstreamCode of ['x'.repeat(129), 'has space', '`x`', 'a\nb', '<script>']) {
      expect(
        await throwFromIdentify(
          createApiServiceError('Upstream failed', { upstreamStatus: 400, upstreamCode })
        )
      ).not.toHaveProperty('upstreamCode');

      let payload = await throwFromIdentify({
        code: 'upstream.error',
        kind: 'upstream',
        message: 'Upstream failed',
        upstreamCode,
        upstream: { code: upstreamCode }
      });
      expect(payload).not.toHaveProperty('upstreamCode');
    }

    expect(
      await throwFromIdentify({
        code: 'upstream.error',
        kind: 'upstream',
        message: 'Upstream failed',
        upstreamCode: 'not a code',
        upstream: { code: 'AADSTS700016' }
      })
    ).toMatchObject({ upstreamCode: 'AADSTS700016' });
  });

  it('keeps upstreamCode in service error baggage for older hubs', async () => {
    let error = await throwFromIdentify(
      createApiServiceError('Upstream failed', { upstreamCode: 'invalid_grant' })
    );

    expect(error).toMatchObject({
      upstreamCode: 'invalid_grant',
      baggage: { serviceErrorData: { upstreamCode: 'invalid_grant' } }
    });
  });

  it('derives upstreamCode from upstream.code for slate error payloads that predate it', async () => {
    let error = await throwFromIdentify({
      code: 'upstream.error',
      kind: 'upstream',
      message: 'Upstream failed',
      upstream: { status: 502, code: 'BAD_GATEWAY' }
    });

    expect(error).toMatchObject({ code: 'upstream.error', upstreamCode: 'BAD_GATEWAY' });
  });

  it('keeps an explicit upstreamCode on slate errors', async () => {
    let error = await throwFromIdentify(
      new SlateError({
        code: 'upstream.error',
        message: 'Upstream failed',
        upstream: { code: 'nested' },
        upstreamCode: 'explicit'
      })
    );

    expect(error).toMatchObject({ upstream: { code: 'nested' }, upstreamCode: 'explicit' });
  });

  it('carries the upstream code when a service error is converted to a SlateError', async () => {
    let error = await throwFromIdentify(
      SlateError.fromServiceError(
        createApiServiceError('Rate limited', {
          upstreamStatus: 429,
          upstreamCode: 'RATE_LIMITED'
        })
      )
    );

    expect(error).toMatchObject({ code: 'request.bad', upstreamCode: 'RATE_LIMITED' });
  });
});
