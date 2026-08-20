import {
  SLATE_WEBHOOK_PRESET_DEFINITIONS,
  SLATE_WEBHOOK_PROVIDER_VERIFIER_DEFINITIONS,
  SLATE_WEBHOOK_PROVIDER_VERIFIER_IDS
} from '@slates/proto';
import { describe, expect, it } from 'vitest';
import {
  computeDispatchWebhookRequestHash,
  computeOriginalWebhookRequestHash,
  createSlateWebhookProviderVerifierRegistry,
  decodeWebhookWireBody,
  encodeCanonicalWebhookWireRequestV1,
  encodeCanonicalWebhookWireResponseV1,
  encodeWebhookWireBody,
  extractGraphBodyValueCandidates,
  getSlateWebhookItemAdapter,
  getSlateWebhookItemAdapterIdForRule,
  getSlateWebhookPreset,
  getWebhookHeaderValues,
  hashWebhookWireRequestV1,
  hashWebhookWireResponseV1,
  parseWebhookWireRequest,
  parseWebhookWireResponse,
  reconstructGraphBodyValueRequest,
  SLATE_WEBHOOK_MAX_GRAPH_CANDIDATES,
  SLATE_WEBHOOK_MAX_JSON_DEPTH,
  type SlateWebhookVerificationRule,
  selectWebhookVerificationRule,
  slateWebhookPresetIds,
  validateExhaustiveWebhookMappedResults,
  validateGraphBodyValueSelection,
  WebhookItemAdapterError,
  type WebhookWireRequest,
  type WebhookWireResponse
} from './verification';

let wireRequest = (d: Partial<WebhookWireRequest> = {}): WebhookWireRequest => ({
  url: 'https://example.com/callback?first=1&first=2',
  method: 'POST',
  headers: [
    ['X-Signature', 'first'],
    ['x-signature', 'second'],
    ['X-Comma', 'one,two']
  ],
  body: encodeWebhookWireBody(new TextEncoder().encode('{"ok":true}')),
  ...d
});

let wireResponse = (d: Partial<WebhookWireResponse> = {}): WebhookWireResponse => ({
  status: 200,
  headers: [
    ['Set-Cookie', 'first=1'],
    ['Set-Cookie', 'second=2']
  ],
  body: { present: true, base64: '' },
  ...d
});

let replay = {
  kind: 'enforced' as const,
  deduplicate: {
    source: 'header' as const,
    headerName: 'X-Delivery-Id',
    ttlSeconds: 3600,
    scope: 'request' as const
  }
};

describe('secure webhook wire contract', () => {
  it('round-trips ordered duplicate headers, exact binary bodies, and responses', () => {
    let binary = Uint8Array.from([0, 255, 13, 10, 128]);
    let request = wireRequest({ body: encodeWebhookWireBody(binary) });
    let parsedRequest = parseWebhookWireRequest(JSON.parse(JSON.stringify(request)));
    expect(parsedRequest).toEqual(request);
    expect(decodeWebhookWireBody(parsedRequest.body)).toEqual(binary);
    expect(getWebhookHeaderValues(parsedRequest, 'x-SiGnAtUrE')).toEqual(['first', 'second']);

    let response = wireResponse({ body: encodeWebhookWireBody(binary) });
    let parsedResponse = parseWebhookWireResponse(JSON.parse(JSON.stringify(response)));
    expect(parsedResponse).toEqual(response);
    expect(decodeWebhookWireBody(parsedResponse.body)).toEqual(binary);

    expect(encodeCanonicalWebhookWireRequestV1(request)).toEqual(
      encodeCanonicalWebhookWireRequestV1(parsedRequest)
    );
    expect(encodeCanonicalWebhookWireResponseV1(response)).toEqual(
      encodeCanonicalWebhookWireResponseV1(parsedResponse)
    );
    expect(hashWebhookWireRequestV1(request)).toBe(hashWebhookWireRequestV1(parsedRequest));
    expect(hashWebhookWireResponseV1(response)).toBe(
      hashWebhookWireResponseV1(parsedResponse)
    );
  });

  it('distinguishes absent, present-empty, and present non-empty bodies', () => {
    let absent = wireRequest({ body: { present: false } });
    let empty = wireRequest({ body: { present: true, base64: '' } });
    let nonEmpty = wireRequest({ body: encodeWebhookWireBody(Uint8Array.of(0)) });

    expect(decodeWebhookWireBody(absent.body)).toBeNull();
    expect(decodeWebhookWireBody(empty.body)).toEqual(new Uint8Array());
    expect(new Set([absent, empty, nonEmpty].map(hashWebhookWireRequestV1)).size).toBe(3);
  });

  it('looks up headers case-insensitively while hashing exact edge evidence', () => {
    let first = wireRequest({ headers: [['X-Signature', 'value']] });
    let second = wireRequest({ headers: [['x-signature', 'value']] });
    expect(getWebhookHeaderValues(first, 'x-signature')).toEqual(['value']);
    expect(getWebhookHeaderValues(second, 'X-SIGNATURE')).toEqual(['value']);
    expect(hashWebhookWireRequestV1(first)).not.toBe(hashWebhookWireRequestV1(second));
  });

  it('rejects Fetch and record-shaped substitutes at every secure parser', () => {
    expect(() => parseWebhookWireRequest(new Request('https://example.com'))).toThrow();
    expect(() => parseWebhookWireResponse(new Response('ok'))).toThrow();
    expect(() =>
      parseWebhookWireRequest({
        ...wireRequest(),
        headers: new Headers({ 'x-signature': 'value' })
      })
    ).toThrow();
    expect(() =>
      parseWebhookWireRequest({
        ...wireRequest(),
        headers: { 'x-signature': 'value' }
      })
    ).toThrow();
    expect(() =>
      parseWebhookWireResponse({
        ...wireResponse(),
        headers: { 'set-cookie': 'value' }
      })
    ).toThrow();
  });
});

describe('deterministic rule selection', () => {
  let rules: SlateWebhookVerificationRule[] = [
    {
      id: 'meta.challenge.v1',
      phase: 'bootstrap',
      when: {
        methods: ['GET'],
        registrationStatuses: ['pending', 'registering'],
        matcher: { hasQueryParam: 'hub.mode' }
      },
      verify: { type: 'path_secret' },
      result: { type: 'sync_only' },
      replay: { kind: 'not_applicable', reason: 'bootstrap_sync_only' }
    },
    {
      id: 'meta.delivery.v1',
      phase: 'delivery',
      when: { methods: ['POST'], registrationStatuses: ['registered'] },
      verify: { type: 'preset', preset: 'graph.change_notification.v1' },
      result: {
        type: 'dispatch',
        scope: 'verified_items'
      },
      replay
    }
  ];

  it('selects Meta GET bootstrap and POST delivery independently', () => {
    let bootstrap = selectWebhookVerificationRule({
      rules,
      request: wireRequest({
        method: 'GET',
        url: 'https://example.com/callback?hub.mode=subscribe&hub.challenge=value',
        body: { present: false }
      }),
      registrationStatus: 'registering'
    });
    expect(bootstrap).toMatchObject({
      status: 'selected',
      rule: { id: 'meta.challenge.v1' }
    });

    let delivery = selectWebhookVerificationRule({
      rules,
      request: wireRequest({ method: 'POST' }),
      registrationStatus: 'registered'
    });
    expect(delivery).toMatchObject({
      status: 'selected',
      rule: { id: 'meta.delivery.v1' }
    });
  });

  it('fails closed for no match or ambiguity without depending on rule order', () => {
    expect(
      selectWebhookVerificationRule({
        rules,
        request: wireRequest({ method: 'PUT' }),
        registrationStatus: 'registered'
      })
    ).toEqual({ status: 'rejected', code: 'no_matching_rule' });

    let duplicate = { ...rules[1]!, id: 'meta.delivery.duplicate.v1' };
    let first = selectWebhookVerificationRule({
      rules: [...rules, duplicate],
      request: wireRequest(),
      registrationStatus: 'registered'
    });
    let second = selectWebhookVerificationRule({
      rules: [duplicate, ...rules],
      request: wireRequest(),
      registrationStatus: 'registered'
    });
    expect(first).toEqual({ status: 'rejected', code: 'ambiguous_rule' });
    expect(second).toEqual(first);
  });
});

describe('graph.body_value.v1', () => {
  let graphRequest = wireRequest({
    headers: [['Content-Type', 'application/json']],
    body: encodeWebhookWireBody(
      new TextEncoder().encode(
        JSON.stringify({
          validationTokens: ['opaque-request-metadata'],
          value: [
            {
              id: 'delivery-a',
              subscriptionId: 'subscription-a',
              clientState: 'state-a',
              resource: '/users/a/messages/1'
            },
            {
              id: 'delivery-b',
              subscriptionId: 'subscription-b',
              clientState: 'wrong-state',
              resource: '/users/b/messages/2'
            },
            {
              subscriptionId: 'subscription-c',
              clientState: 'state-c',
              resource: '/users/c/messages/3'
            }
          ]
        })
      )
    )
  });

  it('extracts immutable, deterministic candidate triples and delivery IDs', () => {
    let first = extractGraphBodyValueCandidates(graphRequest);
    let second = extractGraphBodyValueCandidates(
      parseWebhookWireRequest(JSON.parse(JSON.stringify(graphRequest)))
    );
    expect(first).toEqual(second);
    expect(first).toHaveLength(3);
    expect(first.map(candidate => candidate.index)).toEqual([0, 1, 2]);
    expect(first[0]!.deliveryIds).toEqual(['delivery-a']);
    expect(first[2]!.deliveryIds[0]).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first[0])).toBe(true);
    expect(Object.isFrozen(first[0]!.deliveryIds)).toBe(true);
  });

  it('supports mixed validity and reconstructs accepted siblings in original order only', () => {
    let candidates = extractGraphBodyValueCandidates(graphRequest);
    let acceptedIds = [candidates[2]!.candidateId, candidates[0]!.candidateId];
    let selection = validateGraphBodyValueSelection(candidates, acceptedIds);
    expect(selection.status).toBe('accepted');
    if (selection.status === 'accepted') {
      expect(selection.candidates.map(candidate => candidate.index)).toEqual([0, 2]);
    }

    let dispatchRequest = reconstructGraphBodyValueRequest(graphRequest, acceptedIds);
    let body = decodeWebhookWireBody(dispatchRequest.body)!;
    let json = JSON.parse(new TextDecoder().decode(body));
    expect(json.value.map((item: { subscriptionId: string }) => item.subscriptionId)).toEqual([
      'subscription-a',
      'subscription-c'
    ]);
    expect(json.validationTokens).toEqual(['opaque-request-metadata']);
  });

  it('preserves every untouched byte and selected item lexical representation', () => {
    let lexicalBody = [
      '{\n',
      '  "metadata" : { "keep" : "spacing" },\n',
      '  "value" : [\n',
      '    { "subscriptionId":"a", "clientState":"ok", "number":1e+02 },\n',
      '    {"subscriptionId":"b","clientState":"bad","escaped":"\\u0061"},\n',
      '    { "subscriptionId":"c", "clientState":"ok", "number":-0 }\n',
      '  ],\n',
      '  "tail" : [ 1, 2, 3 ]\n',
      '}\n'
    ].join('');
    let lexicalRequest = wireRequest({
      body: encodeWebhookWireBody(new TextEncoder().encode(lexicalBody))
    });
    let candidates = extractGraphBodyValueCandidates(lexicalRequest);
    let dispatch = reconstructGraphBodyValueRequest(lexicalRequest, [
      candidates[0]!.candidateId,
      candidates[2]!.candidateId
    ]);
    let body = new TextDecoder().decode(decodeWebhookWireBody(dispatch.body)!);
    expect(body).toBe(
      lexicalBody.replace(
        '{ "subscriptionId":"a", "clientState":"ok", "number":1e+02 },\n' +
          '    {"subscriptionId":"b","clientState":"bad","escaped":"\\u0061"},\n' +
          '    { "subscriptionId":"c", "clientState":"ok", "number":-0 }',
        '{ "subscriptionId":"a", "clientState":"ok", "number":1e+02 },{ "subscriptionId":"c", "clientState":"ok", "number":-0 }'
      )
    );
    expect(
      reconstructGraphBodyValueRequest(
        lexicalRequest,
        candidates.map(candidate => candidate.candidateId)
      )
    ).toEqual(lexicalRequest);
  });

  it('rejects JSON beyond the reviewed candidate and nesting bounds', () => {
    let tooManyCandidates = wireRequest({
      body: encodeWebhookWireBody(
        new TextEncoder().encode(
          JSON.stringify({
            value: Array.from(
              { length: SLATE_WEBHOOK_MAX_GRAPH_CANDIDATES + 1 },
              (_, index) => ({ subscriptionId: `subscription-${index}`, clientState: 'state' })
            )
          })
        )
      )
    });
    expect(() => extractGraphBodyValueCandidates(tooManyCandidates)).toThrow(
      WebhookItemAdapterError
    );

    let nestedValue = '0';
    for (let depth = 0; depth <= SLATE_WEBHOOK_MAX_JSON_DEPTH; depth += 1) {
      nestedValue = `[${nestedValue}]`;
    }
    let tooDeep = wireRequest({
      body: encodeWebhookWireBody(
        new TextEncoder().encode(
          `{"value":[{"subscriptionId":"subscription","clientState":"state","nested":${nestedValue}}]}`
        )
      )
    });
    expect(() => extractGraphBodyValueCandidates(tooDeep)).toThrow(WebhookItemAdapterError);
  });

  it('rejects duplicate and unknown selections and never accepts altered candidate facts', () => {
    let candidates = extractGraphBodyValueCandidates(graphRequest);
    expect(
      validateGraphBodyValueSelection(candidates, [
        candidates[0]!.candidateId,
        candidates[0]!.candidateId
      ])
    ).toEqual({ status: 'rejected', code: 'item_candidate_duplicate' });
    expect(validateGraphBodyValueSelection(candidates, ['unknown'])).toEqual({
      status: 'rejected',
      code: 'item_candidate_unknown'
    });
    expect(() => reconstructGraphBodyValueRequest(graphRequest, ['unknown'])).toThrow(
      WebhookItemAdapterError
    );

    expect(Reflect.set(candidates[0]!, 'deliveryIds', ['forged'])).toBe(false);
    expect(() => (candidates[0]!.deliveryIds as string[]).push('forged')).toThrow();
    let reconstructed = reconstructGraphBodyValueRequest(graphRequest, [
      candidates[0]!.candidateId
    ]);
    expect(
      JSON.parse(new TextDecoder().decode(decodeWebhookWireBody(reconstructed.body)!)).value
    ).toEqual([
      expect.objectContaining({ id: 'delivery-a', subscriptionId: 'subscription-a' })
    ]);
  });

  it('keeps original and accepted-only dispatch hashes stable and separated', () => {
    let candidates = extractGraphBodyValueCandidates(graphRequest);
    let first = reconstructGraphBodyValueRequest(graphRequest, [candidates[0]!.candidateId]);
    let second = reconstructGraphBodyValueRequest(
      parseWebhookWireRequest(JSON.parse(JSON.stringify(graphRequest))),
      [candidates[0]!.candidateId]
    );
    expect(hashWebhookWireRequestV1(first)).toBe(hashWebhookWireRequestV1(second));
    expect(computeDispatchWebhookRequestHash(first)).toBe(hashWebhookWireRequestV1(second));
    expect(computeDispatchWebhookRequestHash(first)).not.toBe(
      computeOriginalWebhookRequestHash(graphRequest)
    );
  });

  it('requires exhaustive one-result-per-accepted-candidate mapping', () => {
    let candidates = extractGraphBodyValueCandidates(graphRequest);
    let accepted = [candidates[0]!.candidateId, candidates[2]!.candidateId];
    expect(
      validateExhaustiveWebhookMappedResults(accepted, [
        { candidateId: accepted[0]!, output: { id: 'a' } },
        { candidateId: accepted[1]!, output: { id: 'c' } }
      ]).status
    ).toBe('accepted');
    expect(
      validateExhaustiveWebhookMappedResults(accepted, [
        { candidateId: accepted[0]!, output: {} }
      ])
    ).toEqual({ status: 'rejected', code: 'mapped_output_incomplete' });
    expect(
      validateExhaustiveWebhookMappedResults(accepted, [
        { candidateId: accepted[0]!, output: {} },
        { candidateId: accepted[0]!, output: {} }
      ])
    ).toEqual({ status: 'rejected', code: 'mapped_output_extra' });
    expect(
      validateExhaustiveWebhookMappedResults(accepted, [
        { candidateId: accepted[0]!, output: {} },
        { candidateId: 'unknown', output: {} }
      ])
    ).toEqual({ status: 'rejected', code: 'mapped_output_extra' });
  });
});

describe('versioned registries and protocol fixtures', () => {
  it('has an exact closed preset registry and a closed item adapter registry', () => {
    slateWebhookPresetIds.forEach(id => expect(getSlateWebhookPreset(id)).not.toBeNull());
    expect(getSlateWebhookPreset('stripe.latest')).toBeNull();
    expect(getSlateWebhookItemAdapter('graph.body_value.v1')).not.toBeNull();
    expect(getSlateWebhookItemAdapter('graph.body_value.latest')).toBeNull();
    let graphRule: SlateWebhookVerificationRule = {
      id: 'graph.delivery.v1',
      phase: 'delivery',
      when: { methods: ['POST'] },
      verify: { type: 'preset', preset: 'graph.change_notification.v1' },
      result: { type: 'dispatch', scope: 'verified_items' },
      replay
    };
    expect(getSlateWebhookItemAdapterIdForRule(graphRule)).toBe('graph.body_value.v1');
  });

  it('deeply freezes closed registry entries and nested arrays', () => {
    expect(Object.isFrozen(SLATE_WEBHOOK_PRESET_DEFINITIONS)).toBe(true);
    expect(Object.isFrozen(SLATE_WEBHOOK_PRESET_DEFINITIONS['stripe.v1'])).toBe(true);
    expect(
      Object.isFrozen(SLATE_WEBHOOK_PRESET_DEFINITIONS['stripe.v1'].securityHeaders)
    ).toBe(true);
    expect(Object.isFrozen(SLATE_WEBHOOK_PROVIDER_VERIFIER_DEFINITIONS)).toBe(true);
    expect(Object.isFrozen(SLATE_WEBHOOK_PROVIDER_VERIFIER_IDS)).toBe(true);
    expect(() =>
      (
        SLATE_WEBHOOK_PRESET_DEFINITIONS['stripe.v1'].securityHeaders as unknown as string[]
      ).push('forged')
    ).toThrow();
    expect(Reflect.set(SLATE_WEBHOOK_PROVIDER_VERIFIER_DEFINITIONS, 'forged.v1', {})).toBe(
      false
    );
  });

  it('rejects unknown, unversioned, and duplicate provider verifier IDs', () => {
    let registry = createSlateWebhookProviderVerifierRegistry([
      { id: 'quickbooks.delivery.v1' }
    ]);
    expect(registry.require('quickbooks.delivery.v1')).toEqual({
      id: 'quickbooks.delivery.v1'
    });
    expect(() => registry.require('quickbooks.delivery.v2')).toThrow('Unknown');
    expect(() => createSlateWebhookProviderVerifierRegistry([{ id: 'quickbooks' }])).toThrow(
      'Unknown'
    );
    expect(() =>
      createSlateWebhookProviderVerifierRegistry([
        { id: 'quickbooks.delivery.v1' },
        { id: 'quickbooks.delivery.v1' }
      ])
    ).toThrow('Duplicate');
  });

  it('preserves Stripe multiple v1 values and GitLab duplicate signature occurrences', () => {
    let stripe = wireRequest({
      headers: [['Stripe-Signature', 't=1723550400,v1=bad,v1=good,v0=legacy']]
    });
    expect(getWebhookHeaderValues(stripe, 'stripe-signature')).toEqual([
      't=1723550400,v1=bad,v1=good,v0=legacy'
    ]);

    let gitlab = wireRequest({
      headers: [
        ['X-Gitlab-Token', 'first'],
        ['x-gitlab-token', 'second']
      ]
    });
    expect(getWebhookHeaderValues(gitlab, 'X-GITLAB-TOKEN')).toEqual(['first', 'second']);
  });

  it('binds HubSpot canonical URI spelling, Jira JWT claims, and Discord PING bytes', () => {
    let hubspotEncoded = wireRequest({
      url: 'https://example.com/callback?redirect=https%3A%2F%2Fvendor.example%2Fa%2Bb'
    });
    let hubspotDecoded = wireRequest({
      url: 'https://example.com/callback?redirect=https://vendor.example/a+b'
    });
    expect(hashWebhookWireRequestV1(hubspotEncoded)).not.toBe(
      hashWebhookWireRequestV1(hubspotDecoded)
    );

    let jiraClaims = { iss: 'client-key', qsh: 'context-qsh', iat: 1723550400 };
    let jiraJwt = `header.${Buffer.from(JSON.stringify(jiraClaims)).toString('base64url')}.signature`;
    let jira = wireRequest({ headers: [['Authorization', `JWT ${jiraJwt}`]] });
    let payload = getWebhookHeaderValues(jira, 'authorization')[0]!.slice(4).split('.')[1]!;
    expect(JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))).toEqual(jiraClaims);

    let discordBody = new TextEncoder().encode('{"type":1,"data":{"value":"PING"}}');
    let discord = wireRequest({
      headers: [
        ['X-Signature-Timestamp', '1723550400'],
        ['X-Signature-Ed25519', '00'.repeat(64)]
      ],
      body: encodeWebhookWireBody(discordBody)
    });
    expect(decodeWebhookWireBody(discord.body)).toEqual(discordBody);
    expect(getWebhookHeaderValues(discord, 'x-signature-timestamp')).toEqual(['1723550400']);
  });
});
