import { badRequestError, ServiceError } from '@lowerdeck/error';
import { describe, expect, it } from 'vitest';
import { SlateError } from '../../../provider/src/error/base';
import {
  createSlatesProviderProtoHandler,
  SlatesProviderProtoHandlerManager
} from './provider';

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
});
