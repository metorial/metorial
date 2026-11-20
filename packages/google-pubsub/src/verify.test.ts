// Offline protocol contracts; official push/JWT payloads:
// https://cloud.google.com/pubsub/docs/push
// https://cloud.google.com/pubsub/docs/authenticate-push-subscriptions
import { Buffer } from 'node:buffer';
import { createLocalJWKSet, errors, exportJWK, generateKeyPair, SignJWT } from 'jose';
import { beforeAll, describe, expect, it } from 'vitest';
import {
  createGooglePubSubPushVerifier,
  GOOGLE_PUBSUB_PROCESSING_GRACE_SECONDS,
  verifyGooglePubSubPushForProcessing
} from './verify';

let privateKey: CryptoKey;
let verify: ReturnType<typeof createGooglePubSubPushVerifier>;
let now = new Date('2026-11-10T12:00:00Z');
let seconds = now.getTime() / 1000;
let identity = {
  audience: 'https://callback.example/pubsub/registration-1',
  serviceAccountEmail: 'push@my-project.iam.gserviceaccount.com',
  subscriptionName: 'projects/my-project/subscriptions/events-1'
};
let body = () => ({
  message: {
    data: Buffer.from(
      JSON.stringify({ emailAddress: 'person@example.com', historyId: '987654321' })
    ).toString('base64'),
    attributes: {
      'ce-type': 'google.workspace.meet.conference.v2.started',
      bucketId: 'example-bucket'
    },
    messageId: '2070443601311540',
    message_id: '2070443601311540',
    publishTime: '2021-02-26T19:13:55.749Z',
    publish_time: '2021-02-26T19:13:55.749Z',
    orderingKey: 'ordering-key'
  },
  subscription: identity.subscriptionName,
  deliveryAttempt: 5
});

beforeAll(async () => {
  let keys = await generateKeyPair('RS256');
  privateKey = keys.privateKey;
  verify = createGooglePubSubPushVerifier(
    createLocalJWKSet({
      keys: [{ ...(await exportJWK(keys.publicKey)), kid: 'google-key', alg: 'RS256' }]
    })
  );
});

let token = (claims: Record<string, unknown> = {}, kid = 'google-key', key = privateKey) =>
  new SignJWT({
    iss: 'https://accounts.google.com',
    aud: identity.audience,
    email: identity.serviceAccountEmail,
    email_verified: true,
    sub: '1234567890',
    iat: seconds - 1800,
    exp: seconds + 1800,
    ...claims
  })
    .setProtectedHeader({ alg: 'RS256', kid })
    .sign(key);

let request = async (
  raw: string | Uint8Array = JSON.stringify(body()),
  claims: Record<string, unknown> = {}
) =>
  new Request(identity.audience, {
    method: 'POST',
    body: raw as BodyInit,
    headers: { authorization: `Bearer ${await token(claims)}` }
  });

describe('authenticated wrapped Google Pub/Sub push', () => {
  it('accepts an older, unexpired token and preserves metadata, JSON, and attributes', async () => {
    let result = await verify({ ...identity, now, request: await request() });
    expect(result).toEqual({
      ok: true,
      message: {
        subscription: identity.subscriptionName,
        messageId: '2070443601311540',
        publishTime: '2021-02-26T19:13:55.749Z',
        attributes: body().message.attributes,
        data: { emailAddress: 'person@example.com', historyId: '987654321' }
      }
    });
  });

  it.each([
    ['issuer', { iss: 'https://attacker.example' }],
    ['audience', { aud: 'https://callback.example/another-registration' }],
    ['array audience', { aud: [identity.audience] }],
    ['expiry', { exp: seconds - 61 }],
    ['missing expiry', { exp: undefined }],
    ['future issuance', { iat: seconds + 61 }],
    ['future not-before', { nbf: seconds + 61 }]
  ])('rejects invalid %s', async (_name, claims) => {
    expect(
      await verify({ ...identity, now, request: await request(undefined, claims) })
    ).toMatchObject({ ok: false, status: 401 });
  });

  it('tolerates a small clock difference with the issuer', async () => {
    expect(
      await verify({
        ...identity,
        now,
        request: await request(undefined, { iat: seconds + 30, nbf: seconds + 30 })
      })
    ).toMatchObject({ ok: true });
  });

  it.each([
    { email: 'other@my-project.iam.gserviceaccount.com' },
    { email_verified: false },
    { email_verified: 'true' }
  ])('rejects a different or unverified service account', async claims => {
    expect(
      await verify({ ...identity, now, request: await request(undefined, claims) })
    ).toMatchObject({ ok: false, status: 403, failure: 'identity_mismatch' });
  });

  it('rejects missing authorization, malformed tokens, and unsupported methods', async () => {
    expect(
      await verify({
        ...identity,
        now,
        request: new Request(identity.audience, { method: 'POST' })
      })
    ).toMatchObject({ ok: false, status: 401, failure: 'token_missing' });
    expect(
      await verify({
        ...identity,
        now,
        request: new Request(identity.audience, {
          method: 'POST',
          headers: { authorization: 'Bearer not-a-token' }
        })
      })
    ).toMatchObject({ status: 401 });
    expect(
      await verify({ ...identity, now, request: new Request(identity.audience) })
    ).toMatchObject({ status: 405 });
  });

  it('rejects a forged signature and unknown signing key', async () => {
    let otherKey = (await generateKeyPair('RS256')).privateKey;
    for (let jwt of [
      await token({}, 'google-key', otherKey),
      await token({}, 'unknown-key')
    ]) {
      let req = new Request(identity.audience, {
        method: 'POST',
        body: JSON.stringify(body()),
        headers: { authorization: `Bearer ${jwt}` }
      });
      expect(await verify({ ...identity, now, request: req })).toMatchObject({
        ok: false,
        status: 401
      });
    }
  });

  it('preserves retries for signing-key outages but rejects a genuinely unknown key', async () => {
    let offline = createGooglePubSubPushVerifier(async () => {
      throw new errors.JWKSTimeout();
    });
    expect(await offline({ ...identity, now, request: await request() })).toMatchObject({
      ok: false,
      status: 503,
      failure: 'signing_keys_unavailable'
    });
    let unknown = createGooglePubSubPushVerifier(async () => {
      throw new errors.JWKSNoMatchingKey();
    });
    expect(await unknown({ ...identity, now, request: await request() })).toMatchObject({
      ok: false,
      status: 401
    });
  });

  it('rejects another subscription even with a valid token', async () => {
    let payload = { ...body(), subscription: 'projects/my-project/subscriptions/other-sub' };
    expect(
      await verify({ ...identity, now, request: await request(JSON.stringify(payload)) })
    ).toMatchObject({ status: 403, failure: 'subscription_mismatch' });
  });

  it.each([
    '%%%=',
    'Zh==',
    Buffer.from([0xff]).toString('base64'),
    Buffer.from('{not-json').toString('base64')
  ])('rejects malformed base64, UTF-8, or JSON data: %s', async data => {
    let payload = body();
    payload.message.data = data;
    expect(
      await verify({ ...identity, now, request: await request(JSON.stringify(payload)) })
    ).toMatchObject({ status: 400, failure: 'data_invalid' });
  });

  it('rejects invalid body encoding and conflicting aliases', async () => {
    for (let raw of [new Uint8Array([0xff]), '{invalid']) {
      expect(await verify({ ...identity, now, request: await request(raw) })).toMatchObject({
        status: 400,
        failure: 'body_invalid'
      });
    }
    let payload = body();
    payload.message.message_id = 'different';
    expect(
      await verify({ ...identity, now, request: await request(JSON.stringify(payload)) })
    ).toMatchObject({ status: 400 });
  });

  it('verifies against a saved delivery config', async () => {
    let deliveryConfig = {
      audience: identity.audience,
      pushServiceAccountEmail: identity.serviceAccountEmail,
      subscriptionName: identity.subscriptionName
    };
    expect(await verify({ deliveryConfig, now, request: await request() })).toMatchObject({
      ok: true
    });
    expect(
      await verify({
        deliveryConfig: { ...deliveryConfig, pushServiceAccountEmail: 'other@example.com' },
        now,
        request: await request()
      })
    ).toMatchObject({ ok: false, status: 403, failure: 'identity_mismatch' });
  });

  it('accepts an expired token only within the processing grace, keeping other checks', async () => {
    let grace = GOOGLE_PUBSUB_PROCESSING_GRACE_SECONDS;
    let expired = { iat: seconds - grace, exp: seconds - grace + 3600 };
    expect(
      await verify({ ...identity, now, request: await request(undefined, expired) })
    ).toMatchObject({ ok: false, status: 401, failure: 'token_invalid' });
    expect(
      await verify({
        ...identity,
        now,
        expiredTokenGraceSeconds: grace,
        request: await request(undefined, expired)
      })
    ).toMatchObject({ ok: true });
    for (let claims of [
      { iat: seconds - grace - 7200, exp: seconds - grace - 3600 },
      { ...expired, aud: 'https://callback.example/another-registration' },
      { ...expired, iss: 'https://attacker.example' },
      { ...expired, nbf: seconds + 3600 }
    ])
      expect(
        await verify({
          ...identity,
          now,
          expiredTokenGraceSeconds: grace,
          request: await request(undefined, claims)
        })
      ).toMatchObject({ ok: false, status: 401 });
    expect(
      await verify({
        ...identity,
        now,
        expiredTokenGraceSeconds: grace,
        request: await request(undefined, { ...expired, email_verified: false })
      })
    ).toMatchObject({ ok: false, status: 403, failure: 'identity_mismatch' });
    let otherKey = (await generateKeyPair('RS256')).privateKey;
    let forged = await token(expired, 'google-key', otherKey);
    expect(
      await verify({
        ...identity,
        now,
        expiredTokenGraceSeconds: grace,
        request: new Request(identity.audience, {
          method: 'POST',
          body: JSON.stringify(body()),
          headers: { authorization: `Bearer ${forged}` }
        })
      })
    ).toMatchObject({ ok: false, status: 401 });
    expect(
      await verify({
        ...identity,
        now,
        expiredTokenGraceSeconds: -1,
        request: await request()
      })
    ).toMatchObject({ ok: false, status: 500, failure: 'registration_invalid' });
  });

  it('verifies for processing with the grace and turns a failure into a skipped result', async () => {
    let grace = GOOGLE_PUBSUB_PROCESSING_GRACE_SECONDS;
    let deliveryConfig = {
      audience: identity.audience,
      pushServiceAccountEmail: identity.serviceAccountEmail,
      subscriptionName: identity.subscriptionName
    };
    let atNow: typeof verify = options => verify({ ...options, now });
    let expired = { iat: seconds - grace, exp: seconds - grace + 3600 };
    expect(
      await verifyGooglePubSubPushForProcessing(
        await request(undefined, expired),
        deliveryConfig,
        atNow
      )
    ).toMatchObject({ ok: true, message: { messageId: '2070443601311540' } });
    expect(
      await verifyGooglePubSubPushForProcessing(
        await request(undefined, { email_verified: false }),
        deliveryConfig,
        atNow
      )
    ).toEqual({
      ok: false,
      skipped: {
        events: [],
        skipped: { reason: 'identity_mismatch' },
        response: { status: 403 }
      }
    });
  });

  it('accepts attribute-only notifications and snake_case metadata', async () => {
    // https://cloud.google.com/pubsub/docs/reference/rest/v1/PubsubMessage
    let payload = {
      subscription: identity.subscriptionName,
      message: {
        attributes: { eventType: 'OBJECT_FINALIZE' },
        message_id: '123',
        publish_time: body().message.publishTime
      }
    };
    expect(
      await verify({ ...identity, now, request: await request(JSON.stringify(payload)) })
    ).toMatchObject({
      ok: true,
      message: { messageId: '123', attributes: { eventType: 'OBJECT_FINALIZE' } }
    });
  });
});
