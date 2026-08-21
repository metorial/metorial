import { SlateTrigger, type SlateWebhookSecretRef, type SlateWebhookVerifier } from 'slates';
import { spec } from '../../spec';
import {
  mapWebhookVerificationEvent,
  mapWebhookVerificationRequest,
  registerWebhookVerificationCredential,
  TEST_ED25519_PUBLIC_KEY_HEX,
  TEST_HMAC_SECRET,
  TEST_STATIC_TOKEN,
  webhookVerificationEchoSchema
} from './shared';

type RegistrationSecretRef = Extract<SlateWebhookSecretRef, { source: 'registration' }>;

type VerificationActionDefinition = {
  key: string;
  name: string;
  description: string;
  secretRef: RegistrationSecretRef;
  credentialValue: string;
  verify: SlateWebhookVerifier;
};

let createVerificationAction = (definition: VerificationActionDefinition) =>
  SlateTrigger.create(spec, {
    key: definition.key,
    name: definition.name,
    description: definition.description,
    eventTypes: [`test.webhook.${definition.key}`]
  })
    .input(webhookVerificationEchoSchema)
    .output(webhookVerificationEchoSchema)
    .webhook({
      http: {
        methods: ['POST'],
        ingress: {
          kind: 'receiver_route',
          baseline: 'receiver_path_secret',
          verification: {
            mechanism: 'hub',
            baseline: 'receiver_path_secret',
            allowedSecretRefs: [definition.secretRef],
            rules: [
              {
                id: 'delivery.v1',
                phase: 'delivery',
                when: { methods: ['POST'] },
                verify: definition.verify,
                result: { type: 'dispatch', scope: 'receiver_trigger' },
                replay: {
                  kind: 'enforced',
                  deduplicate: {
                    source: 'json_pointer',
                    pointer: '/event_id',
                    ttlSeconds: 3_600,
                    scope: 'request'
                  }
                }
              }
            ]
          }
        }
      },
      handleRequest: async ctx => ({
        inputs: [await mapWebhookVerificationRequest(ctx.request)]
      }),
      handleEvent: async ctx => mapWebhookVerificationEvent(definition.key, ctx.input),
      autoRegisterWebhook: async () =>
        registerWebhookVerificationCredential({
          name: definition.secretRef.name,
          value: definition.credentialValue
        })
    })
    .build();

let staticTokenSecret: RegistrationSecretRef = {
  source: 'registration',
  name: 'static_token',
  registrationKey: 'staticToken',
  encoding: 'utf8'
};

export let verifyStaticHeader = createVerificationAction({
  key: 'verify_static_header',
  name: 'Verify Static Header',
  description: 'Receives webhook deliveries authenticated by a static header token.',
  secretRef: staticTokenSecret,
  credentialValue: TEST_STATIC_TOKEN,
  verify: {
    type: 'static_token',
    secretName: 'static_token',
    selector: { source: 'header', headerName: 'x-test-api-key' }
  }
});

export let verifyStaticQuery = createVerificationAction({
  key: 'verify_static_query',
  name: 'Verify Static Query',
  description: 'Receives webhook deliveries authenticated by a static query token.',
  secretRef: staticTokenSecret,
  credentialValue: TEST_STATIC_TOKEN,
  verify: {
    type: 'static_token',
    secretName: 'static_token',
    selector: { source: 'query', queryParam: 'api_key' }
  }
});

export let verifyStaticJson = createVerificationAction({
  key: 'verify_static_json',
  name: 'Verify Static JSON',
  description: 'Receives webhook deliveries authenticated by a static JSON token.',
  secretRef: staticTokenSecret,
  credentialValue: TEST_STATIC_TOKEN,
  verify: {
    type: 'static_token',
    secretName: 'static_token',
    selector: { source: 'json_pointer', pointer: '/api_key' }
  }
});

export let verifyRawHmac = createVerificationAction({
  key: 'verify_raw_hmac',
  name: 'Verify Raw HMAC',
  description: 'Receives webhook deliveries authenticated by a raw-body HMAC signature.',
  secretRef: {
    source: 'registration',
    name: 'hmac_secret',
    registrationKey: 'hmacSecret',
    encoding: 'utf8'
  },
  credentialValue: TEST_HMAC_SECRET,
  verify: {
    type: 'raw_hmac',
    secretName: 'hmac_secret',
    algorithm: 'sha256',
    signature: {
      headerName: 'x-test-signature',
      encoding: 'hex',
      duplicateHeaderPolicy: 'reject',
      multipleSignaturePolicy: 'reject'
    },
    message: [{ source: 'body' }]
  }
});

export let verifyEd25519 = createVerificationAction({
  key: 'verify_ed25519',
  name: 'Verify Ed25519',
  description: 'Receives webhook deliveries authenticated by an Ed25519 signature.',
  secretRef: {
    source: 'registration',
    name: 'ed25519_public_key',
    registrationKey: 'ed25519PublicKey',
    encoding: 'hex'
  },
  credentialValue: TEST_ED25519_PUBLIC_KEY_HEX,
  verify: {
    type: 'ed25519',
    publicKeyName: 'ed25519_public_key',
    publicKeyEncoding: 'hex',
    signature: {
      headerName: 'x-test-ed25519-signature',
      encoding: 'hex',
      duplicateHeaderPolicy: 'reject',
      multipleSignaturePolicy: 'reject'
    },
    message: [{ source: 'header', headerName: 'x-test-timestamp' }, { source: 'body' }]
  }
});
