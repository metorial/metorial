// Authenticating pushes received through a delivery config, with genuinely signed tokens checked
// by the real verifier against a local key. Official push and token contracts:
// https://cloud.google.com/pubsub/docs/push
// https://cloud.google.com/pubsub/docs/authenticate-push-subscriptions
// Producer identities: https://developers.google.com/workspace/gmail/api/guides/push,
// https://developers.google.com/workspace/forms/api/guides/push-notifications,
// https://developers.google.com/workspace/events/guides/events-meet,
// https://cloud.google.com/storage/docs/pubsub-notifications
import { Buffer } from 'node:buffer';
import {
  createLocalJWKSet,
  exportJWK,
  generateKeyPair,
  type JWTVerifyGetKey,
  SignJWT
} from 'jose';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { googlePubSubDeliveryConfig } from './deliveryConfig';
import { googlePubSubRoutingKey } from './routing';

let keys = vi.hoisted(() => ({
  resolve: undefined as JWTVerifyGetKey | undefined,
  unavailable: false
}));

vi.mock('./verify', async original => {
  let actual = await original<typeof import('./verify')>();
  return {
    ...actual,
    verifyGooglePubSubPush: actual.createGooglePubSubPushVerifier(async (header, token) => {
      if (keys.unavailable) throw new Error('Google signing keys are unreachable.');
      return keys.resolve!(header, token);
    })
  };
});

let deliveryConfig = {
  projectId: 'delivery-project',
  topicName: 'projects/delivery-project/topics/events',
  subscriptionName: 'projects/delivery-project/subscriptions/events',
  pushServiceAccountEmail: 'push@delivery-project.iam.gserviceaccount.com',
  audience: 'https://delivery.example/receive/config'
};

let privateKey: CryptoKey;
let otherKey: CryptoKey;

beforeAll(async () => {
  let pair = await generateKeyPair('RS256');
  privateKey = pair.privateKey;
  otherKey = (await generateKeyPair('RS256')).privateKey;
  keys.resolve = createLocalJWKSet({
    keys: [{ ...(await exportJWK(pair.publicKey)), kid: 'google-key', alg: 'RS256' }]
  });
});

beforeEach(() => {
  keys.unavailable = false;
});

let token = (claims: Record<string, unknown> = {}, key = privateKey) => {
  let issuedAt = Math.floor(Date.now() / 1000) - 1800;
  return new SignJWT({
    iss: 'https://accounts.google.com',
    aud: deliveryConfig.audience,
    email: deliveryConfig.pushServiceAccountEmail,
    email_verified: true,
    sub: '100000000000000000000',
    iat: issuedAt,
    exp: issuedAt + 3600,
    ...claims
  })
    .setProtectedHeader({ alg: 'RS256', kid: 'google-key' })
    .sign(key);
};

let envelope = (message: { data?: unknown; attributes?: Record<string, string> }) => ({
  subscription: deliveryConfig.subscriptionName,
  message: {
    attributes: message.attributes ?? {},
    ...(message.data === undefined
      ? {}
      : { data: Buffer.from(JSON.stringify(message.data)).toString('base64') }),
    messageId: '2070443601311540',
    publishTime: '2026-11-10T12:00:00.000Z'
  }
});

let push = async (
  body: unknown,
  options: { claims?: Record<string, unknown>; key?: CryptoKey; method?: string } = {}
) =>
  new Request(deliveryConfig.audience, {
    method: options.method ?? 'POST',
    headers: { authorization: `Bearer ${await token(options.claims, options.key)}` },
    ...(options.method === 'GET' ? {} : { body: JSON.stringify(body) })
  });

let authenticate = async (
  product: Parameters<typeof googlePubSubDeliveryConfig>[0],
  request: Request,
  saved: { deliveryConfig: unknown } = { deliveryConfig }
) =>
  googlePubSubDeliveryConfig(product).authenticate({
    input: { request, ...saved }
  } as Parameters<ReturnType<typeof googlePubSubDeliveryConfig>['authenticate']>[0]);

describe('delivery config authenticate', () => {
  it.each([
    [
      'gmail',
      { data: { emailAddress: 'User@Example.com', historyId: 9876543210 } },
      googlePubSubRoutingKey.gmail('user@example.com')
    ],
    [
      'forms',
      { attributes: { formId: 'form-1', eventType: 'RESPONSES', watchId: 'watch-1' } },
      googlePubSubRoutingKey.forms('form-1')
    ],
    [
      'meet',
      {
        attributes: {
          'ce-source': '//workspaceevents.googleapis.com/subscriptions/sub-1',
          'ce-type': 'google.workspace.meet.transcript.v2.fileGenerated'
        },
        data: { transcript: { name: 'conferenceRecords/c/transcripts/t' } }
      },
      googlePubSubRoutingKey.meet('subscriptions/sub-1')
    ],
    [
      'storage',
      {
        attributes: {
          bucketId: 'bucket-1',
          notificationConfig: 'projects/_/buckets/bucket-1/notificationConfigs/7'
        },
        data: { bucket: 'bucket-1', name: 'object.txt' }
      },
      googlePubSubRoutingKey.storage('bucket-1', '7')
    ]
  ] as const)('names the %s registrations a verified push addresses', async (product, message, key) => {
    expect(await authenticate(product, await push(envelope(message)))).toEqual({
      routingKeys: [key]
    });
  });

  it('acknowledges a verified push without a producer identity', async () => {
    expect(
      await authenticate('gmail', await push(envelope({ data: { historyId: '1' } })))
    ).toEqual({ routingKeys: [] });
    expect(await authenticate('forms', await push(envelope({ data: {} })))).toEqual({
      routingKeys: []
    });
  });

  it.each([
    ['body_invalid', 'not an envelope'],
    ['data_invalid', { ...envelope({}), message: { ...envelope({}).message, data: '%%%' } }],
    [
      'subscription_mismatch',
      {
        ...envelope({ data: {} }),
        subscription: 'projects/delivery-project/subscriptions/other'
      }
    ]
  ])('acknowledges an authenticated push that can never be routed (%s)', async (_, body) => {
    expect(await authenticate('gmail', await push(body))).toEqual({ routingKeys: [] });
  });

  it('rejects an unauthenticated push with the status of the failed check', async () => {
    let body = envelope({ data: { emailAddress: 'user@example.com', historyId: '1' } });
    let unsigned = new Request(deliveryConfig.audience, {
      method: 'POST',
      body: JSON.stringify(body)
    });
    expect(await authenticate('gmail', unsigned)).toEqual({ rejected: { status: 401 } });
    expect(await authenticate('gmail', await push(body, { key: otherKey }))).toEqual({
      rejected: { status: 401 }
    });
    expect(
      await authenticate(
        'gmail',
        await push(body, { claims: { aud: 'https://delivery.example/receive/other' } })
      )
    ).toEqual({ rejected: { status: 401 } });
    expect(
      await authenticate(
        'gmail',
        await push(body, {
          claims: { email: 'other@delivery-project.iam.gserviceaccount.com' }
        })
      )
    ).toEqual({ rejected: { status: 403 } });
    expect(await authenticate('gmail', await push(body, { method: 'GET' }))).toEqual({
      rejected: { status: 405 }
    });
  });

  it('allows no expiry grace on receipt', async () => {
    let issuedAt = Math.floor(Date.now() / 1000) - 3 * 3600;
    let expired = await push(envelope({ data: { emailAddress: 'user@example.com' } }), {
      claims: { iat: issuedAt, exp: issuedAt + 3600 }
    });
    expect(await authenticate('gmail', expired)).toEqual({ rejected: { status: 401 } });
  });

  it('answers a signing-key outage with 503 so the sender retries', async () => {
    let request = await push(envelope({ data: { emailAddress: 'user@example.com' } }));
    keys.unavailable = true;
    expect(await authenticate('gmail', request)).toEqual({ rejected: { status: 503 } });
  });

  it.each([
    ['no saved config', undefined],
    ['a saved config that is not an object', 'config'],
    ['a config nested under another key', { googlePubSub: deliveryConfig }],
    [
      'a config with an HTTP audience',
      { ...deliveryConfig, audience: 'http://delivery.example/x' }
    ]
  ])('rejects a push for %s without verifying it', async (_, config) => {
    keys.unavailable = true;
    let request = await push(envelope({ data: { emailAddress: 'user@example.com' } }));
    expect(await authenticate('gmail', request, { deliveryConfig: config })).toEqual({
      rejected: { status: 404 }
    });
  });
});
