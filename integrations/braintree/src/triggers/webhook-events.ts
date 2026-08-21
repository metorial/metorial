import { createHash } from 'node:crypto';
import {
  createApiServiceError,
  decodeWebhookWireBody,
  SlateTrigger,
  type WebhookWireRequest
} from 'slates';
import { z } from 'zod';
import { generateChallengeResponse, verifyAndParseWebhook } from '../lib/webhook';
import { spec } from '../spec';

let WEBHOOK_KIND_MAP: Record<string, string> = {
  // Subscription events
  subscription_charged_successfully: 'subscription.charged_successfully',
  subscription_charged_unsuccessfully: 'subscription.charged_unsuccessfully',
  subscription_billing_skipped: 'subscription.billing_skipped',
  subscription_went_past_due: 'subscription.went_past_due',
  subscription_expired: 'subscription.expired',
  subscription_canceled: 'subscription.canceled',
  subscription_trial_ended: 'subscription.trial_ended',
  subscription_went_active: 'subscription.went_active',
  // Transaction events
  transaction_settled: 'transaction.settled',
  transaction_settlement_declined: 'transaction.settlement_declined',
  transaction_disbursed: 'transaction.disbursed',
  // Disbursement events
  disbursement: 'disbursement.completed',
  disbursement_exception: 'disbursement.exception',
  // Dispute events
  dispute_accepted: 'dispute.accepted',
  dispute_auto_accepted: 'dispute.auto_accepted',
  dispute_disputed: 'dispute.disputed',
  dispute_expired: 'dispute.expired',
  dispute_lost: 'dispute.lost',
  dispute_opened: 'dispute.opened',
  dispute_under_review: 'dispute.under_review',
  dispute_won: 'dispute.won',
  // Sub-merchant events
  sub_merchant_account_approved: 'sub_merchant_account.approved',
  sub_merchant_account_declined: 'sub_merchant_account.declined',
  // Account updater events
  account_updater_daily_report: 'account_updater.daily_report',
  // Grant API events
  grantor_updated_granted_payment_method: 'grant.grantor_updated',
  recipient_updated_granted_payment_method: 'grant.recipient_updated',
  granted_payment_method_revoked: 'grant.payment_method_revoked',
  granted_payment_instrument_revoked: 'grant.payment_instrument_revoked',
  // Local payment method events
  local_payment_completed: 'local_payment.completed',
  local_payment_reversed: 'local_payment.reversed',
  local_payment_funded: 'local_payment.funded',
  local_payment_expired: 'local_payment.expired',
  // OAuth events
  oauth_access_revoked: 'oauth.access_revoked',
  // Payment method events
  payment_method_revoked_by_customer: 'payment_method.revoked_by_customer',
  payment_method_customer_data_updated: 'payment_method.customer_data_updated',
  // Connected merchant events
  connected_merchant_status_transitioned: 'connected_merchant.status_transitioned',
  connected_merchant_paypal_status_changed: 'connected_merchant.paypal_status_changed',
  // Fraud events
  transaction_reviewed: 'transaction.reviewed',
  // Test
  check: 'webhook.check'
};

let parseBraintreeForm = (body: string) => {
  let params = new URLSearchParams(body);
  let btSignature = params.get('bt_signature');
  let btPayload = params.get('bt_payload');
  if (!btSignature || !btPayload) return null;
  return { btSignature, btPayload };
};

let hasValidWireShape = (value: { btSignature: string; btPayload: string }) => {
  let normalizedPayload = value.btPayload.replaceAll('\n', '');
  if (
    !value.btSignature.split('&').every(pair => /^[^|&]+\|[a-f0-9]+$/i.test(pair)) ||
    normalizedPayload.length % 4 !== 0 ||
    !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(normalizedPayload)
  ) {
    return false;
  }
  try {
    return Buffer.from(normalizedPayload, 'base64').toString('base64') === normalizedPayload;
  } catch {
    return false;
  }
};

let braintreeCredentials = (values: Record<string, { value: string } | undefined>) => {
  let environment = values.braintree_environment?.value;
  let merchantId = values.braintree_merchant_id?.value;
  let publicKey = values.braintree_public_key?.value;
  let privateKey = values.braintree_private_key?.value;
  return environment && merchantId && publicKey && privateKey
    ? { environment, merchantId, publicKey, privateKey }
    : null;
};

export let verifyBraintreeWebhook = async (ctx: {
  input: { originalRequest: WebhookWireRequest };
  secrets: Record<string, { value: string } | undefined>;
}) => {
  let credentials = braintreeCredentials(ctx.secrets);
  if (!credentials) {
    return { status: 'rejected' as const, code: 'credential_missing' as const };
  }
  let request = ctx.input.originalRequest;
  if (request.method === 'GET') {
    let challenge = new URL(request.url).searchParams.get('bt_challenge');
    if (!challenge) {
      return { status: 'rejected' as const, code: 'wire_input_malformed' as const };
    }
    try {
      generateChallengeResponse(credentials, challenge);
      return {
        status: 'accepted' as const,
        selection: { scope: 'receiver_trigger' as const }
      };
    } catch {
      return { status: 'rejected' as const, code: 'credential_invalid' as const };
    }
  }
  let bytes = decodeWebhookWireBody(request.body);
  if (bytes === null) {
    return { status: 'rejected' as const, code: 'wire_input_malformed' as const };
  }
  let form = parseBraintreeForm(Buffer.from(bytes).toString('utf8'));
  if (!form || !hasValidWireShape(form)) {
    return { status: 'rejected' as const, code: 'wire_input_malformed' as const };
  }
  try {
    await verifyAndParseWebhook(credentials, form.btSignature, form.btPayload);
    return {
      status: 'accepted' as const,
      selection: { scope: 'receiver_trigger' as const },
      authenticatedFields: {
        delivery_id: createHash('sha256')
          .update(form.btSignature)
          .update('\0')
          .update(form.btPayload)
          .digest('hex')
      }
    };
  } catch (error) {
    return {
      status: 'rejected' as const,
      code: /signature/i.test(error instanceof Error ? error.message : '')
        ? ('credential_invalid' as const)
        : ('wire_input_malformed' as const)
    };
  }
};

export let captureBraintreeWebhookBootstrap = async (ctx: {
  input: { originalRequest: WebhookWireRequest };
  secrets: Record<string, { value: string } | undefined>;
}) => {
  let credentials = braintreeCredentials(ctx.secrets);
  if (!credentials) {
    return { status: 'rejected' as const, code: 'credential_missing' as const };
  }
  let challenge = new URL(ctx.input.originalRequest.url).searchParams.get('bt_challenge');
  if (!challenge) {
    return { status: 'rejected' as const, code: 'wire_input_malformed' as const };
  }
  try {
    let response = generateChallengeResponse(credentials, challenge);
    return {
      status: 'accepted' as const,
      capturedSecrets: {},
      response: {
        status: 200,
        headers: [['content-type', 'text/plain; charset=utf-8']] as [string, string][],
        body: { present: true as const, base64: Buffer.from(response).toString('base64') }
      }
    };
  } catch {
    return { status: 'rejected' as const, code: 'credential_invalid' as const };
  }
};

let extractResourceInfo = (
  kind: string,
  subject: Record<string, any>
): {
  resourceType: string;
  resourceId: string | undefined;
  status: string | undefined;
  amount: string | undefined;
  currencyCode: string | undefined;
} => {
  let resourceType = 'unknown';
  let resourceId: string | undefined;
  let status: string | undefined;
  let amount: string | undefined;
  let currencyCode: string | undefined;

  if (kind.startsWith('subscription_') || kind.startsWith('Subscription')) {
    resourceType = 'subscription';
    let sub = (subject as any).subscription || subject;
    resourceId = sub.id;
    status = sub.status;
    amount = sub.price;
  } else if (kind.startsWith('transaction_') || kind.startsWith('Transaction')) {
    resourceType = 'transaction';
    let txn = (subject as any).transaction || subject;
    resourceId = txn.id;
    status = txn.status;
    amount = txn.amount;
    currencyCode = txn.currencyIsoCode;
  } else if (kind.startsWith('dispute_') || kind.startsWith('Dispute')) {
    resourceType = 'dispute';
    let dispute = (subject as any).dispute || subject;
    resourceId = dispute.id;
    status = dispute.status;
    amount = dispute.amountDisputed || dispute.amount;
    currencyCode = dispute.currencyIsoCode;
  } else if (kind.startsWith('disbursement') || kind.startsWith('Disbursement')) {
    resourceType = 'disbursement';
    let disbursement = (subject as any).disbursement || subject;
    resourceId = disbursement.id;
    amount = disbursement.amount;
    currencyCode = disbursement.currencyIsoCode;
  } else if (kind.startsWith('sub_merchant') || kind.startsWith('SubMerchant')) {
    resourceType = 'sub_merchant_account';
    let account = (subject as any).merchantAccount || subject;
    resourceId = account.id;
    status = account.status;
  } else if (kind.startsWith('local_payment') || kind.startsWith('LocalPayment')) {
    resourceType = 'local_payment';
    let payment = (subject as any).localPayment || subject;
    resourceId = payment.paymentId || payment.id;
    status = payment.status;
  } else if (
    kind.startsWith('granted_') ||
    kind.startsWith('grantor_') ||
    kind.startsWith('recipient_')
  ) {
    resourceType = 'grant';
    let pm = (subject as any).paymentMethod || subject;
    resourceId = pm.token || pm.id;
  } else if (kind.startsWith('payment_method') || kind.startsWith('PaymentMethod')) {
    resourceType = 'payment_method';
    let pm = (subject as any).paymentMethod || subject;
    resourceId = pm.token || pm.id;
  } else if (kind.startsWith('account_updater') || kind.startsWith('AccountUpdater')) {
    resourceType = 'account_updater';
    resourceId = (subject as any).reportUrl || undefined;
  } else if (kind.startsWith('oauth') || kind.startsWith('OAuth')) {
    resourceType = 'oauth';
    resourceId = (subject as any).accessToken || undefined;
  } else if (kind.startsWith('connected_merchant') || kind.startsWith('ConnectedMerchant')) {
    resourceType = 'connected_merchant';
    let merchant = (subject as any).merchantPublicId || subject;
    resourceId = typeof merchant === 'string' ? merchant : (merchant as any).id;
  } else if (kind === 'check' || kind === 'Check') {
    resourceType = 'test';
    resourceId = 'check';
  }

  return { resourceType, resourceId, status, amount, currencyCode };
};

export let webhookEvents = SlateTrigger.create(spec, {
  name: 'Webhook Events',
  key: 'webhook_events',
  description: `Receives real-time webhook notifications from Braintree for subscriptions, transactions, disputes, disbursements, payment methods, and other gateway events. Configure the webhook destination URL in your Braintree Control Panel.`
})
  .input(
    z.object({
      kind: z.string().describe('Braintree webhook notification kind'),
      timestamp: z.string().describe('Notification timestamp'),
      subject: z.record(z.string(), z.any()).describe('Notification subject data')
    })
  )
  .output(
    z.object({
      kind: z.string().describe('Original Braintree notification kind'),
      timestamp: z.string().describe('When the event occurred'),
      resourceType: z
        .string()
        .describe('Type of resource affected (subscription, transaction, dispute, etc.)'),
      resourceId: z.string().optional().describe('ID of the affected resource'),
      status: z.string().optional().describe('Current status of the resource'),
      amount: z.string().optional().describe('Amount (for transaction/subscription events)'),
      currencyCode: z.string().optional().describe('Currency code'),
      subject: z.record(z.string(), z.any()).describe('Full notification subject payload')
    })
  )
  .webhook({
    http: {
      methods: ['GET', 'POST'],
      sync: {
        mode: 'match',
        match: [{ method: 'GET', hasQueryParam: 'bt_challenge' }]
      },
      ingress: {
        kind: 'receiver_route',
        baseline: 'receiver_path_secret',
        verification: {
          mechanism: 'provider',
          baseline: 'receiver_path_secret',
          reason:
            'Braintree requires its SDK verifier for challenges and signed XML payloads.',
          allowedSecretRefs: [
            {
              source: 'auth_config',
              name: 'braintree_environment',
              credentialKey: 'environment',
              encoding: 'utf8'
            },
            {
              source: 'auth_config',
              name: 'braintree_merchant_id',
              credentialKey: 'merchantId',
              encoding: 'utf8'
            },
            {
              source: 'auth_config',
              name: 'braintree_public_key',
              credentialKey: 'publicKey',
              encoding: 'utf8'
            },
            {
              source: 'auth_config',
              name: 'braintree_private_key',
              credentialKey: 'privateKey',
              encoding: 'utf8'
            }
          ],
          rules: [
            {
              id: 'braintree.challenge.v1',
              phase: 'bootstrap',
              when: {
                methods: ['GET'],
                matcher: { hasQueryParam: 'bt_challenge' }
              },
              verify: {
                type: 'provider',
                verifierId: 'braintree.delivery.v1',
                allowedSecretRefs: [
                  'braintree_environment',
                  'braintree_merchant_id',
                  'braintree_public_key',
                  'braintree_private_key'
                ],
                allowedBootstrapCaptureRefs: []
              },
              result: { type: 'sync_only' },
              replay: { kind: 'not_applicable', reason: 'bootstrap_sync_only' }
            },
            {
              id: 'braintree.delivery.v1',
              phase: 'delivery',
              when: { methods: ['POST'] },
              verify: {
                type: 'provider',
                verifierId: 'braintree.delivery.v1',
                allowedSecretRefs: [
                  'braintree_environment',
                  'braintree_merchant_id',
                  'braintree_public_key',
                  'braintree_private_key'
                ],
                allowedBootstrapCaptureRefs: []
              },
              result: { type: 'dispatch', scope: 'receiver_trigger' },
              replay: {
                kind: 'enforced',
                deduplicate: {
                  source: 'preset',
                  presetField: 'delivery_id',
                  ttlSeconds: 604_800,
                  scope: 'request'
                }
              }
            }
          ]
        }
      }
    },
    verifyWebhook: verifyBraintreeWebhook,
    captureWebhookBootstrap: captureBraintreeWebhookBootstrap,
    handleRequest: async ctx => {
      let request = ctx.request;

      // Handle GET challenge (Braintree webhook verification)
      if (request.method === 'GET') {
        let url = new URL(request.url);
        let challenge = url.searchParams.get('bt_challenge');
        if (challenge) {
          let response = generateChallengeResponse(
            {
              environment: ctx.auth.environment,
              merchantId: ctx.auth.merchantId,
              publicKey: ctx.auth.publicKey,
              privateKey: ctx.auth.privateKey
            },
            challenge
          );
          return {
            inputs: [],
            response: {
              status: 200,
              headers: { 'content-type': 'text/plain; charset=utf-8' },
              body: response
            }
          };
        }
        return { inputs: [] };
      }

      // Handle POST webhook notification
      let body = await request.text();

      // Parse form-encoded body (bt_signature=...&bt_payload=...)
      let form = parseBraintreeForm(body);
      if (!form) throw createApiServiceError('Malformed Braintree webhook form body');
      let notification = await verifyAndParseWebhook(
        {
          environment: ctx.auth.environment,
          merchantId: ctx.auth.merchantId,
          publicKey: ctx.auth.publicKey,
          privateKey: ctx.auth.privateKey
        },
        form.btSignature,
        form.btPayload
      );

      return {
        inputs: [
          {
            kind: notification.kind,
            timestamp: notification.timestamp,
            subject: notification.subject
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let { kind, timestamp, subject } = ctx.input;

      // Normalize the kind to a consistent event type
      let normalizedKind = kind
        .toLowerCase()
        .replace(/([A-Z])/g, '_$1')
        .replace(/^_/, '')
        .toLowerCase();
      let eventType = WEBHOOK_KIND_MAP[normalizedKind] || `braintree.${normalizedKind}`;

      let { resourceType, resourceId, status, amount, currencyCode } = extractResourceInfo(
        kind,
        subject
      );

      // Generate a unique event ID from kind + timestamp + resource
      let eventId = `${kind}_${timestamp}_${resourceId || 'unknown'}`;

      return {
        type: eventType,
        id: eventId,
        output: {
          kind,
          timestamp,
          resourceType,
          resourceId,
          status,
          amount,
          currencyCode,
          subject
        }
      };
    }
  })
  .build();
