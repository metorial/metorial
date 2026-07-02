import { SlateTool } from 'slates';
import { z } from 'zod';
import { attributesOf, idOf, jsonApiBody, singleData } from '../lib/envelopes';
import { paginationInputFields } from '../lib/pagination';
import { recipientObject, requireConfirm, requireIdempotencyKey } from '../lib/validation';
import { spec } from '../spec';
import {
  amountSchema,
  confirmSchema,
  counterpartySchema,
  currencySchema,
  idempotencyKeySchema,
  rawRecordArraySchema,
  rawRecordSchema
} from './schemas';
import {
  attributesBody,
  countOf,
  createClient,
  listResult,
  resourceResult,
  summaryListMessage
} from './shared';

const moneyResourceOutput = <IdKey extends string, ResourceKey extends string>(
  envelope: unknown,
  idKey: IdKey,
  resourceKey: ResourceKey
) => {
  const base = resourceResult(envelope, idKey, resourceKey);
  const resource = singleData(envelope);
  const attributes = attributesOf(resource);

  return {
    ...base,
    amount: typeof attributes.amount === 'number' ? attributes.amount : undefined,
    currency: typeof attributes.currency === 'string' ? attributes.currency : undefined
  } as typeof base & {
    amount: number | undefined;
    currency: string | undefined;
  };
};

const paymentOutputSchema = z.object({
  paymentId: z.string().optional(),
  type: z.string().optional(),
  status: z.string().optional(),
  amount: z.number().optional(),
  currency: z.string().optional(),
  payment: rawRecordSchema
});

const transferOutputSchema = z.object({
  transferId: z.string().optional(),
  type: z.string().optional(),
  status: z.string().optional(),
  amount: z.number().optional(),
  currency: z.string().optional(),
  transfer: rawRecordSchema
});

export const listPayments = SlateTool.create(spec, {
  name: 'List Payments',
  key: 'list_payments',
  description: 'List Natural payments with optional party filtering and cursor pagination.',
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
      payments: rawRecordArraySchema,
      pagination: z.object({
        hasMore: z.boolean(),
        nextCursor: z.string().nullable()
      })
    })
  )
  .handleInvocation(async ctx => {
    const client = createClient(ctx);
    const envelope = await client.request('list payments', 'get', '/payments', {
      params: {
        partyId: ctx.input.partyId,
        limit: ctx.input.limit,
        cursor: ctx.input.cursor
      }
    });
    const output = listResult(envelope, 'payments');

    return {
      output,
      message: summaryListMessage(countOf(output, 'payments'), 'payments')
    };
  })
  .build();

export const createPayment = SlateTool.create(spec, {
  name: 'Create Payment',
  key: 'create_payment',
  description:
    'Create a Natural payment. This moves money or starts money movement; set confirm to true and reuse the same idempotency key on retries.',
  constraints: ['Using a fresh idempotency key for a retry can duplicate payment activity.']
})
  .input(
    z.object({
      amount: amountSchema,
      counterparty: counterpartySchema.describe('Payment recipient counterparty.'),
      currency: currencySchema,
      description: z
        .string()
        .max(500)
        .optional()
        .describe('Payment description. Maximum 500 characters.'),
      walletId: z.string().optional().describe('Source wallet ID.'),
      customerPartyId: z
        .string()
        .optional()
        .describe('Customer party ID for delegated payments on behalf of a customer.'),
      idempotencyKey: idempotencyKeySchema,
      confirm: confirmSchema
    })
  )
  .output(paymentOutputSchema)
  .handleInvocation(async ctx => {
    requireConfirm(ctx.input.confirm, 'create this payment');
    requireIdempotencyKey(ctx.input.idempotencyKey, 'create a payment');
    const client = createClient(ctx);
    const envelope = await client.request('create payment', 'post', '/payments', {
      idempotencyKey: ctx.input.idempotencyKey,
      body: jsonApiBody(
        attributesBody({
          amount: ctx.input.amount,
          counterparty: recipientObject(ctx.input.counterparty),
          currency: ctx.input.currency,
          description: ctx.input.description,
          walletId: ctx.input.walletId,
          customerPartyId: ctx.input.customerPartyId
        })
      )
    });
    const output = moneyResourceOutput(envelope, 'paymentId', 'payment');

    return {
      output,
      message: `Created payment **${output.paymentId ?? idOf(singleData(envelope)) ?? 'unknown'}**.`
    };
  })
  .build();

export const getPayment = SlateTool.create(spec, {
  name: 'Get Payment',
  key: 'get_payment',
  description: 'Retrieve a Natural payment by ID.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      paymentId: z.string().min(1).describe('Natural payment ID.'),
      partyId: z
        .string()
        .optional()
        .describe('Optional effective party ID for delegated reads.')
    })
  )
  .output(paymentOutputSchema)
  .handleInvocation(async ctx => {
    const client = createClient(ctx);
    const envelope = await client.request(
      'get payment',
      'get',
      `/payments/${ctx.input.paymentId}`,
      {
        params: {
          partyId: ctx.input.partyId
        }
      }
    );

    return {
      output: moneyResourceOutput(envelope, 'paymentId', 'payment'),
      message: `Retrieved payment **${ctx.input.paymentId}**.`
    };
  })
  .build();

export const cancelPayment = SlateTool.create(spec, {
  name: 'Cancel Payment',
  key: 'cancel_payment',
  description:
    'Cancel a Natural payment. This is a destructive money movement action and requires confirmation plus an idempotency key.',
  tags: { destructive: true }
})
  .input(
    z.object({
      paymentId: z.string().min(1).describe('Natural payment ID.'),
      idempotencyKey: idempotencyKeySchema,
      confirm: confirmSchema
    })
  )
  .output(paymentOutputSchema)
  .handleInvocation(async ctx => {
    requireConfirm(ctx.input.confirm, 'cancel this payment');
    requireIdempotencyKey(ctx.input.idempotencyKey, 'cancel a payment');
    const client = createClient(ctx);
    const envelope = await client.request(
      'cancel payment',
      'post',
      `/payments/${ctx.input.paymentId}/cancel`,
      { idempotencyKey: ctx.input.idempotencyKey }
    );

    return {
      output: moneyResourceOutput(envelope, 'paymentId', 'payment'),
      message: `Canceled payment **${ctx.input.paymentId}**.`
    };
  })
  .build();

export const listTransfers = SlateTool.create(spec, {
  name: 'List Transfers',
  key: 'list_transfers',
  description: 'List Natural transfers with optional party filtering and cursor pagination.',
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
      transfers: rawRecordArraySchema,
      pagination: z.object({
        hasMore: z.boolean(),
        nextCursor: z.string().nullable()
      })
    })
  )
  .handleInvocation(async ctx => {
    const client = createClient(ctx);
    const envelope = await client.request('list transfers', 'get', '/transfers', {
      params: {
        partyId: ctx.input.partyId,
        limit: ctx.input.limit,
        cursor: ctx.input.cursor
      }
    });
    const output = listResult(envelope, 'transfers');

    return {
      output,
      message: summaryListMessage(countOf(output, 'transfers'), 'transfers')
    };
  })
  .build();

const transferInputFields = {
  amount: amountSchema,
  externalAccountId: z.string().min(1).describe('Natural external account ID.'),
  currency: currencySchema,
  walletId: z.string().optional().describe('Wallet ID. Defaults to the party default wallet.'),
  description: z
    .string()
    .max(255)
    .optional()
    .describe('Transfer description. Maximum 255 characters.'),
  idempotencyKey: idempotencyKeySchema,
  confirm: confirmSchema
};

export const depositFunds = SlateTool.create(spec, {
  name: 'Deposit Funds',
  key: 'deposit_funds',
  description:
    'Initiate a Natural deposit from an external account into a wallet. This can move funds and requires confirmation.',
  constraints: ['Deposit amount has a minimum of 100 cents.']
})
  .input(
    z.object({
      ...transferInputFields,
      amount: z.number().int().min(100).describe('Deposit amount in cents. Minimum 100.')
    })
  )
  .output(transferOutputSchema)
  .handleInvocation(async ctx => {
    requireConfirm(ctx.input.confirm, 'deposit funds');
    requireIdempotencyKey(ctx.input.idempotencyKey, 'deposit funds');
    const client = createClient(ctx);
    const envelope = await client.request('deposit funds', 'post', '/transfers/deposit', {
      idempotencyKey: ctx.input.idempotencyKey,
      body: jsonApiBody(
        attributesBody({
          amount: ctx.input.amount,
          currency: ctx.input.currency,
          externalAccountId: ctx.input.externalAccountId,
          walletId: ctx.input.walletId,
          description: ctx.input.description
        })
      )
    });

    return {
      output: moneyResourceOutput(envelope, 'transferId', 'transfer'),
      message: 'Initiated Natural deposit.'
    };
  })
  .build();

export const withdrawFunds = SlateTool.create(spec, {
  name: 'Withdraw Funds',
  key: 'withdraw_funds',
  description:
    'Initiate a Natural withdrawal from a wallet to an external account. This can move funds and requires confirmation.'
})
  .input(z.object(transferInputFields))
  .output(transferOutputSchema)
  .handleInvocation(async ctx => {
    requireConfirm(ctx.input.confirm, 'withdraw funds');
    requireIdempotencyKey(ctx.input.idempotencyKey, 'withdraw funds');
    const client = createClient(ctx);
    const envelope = await client.request('withdraw funds', 'post', '/transfers/withdraw', {
      idempotencyKey: ctx.input.idempotencyKey,
      body: jsonApiBody(
        attributesBody({
          amount: ctx.input.amount,
          currency: ctx.input.currency,
          externalAccountId: ctx.input.externalAccountId,
          walletId: ctx.input.walletId,
          description: ctx.input.description
        })
      )
    });

    return {
      output: moneyResourceOutput(envelope, 'transferId', 'transfer'),
      message: 'Initiated Natural withdrawal.'
    };
  })
  .build();

export const getTransfer = SlateTool.create(spec, {
  name: 'Get Transfer',
  key: 'get_transfer',
  description: 'Retrieve a Natural transfer by ID.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      transferId: z.string().min(1).describe('Natural transfer ID.'),
      partyId: z
        .string()
        .optional()
        .describe('Optional effective party ID for delegated reads.')
    })
  )
  .output(transferOutputSchema)
  .handleInvocation(async ctx => {
    const client = createClient(ctx);
    const envelope = await client.request(
      'get transfer',
      'get',
      `/transfers/${ctx.input.transferId}`,
      {
        params: {
          partyId: ctx.input.partyId
        }
      }
    );

    return {
      output: moneyResourceOutput(envelope, 'transferId', 'transfer'),
      message: `Retrieved transfer **${ctx.input.transferId}**.`
    };
  })
  .build();
