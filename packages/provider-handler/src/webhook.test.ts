import {
  SLATE_WEBHOOK_ACTION_SPEC_HASH_FIXTURE_V1,
  SLATE_WEBHOOK_WIRE_CONFORMANCE_FIXTURES_V1
} from '@slates/proto';
import {
  decodeWebhookWireBody,
  encodeWebhookWireBody,
  extractGraphBodyValueCandidates,
  getWebhookHeaderValues,
  hashWebhookWireRequestV1,
  reconstructGraphBodyValueRequest
} from '@slates/provider';
import { describe, expect, it } from 'vitest';
import {
  deserializeWebhookWireRequest,
  deserializeWebhookWireResponse,
  recomputeWebhookActionSpecHashV1,
  SLATE_WEBHOOK_RESPONSE_MAX_BODY_BYTES,
  serializeWebhookHttpResponse,
  serializeWebhookWireRequest,
  serializeWebhookWireResponse
} from './webhook';

describe('webhook action specHash v1 conformance', () => {
  it('recomputes the shared producer/consumer fixture', () => {
    expect(
      recomputeWebhookActionSpecHashV1(SLATE_WEBHOOK_ACTION_SPEC_HASH_FIXTURE_V1.action)
    ).toBe(SLATE_WEBHOOK_ACTION_SPEC_HASH_FIXTURE_V1.expectedHash);
  });
});

describe('serializeWebhookHttpResponse', () => {
  it('serializes a Response with status, headers, and body', async () => {
    await expect(
      serializeWebhookHttpResponse(
        new Response('created', {
          status: 201,
          headers: {
            'content-type': 'text/plain',
            'x-webhook-result': 'accepted'
          }
        })
      )
    ).resolves.toEqual({
      status: 201,
      headers: {
        'content-type': 'text/plain',
        'x-webhook-result': 'accepted'
      },
      body: {
        encoding: 'base64',
        content: Buffer.from('created').toString('base64')
      }
    });
  });

  it('applies defaults to a plain response init', async () => {
    await expect(serializeWebhookHttpResponse({ body: 'ok' })).resolves.toEqual({
      status: 200,
      headers: {},
      body: {
        encoding: 'base64',
        content: Buffer.from('ok').toString('base64')
      }
    });
  });

  it('serializes binary response bodies without changing their bytes', async () => {
    await expect(
      serializeWebhookHttpResponse({
        status: 202,
        body: new Uint8Array([0, 127, 128, 255])
      })
    ).resolves.toMatchObject({
      status: 202,
      body: {
        encoding: 'base64',
        content: Buffer.from([0, 127, 128, 255]).toString('base64')
      }
    });
  });

  it('rejects bodies larger than one MiB', async () => {
    await expect(
      serializeWebhookHttpResponse({
        body: new Uint8Array(SLATE_WEBHOOK_RESPONSE_MAX_BODY_BYTES + 1)
      })
    ).rejects.toThrow('Webhook response body exceeds');
  });
});

describe('secure wire serialization', () => {
  it.each(
    SLATE_WEBHOOK_WIRE_CONFORMANCE_FIXTURES_V1
  )('round-trips shared $name fixture without changing its hash', fixture => {
    let request = deserializeWebhookWireRequest(serializeWebhookWireRequest(fixture.request));
    expect(request).toEqual(fixture.request);
    expect(hashWebhookWireRequestV1(request)).toBe(fixture.requestHash);
  });

  it.each([
    { present: false } as const,
    { present: true, base64: '' } as const,
    { present: true, base64: Buffer.from([0, 255, 13, 10]).toString('base64') } as const
  ])('round-trips ordered headers and $present body bytes', body => {
    let request = {
      url: 'https://example.com/callback?raw=%2f&a=1&a=2',
      method: 'POST' as const,
      headers: [
        ['X-Signature', 'first'],
        ['x-signature', 'second'],
        ['X-Comma', 'one,two']
      ] as [string, string][],
      body
    };
    expect(deserializeWebhookWireRequest(serializeWebhookWireRequest(request))).toEqual(
      request
    );

    let response = {
      status: 202,
      headers: [
        ['Set-Cookie', 'a=1'],
        ['Set-Cookie', 'b=2']
      ] as [string, string][],
      body
    };
    expect(deserializeWebhookWireResponse(serializeWebhookWireResponse(response))).toEqual(
      response
    );
  });

  it('rejects Fetch, Headers, and record-shaped substitutes', () => {
    expect(() =>
      serializeWebhookWireRequest(new Request('https://example.com') as never)
    ).toThrow();
    expect(() => serializeWebhookWireResponse(new Response('ok') as never)).toThrow();
    expect(() =>
      serializeWebhookWireRequest({
        url: 'https://example.com',
        method: 'POST',
        headers: new Headers({ 'x-signature': 'value' }),
        body: { present: false }
      } as never)
    ).toThrow();
    expect(() =>
      serializeWebhookWireRequest({
        url: 'https://example.com',
        method: 'POST',
        headers: { 'x-signature': 'value' },
        body: { present: false }
      } as never)
    ).toThrow();
  });

  it('preserves the secure wire contract through verification, reconstruction, dispatch, and response', () => {
    let original = {
      url: 'https://example.com/callback?raw=%2f&a=1&a=2',
      method: 'POST' as const,
      headers: [
        ['X-Graph-Proof', 'first'],
        ['x-graph-proof', 'second'],
        ['X-Comma', 'one,two']
      ] as [string, string][],
      body: encodeWebhookWireBody(
        new TextEncoder().encode(
          '{\n  "value": [ {"id":"a","subscriptionId":"one"}, { "id":"b", "subscriptionId":"two" } ],\n  "keep" : "exact"\n}\n'
        )
      )
    };

    let verificationBoundary = deserializeWebhookWireRequest(
      serializeWebhookWireRequest(original)
    );
    expect(getWebhookHeaderValues(verificationBoundary, 'x-GrApH-pRoOf')).toEqual([
      'first',
      'second'
    ]);

    let candidates = extractGraphBodyValueCandidates(verificationBoundary);
    let reconstructed = reconstructGraphBodyValueRequest(verificationBoundary, [
      candidates[1]!.candidateId
    ]);
    let dispatchBoundary = deserializeWebhookWireRequest(
      serializeWebhookWireRequest(reconstructed)
    );
    expect(dispatchBoundary.headers).toEqual(original.headers);
    expect(new TextDecoder().decode(decodeWebhookWireBody(dispatchBoundary.body)!)).toBe(
      '{\n  "value": [ { "id":"b", "subscriptionId":"two" } ],\n  "keep" : "exact"\n}\n'
    );
    expect(hashWebhookWireRequestV1(dispatchBoundary)).not.toBe(
      hashWebhookWireRequestV1(original)
    );

    let response = {
      status: 202,
      headers: [
        ['Set-Cookie', 'first=1'],
        ['Set-Cookie', 'second=2']
      ] as [string, string][],
      body: encodeWebhookWireBody(Uint8Array.from([0, 255, 13, 10]))
    };
    expect(deserializeWebhookWireResponse(serializeWebhookWireResponse(response))).toEqual(
      response
    );
  });
});
