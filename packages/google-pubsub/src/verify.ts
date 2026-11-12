import { Buffer } from 'node:buffer';
import { ServiceError } from '@lowerdeck/error';
import {
  createRemoteJWKSet,
  decodeProtectedHeader,
  errors,
  type JWTPayload,
  type JWTVerifyGetKey,
  jwtVerify
} from 'jose';
import { createApiServiceError, skipWebhook } from 'slates';
import { z } from 'zod';
import type { GooglePubSubInfrastructure } from './infrastructure';
import type { PubSubMessage, PubSubPushIdentity } from './types';

const GOOGLE_PUBSUB_JWKS_URL = 'https://www.googleapis.com/oauth2/v3/certs';
const GOOGLE_PUBSUB_ISSUERS = ['https://accounts.google.com', 'accounts.google.com'];

const CLOCK_TOLERANCE_SECONDS = 60;

/**
 * Grace past expiry for a push the runtime already authenticated: covers 25 retries
 * (backoff capped at 10 minutes, about three hours) plus backlog, yet refuses old tokens.
 */
export const GOOGLE_PUBSUB_PROCESSING_GRACE_SECONDS = 24 * 60 * 60;

let googleKeys = createRemoteJWKSet(new URL(GOOGLE_PUBSUB_JWKS_URL), {
  timeoutDuration: 10_000,
  cooldownDuration: 60_000,
  cacheMaxAge: 60 * 60 * 1_000
});

export type PubSubPushFailure =
  | 'method_invalid'
  | 'registration_invalid'
  | 'token_missing'
  | 'token_invalid'
  | 'identity_mismatch'
  | 'signing_keys_unavailable'
  | 'body_invalid'
  | 'subscription_mismatch'
  | 'data_invalid';

export type PubSubPushVerification =
  | { ok: true; message: PubSubMessage }
  | {
      ok: false;
      status: 400 | 401 | 403 | 405 | 500 | 503;
      failure: PubSubPushFailure;
    };

let failure = (
  reason: PubSubPushFailure,
  status: 400 | 401 | 403 | 405 | 500 | 503
): PubSubPushVerification => ({ ok: false, status, failure: reason });

let envelopeSchema = z.object({
  subscription: z.string().min(1),
  message: z.object({
    data: z.string().optional(),
    attributes: z.record(z.string(), z.string()).default({}),
    messageId: z.string().min(1).optional(),
    message_id: z.string().min(1).optional(),
    publishTime: z.iso.datetime({ offset: true }).optional(),
    publish_time: z.iso.datetime({ offset: true }).optional()
  })
});

export type GooglePubSubPushVerifyOptions = {
  request: Request;
  now?: Date;
  /** Seconds past expiry to accept; only for runtime-verified deliveries. */
  expiredTokenGraceSeconds?: number;
} & (
  | {
      infrastructure: Pick<
        GooglePubSubInfrastructure,
        'audience' | 'pushServiceAccountEmail' | 'subscriptionName'
      >;
    }
  | PubSubPushIdentity
);

/** The key resolver is injectable for offline cryptographic contract tests. */
export let createGooglePubSubPushVerifier = (keyResolver: JWTVerifyGetKey = googleKeys) => {
  let resolveKeys: JWTVerifyGetKey = async (header, token) => {
    try {
      return await keyResolver(header, token);
    } catch (error) {
      // Compared by code so a resolver built on another jose copy is still recognised.
      if ((error as { code?: unknown } | null)?.code === 'ERR_JWKS_NO_MATCHING_KEY')
        throw error;
      throw createApiServiceError('Google signing keys are temporarily unavailable.', {
        reason: 'google_pubsub_signing_keys_unavailable'
      });
    }
  };

  return async (options: GooglePubSubPushVerifyOptions): Promise<PubSubPushVerification> => {
    let { request } = options;
    let identity: PubSubPushIdentity =
      'infrastructure' in options
        ? {
            audience: options.infrastructure.audience,
            serviceAccountEmail: options.infrastructure.pushServiceAccountEmail,
            subscriptionName: options.infrastructure.subscriptionName
          }
        : options;
    let graceSeconds = options.expiredTokenGraceSeconds ?? 0;
    if (
      !identity.audience?.trim() ||
      !identity.serviceAccountEmail?.trim() ||
      !/^projects\/[^/]+\/subscriptions\/[^/]+$/.test(identity.subscriptionName) ||
      !Number.isFinite(graceSeconds) ||
      graceSeconds < 0
    ) {
      return failure('registration_invalid', 500);
    }
    if (request.method !== 'POST') return failure('method_invalid', 405);
    let authorization = request.headers.get('authorization');
    if (!authorization) return failure('token_missing', 401);
    let match = /^Bearer ([A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)$/i.exec(
      authorization
    );
    if (!match) return failure('token_invalid', 401);

    try {
      let header = decodeProtectedHeader(match[1]!);
      if (header.alg !== 'RS256' || typeof header.kid !== 'string' || !header.kid) {
        return failure('token_invalid', 401);
      }
      let now = options.now ?? new Date();
      let nowSeconds = Math.floor(now.getTime() / 1000);
      let payload: JWTPayload;
      try {
        ({ payload } = await jwtVerify(match[1]!, resolveKeys, {
          algorithms: ['RS256'],
          issuer: GOOGLE_PUBSUB_ISSUERS,
          audience: identity.audience,
          requiredClaims: ['exp', 'iat', 'sub'],
          currentDate: now,
          clockTolerance: CLOCK_TOLERANCE_SECONDS
        }));
      } catch (error) {
        // jose checks everything else before expiry, so an expired-token error carries a verified payload.
        if (!(graceSeconds > 0 && error instanceof errors.JWTExpired && error.claim === 'exp'))
          throw error;
        payload = error.payload;
        if (
          typeof payload.exp !== 'number' ||
          payload.exp + graceSeconds + CLOCK_TOLERANCE_SECONDS <= nowSeconds
        )
          throw error;
      }
      // Tokens can be up to an hour old. Enforce expiry/future issuance, not a webhook age limit.
      if (
        typeof payload.iat !== 'number' ||
        payload.iat > nowSeconds + CLOCK_TOLERANCE_SECONDS ||
        payload.aud !== identity.audience
      )
        return failure('token_invalid', 401);
      if (payload.email !== identity.serviceAccountEmail || payload.email_verified !== true) {
        return failure('identity_mismatch', 403);
      }
    } catch (error) {
      if (
        error instanceof ServiceError &&
        error.data.reason === 'google_pubsub_signing_keys_unavailable'
      ) {
        return failure('signing_keys_unavailable', 503);
      }
      return failure('token_invalid', 401);
    }

    let parsed: ReturnType<typeof envelopeSchema.safeParse>;
    try {
      // Fatal decoding rejects invalid UTF-8 instead of silently replacing bytes.
      let raw = new TextDecoder('utf-8', { fatal: true }).decode(await request.arrayBuffer());
      parsed = envelopeSchema.safeParse(JSON.parse(raw));
    } catch {
      return failure('body_invalid', 400);
    }
    if (!parsed.success) return failure('body_invalid', 400);
    let { message, subscription } = parsed.data;
    if (subscription !== identity.subscriptionName)
      return failure('subscription_mismatch', 403);
    let messageId = message.messageId ?? message.message_id;
    let publishTime = message.publishTime ?? message.publish_time;
    if (
      !messageId ||
      !publishTime ||
      (message.messageId !== undefined &&
        message.message_id !== undefined &&
        message.messageId !== message.message_id) ||
      (message.publishTime !== undefined &&
        message.publish_time !== undefined &&
        message.publishTime !== message.publish_time) ||
      (!message.data && Object.keys(message.attributes).length === 0)
    ) {
      return failure('body_invalid', 400);
    }

    let data: unknown;
    if (message.data) {
      // Node's base64 decoder is permissive. Reject malformed encodings and noncanonical pad bits.
      if (
        !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(message.data)
      ) {
        return failure('data_invalid', 400);
      }
      let bytes = Buffer.from(message.data, 'base64');
      if (bytes.toString('base64') !== message.data) return failure('data_invalid', 400);
      try {
        data = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
      } catch {
        return failure('data_invalid', 400);
      }
    }
    return {
      ok: true,
      message: {
        subscription,
        messageId,
        publishTime,
        attributes: message.attributes,
        ...(data !== undefined ? { data } : {})
      }
    };
  };
};

export let verifyGooglePubSubPush = createGooglePubSubPushVerifier();

/**
 * Verifies a push in a `process` handler, accepting a token that expired while it waited.
 * A failure carries the skipped result to return.
 */
export let verifyGooglePubSubPushForProcessing = async (
  request: Request,
  infrastructure: Pick<
    GooglePubSubInfrastructure,
    'audience' | 'pushServiceAccountEmail' | 'subscriptionName'
  >,
  verify: typeof verifyGooglePubSubPush = verifyGooglePubSubPush
) => {
  let verified = await verify({
    request,
    infrastructure,
    expiredTokenGraceSeconds: GOOGLE_PUBSUB_PROCESSING_GRACE_SECONDS
  });
  return verified.ok
    ? verified
    : {
        ok: false as const,
        skipped: skipWebhook(verified.failure, { status: verified.status })
      };
};
