import { describe, expect, it } from 'vitest';
import {
  canonicalizeJsonJcs,
  computeWebhookActionSpecHashV1,
  encodeCanonicalWebhookWireRequestV1,
  hashWebhookWireRequestV1,
  SAFE_WEBHOOK_REJECTION_CODES,
  SLATE_WEBHOOK_ACTION_SPEC_HASH_FIXTURE_V1,
  SLATE_WEBHOOK_WIRE_CONFORMANCE_FIXTURES_V1,
  safeWebhookRejectionCode,
  slatesWebhookIngress,
  slatesWebhookSecretRef,
  slatesWebhookVerification,
  webhookWireRequest,
  webhookWireResponse
} from './action';

describe('webhook wire v1 fixed conformance fixtures', () => {
  it.each(SLATE_WEBHOOK_WIRE_CONFORMANCE_FIXTURES_V1)(
    'keeps $name bytes and request hash stable',
    fixture => {
      expect(
        Buffer.from(encodeCanonicalWebhookWireRequestV1(fixture.request)).toString('base64')
      ).toBe(fixture.canonicalBase64);
      expect(hashWebhookWireRequestV1(fixture.request)).toBe(fixture.requestHash);
    }
  );
});

let deliveryReplay = {
  kind: 'enforced',
  freshness: {
    source: 'header',
    headerName: 'X-Delivery-Timestamp',
    format: 'unix_seconds',
    maxAgeSeconds: 300,
    maxFutureSkewSeconds: 30
  }
};

let hubDeliveryRule = {
  id: 'delivery.v1',
  phase: 'delivery',
  when: { methods: ['POST'] },
  verify: { type: 'preset', preset: 'stripe.v1' },
  result: { type: 'dispatch', scope: 'receiver_trigger' },
  replay: deliveryReplay
};

let providerDeliveryRule = {
  ...hubDeliveryRule,
  verify: {
    type: 'provider',
    verifierId: 'quickbooks.delivery.v1',
    allowedSecretRefs: []
  }
};

let receiverIngress = (mechanism: 'hub' | 'provider' | 'path_secret_only') => ({
  kind: 'receiver_route',
  baseline: 'receiver_path_secret',
  verification:
    mechanism === 'hub'
      ? {
          mechanism: 'hub',
          baseline: 'receiver_path_secret',
          allowedSecretRefs: [],
          rules: [hubDeliveryRule]
        }
      : mechanism === 'provider'
        ? {
            mechanism: 'provider',
            baseline: 'receiver_path_secret',
            reason: 'The vendor requires its supported verification API.',
            allowedSecretRefs: [],
            rules: [providerDeliveryRule]
          }
        : {
            mechanism: 'path_secret_only',
            baseline: 'receiver_path_secret',
            reason: 'Reviewed vendor evidence confirms no stronger mechanism.'
          }
});

let sharedIngress = {
  kind: 'shared_provisioned_app',
  baseline: 'app_route_secret',
  routeFamily: 'stripe.connect.v1',
  verification: {
    mechanism: 'hub',
    allowedSecretRefs: [],
    rules: [hubDeliveryRule]
  }
};

describe('webhook verification contracts', () => {
  it('accepts each closed mechanism and rejects missing or unknown mechanisms', () => {
    expect(
      slatesWebhookVerification.safeParse(receiverIngress('hub').verification).success
    ).toBe(true);
    expect(
      slatesWebhookVerification.safeParse(receiverIngress('provider').verification).success
    ).toBe(true);
    expect(
      slatesWebhookVerification.safeParse(receiverIngress('path_secret_only').verification)
        .success
    ).toBe(true);

    let missing = { ...receiverIngress('hub').verification } as Record<string, unknown>;
    missing.mechanism = undefined;
    expect(slatesWebhookVerification.safeParse(missing).success).toBe(false);
    expect(
      slatesWebhookVerification.safeParse({
        ...receiverIngress('hub').verification,
        mechanism: 'any'
      }).success
    ).toBe(false);
  });

  it('rejects empty rule arrays, duplicate rule IDs, and empty method sets', () => {
    expect(
      slatesWebhookVerification.safeParse({
        mechanism: 'hub',
        baseline: 'receiver_path_secret',
        rules: []
      }).success
    ).toBe(false);
    expect(
      slatesWebhookVerification.safeParse({
        mechanism: 'provider',
        baseline: 'receiver_path_secret',
        reason: 'reviewed',
        rules: []
      }).success
    ).toBe(false);
    expect(
      slatesWebhookVerification.safeParse({
        mechanism: 'hub',
        baseline: 'receiver_path_secret',
        rules: [hubDeliveryRule, hubDeliveryRule]
      }).success
    ).toBe(false);
    expect(
      slatesWebhookVerification.safeParse({
        mechanism: 'hub',
        baseline: 'receiver_path_secret',
        rules: [{ ...hubDeliveryRule, when: { methods: [] } }]
      }).success
    ).toBe(false);
  });

  it('rejects invalid selectors, durations, presets, verifier IDs, and encodings', () => {
    let invalidReplays = [
      {
        ...deliveryReplay,
        freshness: { ...deliveryReplay.freshness, headerName: 'bad header' }
      },
      {
        kind: 'enforced',
        deduplicate: {
          source: 'json_pointer',
          pointer: '',
          ttlSeconds: 30,
          scope: 'request'
        }
      },
      {
        kind: 'enforced',
        freshness: { ...deliveryReplay.freshness, maxAgeSeconds: 31_536_001 }
      }
    ];
    invalidReplays.forEach(replay => {
      expect(
        slatesWebhookVerification.safeParse({
          mechanism: 'hub',
          baseline: 'receiver_path_secret',
          rules: [{ ...hubDeliveryRule, replay }]
        }).success
      ).toBe(false);
    });

    expect(
      slatesWebhookVerification.safeParse({
        mechanism: 'hub',
        baseline: 'receiver_path_secret',
        rules: [{ ...hubDeliveryRule, verify: { type: 'preset', preset: 'stripe.latest' } }]
      }).success
    ).toBe(false);
    expect(
      slatesWebhookVerification.safeParse({
        mechanism: 'provider',
        baseline: 'receiver_path_secret',
        reason: 'reviewed',
        rules: [
          {
            ...providerDeliveryRule,
            verify: { type: 'provider', verifierId: 'unknown.delivery.v1' }
          }
        ]
      }).success
    ).toBe(false);
    expect(
      slatesWebhookVerification.safeParse({
        mechanism: 'provider',
        baseline: 'receiver_path_secret',
        reason: 'reviewed',
        rules: [
          { ...providerDeliveryRule, verify: { type: 'provider', verifierId: 'unversioned' } }
        ]
      }).success
    ).toBe(false);
    expect(
      slatesWebhookVerification.safeParse({
        mechanism: 'hub',
        baseline: 'receiver_path_secret',
        allowedSecretRefs: [],
        rules: [
          {
            ...hubDeliveryRule,
            verify: {
              type: 'raw_hmac',
              secretName: 'webhook-secret',
              algorithm: 'sha256',
              signature: {
                headerName: 'X-Signature',
                encoding: 'utf8',
                duplicateHeaderPolicy: 'reject',
                multipleSignaturePolicy: 'reject'
              },
              message: [{ source: 'body' }]
            }
          }
        ]
      }).success
    ).toBe(false);
  });

  it('enforces replay and phase/result compatibility', () => {
    expect(
      slatesWebhookVerification.safeParse({
        mechanism: 'hub',
        baseline: 'receiver_path_secret',
        rules: [
          {
            ...hubDeliveryRule,
            result: { type: 'sync_only' },
            replay: { kind: 'not_applicable', reason: 'bootstrap_sync_only' }
          }
        ]
      }).success
    ).toBe(false);
    expect(
      slatesWebhookVerification.safeParse({
        mechanism: 'hub',
        baseline: 'receiver_path_secret',
        rules: [{ ...hubDeliveryRule, replay: undefined }]
      }).success
    ).toBe(false);
    expect(
      slatesWebhookVerification.safeParse({
        mechanism: 'hub',
        baseline: 'receiver_path_secret',
        allowedSecretRefs: [],
        rules: [
          {
            id: 'challenge.v1',
            phase: 'bootstrap',
            when: {
              methods: ['GET'],
              registrationStatuses: ['pending', 'registering'],
              matcher: { hasQueryParam: 'challenge' }
            },
            verify: { type: 'path_secret' },
            result: { type: 'sync_only' },
            replay: { kind: 'not_applicable', reason: 'bootstrap_sync_only' }
          }
        ]
      }).success
    ).toBe(true);
  });

  it('rejects statically overlapping sync and dispatch outcomes', () => {
    let bootstrapDispatch = {
      ...hubDeliveryRule,
      id: 'bootstrap.dispatch.v1',
      phase: 'bootstrap',
      replay: deliveryReplay
    };
    let bootstrapSync = {
      ...hubDeliveryRule,
      id: 'bootstrap.sync.v1',
      phase: 'bootstrap',
      result: { type: 'sync_only' },
      replay: { kind: 'not_applicable', reason: 'bootstrap_sync_only' }
    };
    expect(
      slatesWebhookVerification.safeParse({
        mechanism: 'hub',
        baseline: 'receiver_path_secret',
        rules: [bootstrapDispatch, bootstrapSync]
      }).success
    ).toBe(false);

    let catchAllPostDispatch = {
      ...bootstrapDispatch,
      when: { methods: ['POST'] }
    };
    let headerPostSync = {
      ...bootstrapSync,
      when: { methods: ['POST'], matcher: { hasHeader: 'X-Challenge' } }
    };
    expect(
      slatesWebhookVerification.safeParse({
        mechanism: 'hub',
        baseline: 'receiver_path_secret',
        rules: [catchAllPostDispatch, headerPostSync]
      }).success
    ).toBe(false);
  });

  it('accepts only preset fields declared by the selected reviewed verifier', () => {
    let stripeTimestampRule = {
      ...hubDeliveryRule,
      replay: {
        kind: 'enforced',
        freshness: {
          source: 'preset',
          presetField: 'timestamp',
          format: 'unix_seconds',
          maxAgeSeconds: 300,
          maxFutureSkewSeconds: 30
        }
      }
    };
    expect(
      slatesWebhookVerification.safeParse({
        mechanism: 'hub',
        baseline: 'receiver_path_secret',
        allowedSecretRefs: [],
        rules: [stripeTimestampRule]
      }).success
    ).toBe(true);

    expect(
      slatesWebhookVerification.safeParse({
        mechanism: 'hub',
        baseline: 'receiver_path_secret',
        rules: [
          {
            ...stripeTimestampRule,
            replay: {
              ...stripeTimestampRule.replay,
              freshness: {
                ...stripeTimestampRule.replay.freshness,
                presetField: 'subscription_id'
              }
            }
          }
        ]
      }).success
    ).toBe(false);
    expect(
      slatesWebhookVerification.safeParse({
        mechanism: 'hub',
        baseline: 'receiver_path_secret',
        rules: [
          {
            ...stripeTimestampRule,
            replay: {
              ...stripeTimestampRule.replay,
              freshness: {
                ...stripeTimestampRule.replay.freshness,
                presetField: 'arbitrary_vendor_field'
              }
            }
          }
        ]
      }).success
    ).toBe(false);
  });

  it('accepts exact bound secret refs and rejects invalid source shapes', () => {
    let validRefs = [
      {
        source: 'registration',
        name: 'registration_secret',
        registrationKey: 'signing_secret',
        encoding: 'utf8'
      },
      {
        source: 'generated',
        name: 'generated_secret',
        binding: 'receiver_trigger',
        encoding: 'hex'
      },
      {
        source: 'generated',
        name: 'receiver_secret',
        binding: 'receiver',
        encoding: 'utf8'
      },
      {
        source: 'config',
        name: 'config_secret',
        configKey: 'webhookSecret',
        encoding: 'base64'
      },
      {
        source: 'platform',
        name: 'platform_secret',
        credentialKey: 'signalSigningKey',
        encoding: 'base64url'
      }
    ];
    validRefs.forEach(secretRef =>
      expect(slatesWebhookSecretRef.safeParse(secretRef).success).toBe(true)
    );

    let invalidRefs = [
      { ...validRefs[0], encoding: 'raw' },
      { ...validRefs[0], registrationKey: '' },
      { ...validRefs[0], registrationKey: '/nested/arbitrary/path' },
      { ...validRefs[1], binding: 'provider' },
      { ...validRefs[3], configKey: 'x'.repeat(129) },
      { ...validRefs[0], configKey: 'cross_source' },
      { ...validRefs[1], registrationKey: 'cross_source' },
      { ...validRefs[3], credentialKey: 'cross_source' },
      { ...validRefs[4], configKey: 'cross_source' }
    ];
    invalidRefs.forEach(secretRef =>
      expect(slatesWebhookSecretRef.safeParse(secretRef).success).toBe(false)
    );
  });

  it('enforces unique published names and verifier access by explicit named refs', () => {
    let declaredSecret = {
      source: 'config',
      name: 'webhook_secret',
      configKey: 'webhookSecret',
      encoding: 'utf8'
    };
    let providerRule = {
      ...providerDeliveryRule,
      verify: {
        ...providerDeliveryRule.verify,
        allowedSecretRefs: ['webhook_secret']
      }
    };
    let valid = {
      mechanism: 'provider',
      baseline: 'receiver_path_secret',
      reason: 'reviewed',
      allowedSecretRefs: [declaredSecret],
      rules: [providerRule]
    };
    expect(slatesWebhookVerification.safeParse(valid).success).toBe(true);
    expect(
      slatesWebhookVerification.safeParse({
        ...valid,
        rules: [
          {
            ...providerRule,
            verify: { type: 'provider', verifierId: 'quickbooks.delivery.v1' }
          }
        ]
      }).success
    ).toBe(false);
    expect(
      slatesWebhookVerification.safeParse({
        ...valid,
        allowedSecretRefs: [declaredSecret, { ...declaredSecret, configKey: 'other' }]
      }).success
    ).toBe(false);
    expect(
      slatesWebhookVerification.safeParse({
        ...valid,
        rules: [
          {
            ...providerRule,
            verify: { ...providerRule.verify, allowedSecretRefs: ['undeclared'] }
          }
        ]
      }).success
    ).toBe(false);
    expect(
      slatesWebhookVerification.safeParse({
        ...valid,
        rules: [
          {
            ...providerRule,
            verify: {
              ...providerRule.verify,
              allowedSecretRefs: ['webhook_secret', 'webhook_secret']
            }
          }
        ]
      }).success
    ).toBe(false);
    expect(
      slatesWebhookVerification.safeParse({
        ...valid,
        suggestedSecrets: ['webhook_secret']
      }).success
    ).toBe(false);
    expect(
      slatesWebhookVerification.safeParse({
        mechanism: 'hub',
        baseline: 'receiver_path_secret',
        allowedSecretRefs: [],
        rules: [
          {
            ...hubDeliveryRule,
            verify: {
              type: 'static_token',
              secretName: 'undeclared',
              selector: { source: 'header', headerName: 'X-Webhook-Token' }
            }
          }
        ]
      }).success
    ).toBe(false);
  });
});

describe('webhook action specHash v1', () => {
  let cloneFixture = () =>
    JSON.parse(JSON.stringify(SLATE_WEBHOOK_ACTION_SPEC_HASH_FIXTURE_V1.action));

  it('matches the fixed cross-package fixture and RFC 8785 object-key ordering', () => {
    let action = cloneFixture();
    expect(computeWebhookActionSpecHashV1(action)).toBe(
      SLATE_WEBHOOK_ACTION_SPEC_HASH_FIXTURE_V1.expectedHash
    );

    let reordered = {
      invocation: {
        http: {
          ingress: action.invocation.http.ingress,
          sync: action.invocation.http.sync,
          methods: ['GET', 'POST'] as ('GET' | 'POST')[]
        },
        autoUnregistration: false,
        autoRegistration: true,
        type: 'webhook' as const
      },
      capabilities: {},
      type: 'action.trigger' as const,
      id: 'webhook.delivery'
    };
    expect(computeWebhookActionSpecHashV1(reordered)).toBe(
      SLATE_WEBHOOK_ACTION_SPEC_HASH_FIXTURE_V1.expectedHash
    );
    expect(canonicalizeJsonJcs({ z: 1, a: { y: 2, x: 3 } })).toBe('{"a":{"x":3,"y":2},"z":1}');
  });

  it('implements RFC 8785 number, string, Unicode, and undefined edge behavior', () => {
    expect(
      canonicalizeJsonJcs({ numbers: [333333333.3333333, 1e30, 4.5, 0.002, 1e-27, -0] })
    ).toBe('{"numbers":[333333333.3333333,1e+30,4.5,0.002,1e-27,0]}');
    expect(
      canonicalizeJsonJcs({
        '€': 'euro',
        '\r': 'carriage return',
        '😀': 'emoji',
        '1': 'one',
        ö: 'o diaeresis',
        '\u0080': 'control'
      })
    ).toBe(
      '{"\\r":"carriage return","1":"one","":"control","ö":"o diaeresis","€":"euro","😀":"emoji"}'
    );
    expect(canonicalizeJsonJcs({ included: true, omitted: undefined })).toBe(
      canonicalizeJsonJcs({ included: true })
    );
    expect(() => canonicalizeJsonJcs([undefined])).toThrow('JSON data model');
    expect(() => canonicalizeJsonJcs('\ud800')).toThrow('valid Unicode scalar values');
    expect(() => canonicalizeJsonJcs('\udc00')).toThrow('valid Unicode scalar values');
  });

  it('retains security-array order and changes for rule or secret-binding edits', () => {
    let action = cloneFixture();
    let rule = action.invocation.http.ingress.verification.rules[0];
    rule.verify.message.reverse();
    expect(computeWebhookActionSpecHashV1(action)).not.toBe(
      SLATE_WEBHOOK_ACTION_SPEC_HASH_FIXTURE_V1.expectedHash
    );

    action = cloneFixture();
    action.invocation.http.ingress.verification.rules[0].id = 'delivery.v2';
    expect(computeWebhookActionSpecHashV1(action)).not.toBe(
      SLATE_WEBHOOK_ACTION_SPEC_HASH_FIXTURE_V1.expectedHash
    );

    action = cloneFixture();
    action.invocation.http.ingress.verification.allowedSecretRefs[0].registrationKey =
      'rotated_signing_secret';
    expect(computeWebhookActionSpecHashV1(action)).not.toBe(
      SLATE_WEBHOOK_ACTION_SPEC_HASH_FIXTURE_V1.expectedHash
    );
  });

  it('excludes presentation and runtime-only values', () => {
    let action = {
      ...cloneFixture(),
      name: 'Changed presentation',
      description: 'Not security relevant',
      requestId: 'runtime-request',
      deliveryId: 'runtime-delivery',
      resolvedSecrets: { signing_secret: 'never hash this' },
      specHash: 'f'.repeat(64)
    };
    expect(computeWebhookActionSpecHashV1(action)).toBe(
      SLATE_WEBHOOK_ACTION_SPEC_HASH_FIXTURE_V1.expectedHash
    );
  });
});

describe('ingress matrix', () => {
  it.each(['hub', 'provider', 'path_secret_only'] as const)(
    'accepts an exact receiver-route %s declaration',
    mechanism => {
      let parsed = slatesWebhookIngress.parse(receiverIngress(mechanism));
      expect(parsed.baseline).toBe('receiver_path_secret');
    }
  );

  it('allows only exact Hub verification on a shared app route', () => {
    let parsed = slatesWebhookIngress.parse(sharedIngress);
    expect(parsed.baseline).toBe('app_route_secret');
    expect(
      slatesWebhookIngress.safeParse({
        ...sharedIngress,
        verification: receiverIngress('provider').verification
      }).success
    ).toBe(false);
    expect(
      slatesWebhookIngress.safeParse({
        ...sharedIngress,
        verification: receiverIngress('path_secret_only').verification
      }).success
    ).toBe(false);
    expect(
      slatesWebhookIngress.safeParse({
        ...sharedIngress,
        verification: {
          mechanism: 'hub',
          rules: [
            {
              ...hubDeliveryRule,
              verify: {
                type: 'raw_hmac',
                secretName: 'app-secret',
                algorithm: 'sha256',
                signature: {
                  headerName: 'X-Signature',
                  encoding: 'hex',
                  duplicateHeaderPolicy: 'reject',
                  multipleSignaturePolicy: 'reject'
                },
                message: [{ source: 'body' }]
              }
            }
          ]
        }
      }).success
    ).toBe(false);
  });

  it('rejects wrong or missing baseline literals', () => {
    expect(
      slatesWebhookIngress.safeParse({ ...receiverIngress('hub'), baseline: undefined })
        .success
    ).toBe(false);
    expect(
      slatesWebhookIngress.safeParse({
        ...sharedIngress,
        baseline: 'receiver_path_secret'
      }).success
    ).toBe(false);
  });
});

describe('safe failures', () => {
  it('accepts every closed safe rejection code', () => {
    SAFE_WEBHOOK_REJECTION_CODES.forEach(code => {
      expect(safeWebhookRejectionCode.safeParse(code).success).toBe(true);
    });
  });
});

describe('wire schemas', () => {
  it('preserves ordered duplicate headers and absent/present-empty/binary bodies', () => {
    let cases = [
      { present: false },
      { present: true, base64: '' },
      { present: true, base64: Buffer.from(Uint8Array.from([0, 255, 1])).toString('base64') }
    ];

    cases.forEach(body => {
      let request = {
        url: 'https://example.com/webhook?a=1&a=2',
        method: 'POST',
        headers: [
          ['X-Signature', 'first'],
          ['x-signature', 'second'],
          ['X-Comma', 'a,b']
        ],
        body
      };
      let parsed = webhookWireRequest.parse(JSON.parse(JSON.stringify(request)));
      expect(parsed).toEqual(request);
      expect(parsed.headers).toEqual(request.headers);
    });

    let response = {
      status: 202,
      headers: [
        ['Set-Cookie', 'a=1'],
        ['Set-Cookie', 'b=2']
      ],
      body: { present: true, base64: '' }
    };
    expect(webhookWireResponse.parse(JSON.parse(JSON.stringify(response)))).toEqual(response);
  });

  it('rejects record-shaped headers and non-canonical base64', () => {
    expect(
      webhookWireRequest.safeParse({
        url: 'https://example.com',
        method: 'POST',
        headers: { 'x-signature': 'value' },
        body: { present: false }
      }).success
    ).toBe(false);
    expect(
      webhookWireRequest.safeParse({
        url: 'https://example.com',
        method: 'POST',
        headers: [],
        body: { present: true, base64: 'not base64' }
      }).success
    ).toBe(false);
  });

  it('does not impose Task 5 capture-size limits on the Task 1 wire contract', () => {
    let body = Buffer.alloc(1024 * 1024 + 1, 7).toString('base64');
    expect(
      webhookWireRequest.safeParse({
        url: 'https://example.com',
        method: 'POST',
        headers: [],
        body: { present: true, base64: body }
      }).success
    ).toBe(true);
  });
});
