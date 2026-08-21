import { createHash } from 'node:crypto';
import {
  decodeWebhookWireBody,
  getWebhookHeaderValues,
  type SlateWebhookHttpOptions,
  type WebhookWireRequest
} from '@slates/provider';
import { PayPalClient } from './client';

let REQUIRED_HEADERS = {
  authAlgo: 'paypal-auth-algo',
  certUrl: 'paypal-cert-url',
  transmissionId: 'paypal-transmission-id',
  transmissionSig: 'paypal-transmission-sig',
  transmissionTime: 'paypal-transmission-time'
} as const;

export let paypalWebhookHttp = {
  methods: ['POST'],
  ingress: {
    kind: 'receiver_route',
    baseline: 'receiver_path_secret',
    verification: {
      mechanism: 'provider',
      baseline: 'receiver_path_secret',
      reason: 'PayPal verifies signed deliveries through its webhook verification API.',
      allowedSecretRefs: [
        {
          source: 'registration',
          name: 'paypal_webhook_id',
          registrationKey: 'webhookId',
          encoding: 'utf8'
        },
        {
          source: 'auth_config',
          name: 'paypal_access_token',
          credentialKey: 'token',
          encoding: 'utf8'
        },
        {
          source: 'auth_config',
          name: 'paypal_client_id',
          credentialKey: 'clientId',
          encoding: 'utf8'
        },
        {
          source: 'auth_config',
          name: 'paypal_client_secret',
          credentialKey: 'clientSecret',
          encoding: 'utf8'
        },
        {
          source: 'auth_config',
          name: 'paypal_environment',
          credentialKey: 'environment',
          encoding: 'utf8'
        }
      ],
      rules: [
        {
          id: 'paypal.delivery.v1',
          phase: 'delivery',
          when: { methods: ['POST'] },
          verify: {
            type: 'provider',
            verifierId: 'paypal.delivery.v1',
            allowedSecretRefs: [
              'paypal_webhook_id',
              'paypal_access_token',
              'paypal_client_id',
              'paypal_client_secret',
              'paypal_environment'
            ],
            allowedBootstrapCaptureRefs: []
          },
          result: { type: 'dispatch', scope: 'receiver_trigger' },
          replay: {
            kind: 'enforced',
            freshness: {
              source: 'preset',
              presetField: 'timestamp',
              format: 'rfc3339',
              maxAgeSeconds: 86_400,
              maxFutureSkewSeconds: 300
            },
            deduplicate: {
              source: 'preset',
              presetField: 'delivery_id',
              ttlSeconds: 2_592_000,
              scope: 'request'
            }
          }
        }
      ]
    }
  }
} satisfies SlateWebhookHttpOptions;

export let paypalRegistrationResult = (webhookId: string) => ({
  registrationDetails: { webhookId },
  capturedSecrets: { paypal_webhook_id: webhookId }
});

let oneHeader = (request: WebhookWireRequest, name: string) => {
  let values = getWebhookHeaderValues(request, name);
  return values.length === 1 && values[0]!.trim().length > 0 ? values[0]!.trim() : null;
};

export let verifyPayPalWebhook = async (ctx: {
  input: { originalRequest: WebhookWireRequest };
  secrets: Record<string, { value: string } | undefined>;
}) => {
  let headers = Object.fromEntries(
    Object.entries(REQUIRED_HEADERS).map(([key, name]) => [
      key,
      oneHeader(ctx.input.originalRequest, name)
    ])
  ) as Record<keyof typeof REQUIRED_HEADERS, string | null>;
  let webhookId = ctx.secrets.paypal_webhook_id?.value;
  let token = ctx.secrets.paypal_access_token?.value;
  let clientId = ctx.secrets.paypal_client_id?.value;
  let clientSecret = ctx.secrets.paypal_client_secret?.value;
  let environment = ctx.secrets.paypal_environment?.value;
  if (
    !webhookId ||
    !token ||
    !clientId ||
    !clientSecret ||
    !environment ||
    Object.values(headers).some(value => !value)
  ) {
    return { status: 'rejected' as const, code: 'credential_missing' as const };
  }

  let bytes = decodeWebhookWireBody(ctx.input.originalRequest.body);
  if (bytes === null) {
    return { status: 'rejected' as const, code: 'wire_input_malformed' as const };
  }
  let webhookEvent: Record<string, any>;
  try {
    let parsed = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error();
    webhookEvent = parsed;
  } catch {
    return { status: 'rejected' as const, code: 'wire_input_malformed' as const };
  }
  let eventId = typeof webhookEvent.id === 'string' ? webhookEvent.id : null;
  if (!eventId) {
    return { status: 'rejected' as const, code: 'wire_input_malformed' as const };
  }

  try {
    let client = new PayPalClient({ token, clientId, clientSecret, environment });
    let result = await client.verifyWebhookSignature({
      authAlgo: headers.authAlgo!,
      certUrl: headers.certUrl!,
      transmissionId: headers.transmissionId!,
      transmissionSig: headers.transmissionSig!,
      transmissionTime: headers.transmissionTime!,
      webhookId,
      webhookEvent
    });
    if (result.verificationStatus !== 'SUCCESS') {
      return { status: 'rejected' as const, code: 'credential_invalid' as const };
    }
    let deliveryId = createHash('sha256')
      .update(headers.transmissionId!)
      .update('\0')
      .update(headers.transmissionTime!)
      .update('\0')
      .update(eventId)
      .update('\0')
      .update(webhookId)
      .digest('hex');
    return {
      status: 'accepted' as const,
      selection: { scope: 'receiver_trigger' as const },
      authenticatedFields: {
        timestamp: headers.transmissionTime!,
        event_id: eventId,
        delivery_id: deliveryId
      }
    };
  } catch {
    return { status: 'rejected' as const, code: 'provider_error' as const };
  }
};
