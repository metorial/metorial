import { SlateTool } from 'slates';
import { z } from 'zod';
import { attributesOf, idOf, jsonApiBody, singleData } from '../lib/envelopes';
import { paginationInputFields } from '../lib/pagination';
import {
  paymentSourceObject,
  recipientObject,
  requireConfirm,
  requireIdempotencyKey
} from '../lib/validation';
import { spec } from '../spec';
import {
  amountSchema,
  confirmSchema,
  currencySchema,
  idempotencyKeySchema,
  payerSchema,
  rawRecordArraySchema,
  rawRecordSchema
} from './schemas';
import {
  attributesBody,
  countOf,
  createClient,
  listRawResult,
  resourceResult,
  summaryListMessage
} from './shared';

const paymentRequestOutput = (envelope: unknown) => {
  const base = resourceResult(envelope, 'paymentRequestId', 'paymentRequest');
  const resource = singleData(envelope);
  const attributes = attributesOf(resource);

  return {
    ...base,
    amount: typeof attributes.amount === 'number' ? attributes.amount : undefined,
    currency: typeof attributes.currency === 'string' ? attributes.currency : undefined,
    paymentLinkUrl:
      typeof attributes.paymentLinkUrl === 'string' ? attributes.paymentLinkUrl : undefined
  };
};

const paymentRequestOutputSchema = z.object({
  paymentRequestId: z.string().optional(),
  type: z.string().optional(),
  status: z.string().optional(),
  amount: z.number().optional(),
  currency: z.string().optional(),
  paymentLinkUrl: z.string().optional(),
  paymentRequest: rawRecordSchema
});

const fulfilledPaymentOutputSchema = z.object({
  paymentId: z.string().optional(),
  type: z.string().optional(),
  status: z.string().optional(),
  payment: rawRecordSchema
});

const paymentOutput = (envelope: unknown) => resourceResult(envelope, 'paymentId', 'payment');

export const listPaymentRequests = SlateTool.create(spec, {
  name: 'List Payment Requests',
  key: 'list_payment_requests',
  description: 'List Natural payment requests created by the effective party.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      partyId: z
        .string()
        .optional()
        .describe('Optional effective party ID for delegated reads.'),
      ...paginationInputFields
    })
  )
  .output(
    z.object({
      paymentRequests: rawRecordArraySchema,
      pagination: z.object({
        hasMore: z.boolean(),
        nextCursor: z.string().nullable()
      })
    })
  )
  .handleInvocation(async ctx => {
    const client = createClient(ctx);
    const envelope = await client.request(
      'list payment requests',
      'get',
      '/payment-requests',
      {
        params: {
          partyId: ctx.input.partyId,
          limit: ctx.input.limit,
          cursor: ctx.input.cursor
        }
      }
    );
    const output = listRawResult(envelope, 'paymentRequests');

    return {
      output,
      message: summaryListMessage(countOf(output, 'paymentRequests'), 'payment requests')
    };
  })
  .build();

export const listIncomingPaymentRequests = SlateTool.create(spec, {
  name: 'List Incoming Payment Requests',
  key: 'list_incoming_payment_requests',
  description: 'List Natural payment requests where the effective party is the payer.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      partyId: z
        .string()
        .optional()
        .describe('Optional effective party ID for delegated reads.'),
      ...paginationInputFields
    })
  )
  .output(
    z.object({
      paymentRequests: rawRecordArraySchema,
      pagination: z.object({
        hasMore: z.boolean(),
        nextCursor: z.string().nullable()
      })
    })
  )
  .handleInvocation(async ctx => {
    const client = createClient(ctx);
    const envelope = await client.request(
      'list incoming payment requests',
      'get',
      '/payment-requests/incoming',
      {
        params: {
          partyId: ctx.input.partyId,
          limit: ctx.input.limit,
          cursor: ctx.input.cursor
        }
      }
    );
    const output = listRawResult(envelope, 'paymentRequests');

    return {
      output,
      message: summaryListMessage(
        countOf(output, 'paymentRequests'),
        'incoming payment requests'
      )
    };
  })
  .build();

export const createPaymentRequest = SlateTool.create(spec, {
  name: 'Create Payment Request',
  key: 'create_payment_request',
  description:
    'Create a Natural payment request and return its payment link. Requires confirmation and an idempotency key.'
})
  .input(
    z.object({
      amount: amountSchema,
      payer: payerSchema.describe('Payment request payer.'),
      currency: currencySchema,
      description: z
        .string()
        .max(500)
        .optional()
        .describe('Payment request description. Maximum 500 characters.'),
      payerName: z.string().optional().describe('Display name for the payer.'),
      walletId: z.string().optional().describe('Wallet that should receive funds.'),
      customerPartyId: z
        .string()
        .optional()
        .describe('Requester party ID for delegated payment requests.'),
      idempotencyKey: idempotencyKeySchema,
      confirm: confirmSchema
    })
  )
  .output(paymentRequestOutputSchema)
  .handleInvocation(async ctx => {
    requireConfirm(ctx.input.confirm, 'create this payment request');
    requireIdempotencyKey(ctx.input.idempotencyKey, 'create a payment request');
    const client = createClient(ctx);
    const envelope = await client.request(
      'create payment request',
      'post',
      '/payment-requests',
      {
        idempotencyKey: ctx.input.idempotencyKey,
        body: jsonApiBody(
          attributesBody({
            amount: ctx.input.amount,
            payer: recipientObject(ctx.input.payer),
            currency: ctx.input.currency,
            description: ctx.input.description,
            payerName: ctx.input.payerName,
            walletId: ctx.input.walletId,
            customerPartyId: ctx.input.customerPartyId
          })
        )
      }
    );
    const output = paymentRequestOutput(envelope);

    return {
      output,
      message: `Created payment request **${output.paymentRequestId ?? idOf(singleData(envelope)) ?? 'unknown'}**.`
    };
  })
  .build();

export const getPaymentRequest = SlateTool.create(spec, {
  name: 'Get Payment Request',
  key: 'get_payment_request',
  description: 'Retrieve a Natural payment request by ID.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      paymentRequestId: z.string().min(1).describe('Natural payment request ID.'),
      partyId: z
        .string()
        .optional()
        .describe('Optional effective party ID for delegated reads.')
    })
  )
  .output(paymentRequestOutputSchema)
  .handleInvocation(async ctx => {
    const client = createClient(ctx);
    const envelope = await client.request(
      'get payment request',
      'get',
      `/payment-requests/${ctx.input.paymentRequestId}`,
      {
        params: {
          partyId: ctx.input.partyId
        }
      }
    );

    return {
      output: paymentRequestOutput(envelope),
      message: `Retrieved payment request **${ctx.input.paymentRequestId}**.`
    };
  })
  .build();

export const fulfillPaymentRequest = SlateTool.create(spec, {
  name: 'Fulfill Payment Request',
  key: 'fulfill_payment_request',
  description:
    'Fulfill a Natural payment request from a wallet or external account. This can move funds and requires confirmation.'
})
  .input(
    z.object({
      paymentRequestId: z.string().min(1).describe('Natural payment request ID.'),
      paymentSourceType: z
        .enum(['wallet', 'external_account'])
        .describe('Payment source discriminator.'),
      partyId: z
        .string()
        .optional()
        .describe('Effective payer party ID for delegated payment request fulfillment.'),
      walletId: z.string().optional().describe('Required when paymentSourceType is wallet.'),
      externalAccountId: z
        .string()
        .optional()
        .describe('Required when paymentSourceType is external_account.'),
      idempotencyKey: idempotencyKeySchema,
      confirm: confirmSchema
    })
  )
  .output(fulfilledPaymentOutputSchema)
  .handleInvocation(async ctx => {
    requireConfirm(ctx.input.confirm, 'fulfill this payment request');
    requireIdempotencyKey(ctx.input.idempotencyKey, 'fulfill a payment request');
    const paymentSource = paymentSourceObject(ctx.input);
    const client = createClient(ctx);
    const envelope = await client.request(
      'fulfill payment request',
      'post',
      `/payment-requests/${ctx.input.paymentRequestId}/fulfill`,
      {
        idempotencyKey: ctx.input.idempotencyKey,
        body: {
          ...(ctx.input.partyId ? { partyId: ctx.input.partyId } : {}),
          ...jsonApiBody({
            paymentSource
          })
        }
      }
    );

    return {
      output: paymentOutput(envelope),
      message: `Fulfilled payment request **${ctx.input.paymentRequestId}**.`
    };
  })
  .build();

export const declinePaymentRequest = SlateTool.create(spec, {
  name: 'Decline Payment Request',
  key: 'decline_payment_request',
  description:
    'Decline a Natural payment request. Requires confirmation and an idempotency key.',
  tags: { destructive: true }
})
  .input(
    z.object({
      paymentRequestId: z.string().min(1).describe('Natural payment request ID.'),
      idempotencyKey: idempotencyKeySchema,
      confirm: confirmSchema
    })
  )
  .output(paymentRequestOutputSchema)
  .handleInvocation(async ctx => {
    requireConfirm(ctx.input.confirm, 'decline this payment request');
    requireIdempotencyKey(ctx.input.idempotencyKey, 'decline a payment request');
    const client = createClient(ctx);
    const envelope = await client.request(
      'decline payment request',
      'post',
      `/payment-requests/${ctx.input.paymentRequestId}/decline`,
      { idempotencyKey: ctx.input.idempotencyKey }
    );

    return {
      output: paymentRequestOutput(envelope),
      message: `Declined payment request **${ctx.input.paymentRequestId}**.`
    };
  })
  .build();
