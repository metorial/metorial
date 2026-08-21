import { randomBytes, timingSafeEqual } from 'node:crypto';
import type { SlateWebhookHttpOptions } from 'slates';
import { TelegramClient } from './client';

let TOKEN_PATTERN = /^[A-Za-z0-9_-]{1,256}$/;

export let generateSecretToken = (): string => randomBytes(48).toString('base64url');

export let verifySecretToken = (request: Request, expectedToken: string): boolean => {
  let supplied = request.headers.get('x-telegram-bot-api-secret-token');
  if (!supplied || !TOKEN_PATTERN.test(supplied)) return false;
  let suppliedBytes = Buffer.from(supplied, 'utf8');
  if (!TOKEN_PATTERN.test(expectedToken)) return false;
  let expectedBytes = Buffer.from(expectedToken, 'utf8');
  return (
    suppliedBytes.length === expectedBytes.length &&
    timingSafeEqual(suppliedBytes, expectedBytes)
  );
};

export let telegramWebhookHttp = {
  methods: ['POST'],
  ingress: {
    kind: 'receiver_route',
    baseline: 'receiver_path_secret',
    verification: {
      mechanism: 'hub',
      baseline: 'receiver_path_secret',
      allowedSecretRefs: [
        {
          source: 'registration',
          name: 'telegram_secret_token',
          registrationKey: 'secretToken',
          encoding: 'utf8'
        }
      ],
      rules: [
        {
          id: 'telegram.delivery.v1',
          phase: 'delivery',
          when: { methods: ['POST'], registrationStatuses: ['registered'] },
          verify: {
            type: 'static_token',
            secretName: 'telegram_secret_token',
            selector: {
              source: 'header',
              headerName: 'x-telegram-bot-api-secret-token'
            }
          },
          result: { type: 'dispatch', scope: 'receiver_trigger' },
          replay: {
            kind: 'enforced',
            deduplicate: {
              source: 'json_pointer',
              pointer: '/update_id',
              ttlSeconds: 604_800,
              scope: 'request'
            }
          }
        }
      ]
    }
  }
} satisfies SlateWebhookHttpOptions;

type TelegramRegistrationContext = {
  auth: { token: string };
  input: {
    webhookBaseUrl: string;
    registrationDetails?: {
      secretToken?: string;
      allowedUpdates?: string[];
      singletonGeneration?: number;
      rotateSecret?: boolean;
    } | null;
  };
};

export let registerTelegramWebhook = async (
  ctx: TelegramRegistrationContext,
  triggerUpdates: readonly string[]
) => {
  let prior = ctx.input.registrationDetails;
  let secretToken =
    !prior?.rotateSecret && prior?.secretToken && TOKEN_PATTERN.test(prior.secretToken)
      ? prior.secretToken
      : generateSecretToken();
  let allowedUpdates = [
    ...new Set(
      (prior?.allowedUpdates?.length ? prior.allowedUpdates : triggerUpdates).filter(Boolean)
    )
  ].sort();
  let client = new TelegramClient(ctx.auth.token);
  await client.setWebhook({
    url: ctx.input.webhookBaseUrl,
    allowedUpdates,
    secretToken
  });
  return {
    registrationDetails: {
      secretToken,
      allowedUpdates,
      ...(prior?.singletonGeneration !== undefined
        ? { singletonGeneration: prior.singletonGeneration }
        : {})
    },
    capturedSecrets: { telegram_secret_token: secretToken }
  };
};

export let unregisterTelegramWebhook = async (ctx: { auth: { token: string } }) => {
  let client = new TelegramClient(ctx.auth.token);
  await client.deleteWebhook();
};
