import { SlateTool } from 'slates';
import { z } from 'zod';
import { attributesOf, idOf, jsonApiBody, singleData } from '../lib/envelopes';
import { naturalServiceError } from '../lib/errors';
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
        .regex(
          /^pty_[0-9a-f]{32}$/,
          'partyId must be a Natural party ID (pty_ + 32 hex characters).'
        )
        .optional()
        .describe('Optional effective party ID for delegated reads.'),
      ...paginationInputFields
    })
  )
  .output(
    z.object({
      payments: z.array(
        z.object({
          id: z.string().optional(),
          paymentId: z.string().optional(),
          type: z.string().optional(),
          name: z.string().optional(),
          displayName: z.string().optional(),
          email: z.string().optional(),
          status: z.string().optional(),
          amount: z.number().optional(),
          currency: z.string().optional(),
          description: z.string().nullable().optional(),
          createdAt: z.string().optional(),
          updatedAt: z.string().nullable().optional(),
          senderPartyId: z.string().optional(),
          senderAgentId: z.string().optional(),
          recipientPartyId: z.string().optional(),
          recipientAgentId: z.string().optional(),
          transactionId: z.string().optional(),
          paymentRequestId: z.string().optional(),
          payment: rawRecordSchema
        })
      ),
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
    const listOutput = listResult(envelope, 'payments');
    const rawPayments =
      typeof envelope === 'object' &&
      envelope !== null &&
      'data' in envelope &&
      Array.isArray(envelope.data)
        ? envelope.data.filter(
            (payment): payment is Record<string, unknown> =>
              typeof payment === 'object' && payment !== null && !Array.isArray(payment)
          )
        : [];
    const payments = rawPayments.map((payment, index) => {
      const attributes = attributesOf(payment);
      const relationships =
        typeof payment.relationships === 'object' &&
        payment.relationships !== null &&
        !Array.isArray(payment.relationships)
          ? (payment.relationships as Record<string, unknown>)
          : {};
      const relationshipId = (key: string) => {
        const relationship = relationships[key];
        if (
          typeof relationship !== 'object' ||
          relationship === null ||
          Array.isArray(relationship) ||
          !('data' in relationship)
        ) {
          return undefined;
        }

        const data = relationship.data;
        return typeof data === 'object' &&
          data !== null &&
          !Array.isArray(data) &&
          'id' in data &&
          typeof data.id === 'string'
          ? data.id
          : undefined;
      };

      return {
        ...listOutput.payments[index],
        paymentId: idOf(payment),
        description:
          typeof attributes.description === 'string' || attributes.description === null
            ? attributes.description
            : undefined,
        senderPartyId: relationshipId('sender'),
        senderAgentId: relationshipId('senderAgent'),
        recipientPartyId: relationshipId('recipient'),
        recipientAgentId: relationshipId('recipientAgent'),
        transactionId: relationshipId('transaction'),
        paymentRequestId: relationshipId('paymentRequest'),
        payment
      };
    });
    const output = {
      ...listOutput,
      payments
    };

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
  constraints: ['Using a fresh idempotency key for a retry can duplicate payment activity.'],
  tags: { destructive: true }
})
  .input(
    z.object({
      amount: amountSchema,
      counterparty: counterpartySchema
        .pipe(
          z.discriminatedUnion('type', [
            z.object({
              type: z.literal('email'),
              value: z.string().email().describe('Recipient email address.')
            }),
            z.object({
              type: z.literal('phone'),
              value: z.string().min(1).describe('Recipient phone number.')
            }),
            z.object({
              type: z.literal('party_id'),
              value: z
                .string()
                .regex(
                  /^pty_[0-9a-f]{32}$/,
                  'Party counterparty IDs use pty_ + 32 hex characters.'
                )
            }),
            z.object({
              type: z.literal('agent_id'),
              value: z
                .string()
                .regex(
                  /^agt_[0-9a-f]{32}$/,
                  'Agent counterparty IDs use agt_ + 32 hex characters.'
                )
            }),
            z.object({
              type: z.literal('handle'),
              value: z
                .string()
                .regex(
                  /^@?[A-Za-z0-9](?:[A-Za-z0-9._]{0,28}[A-Za-z0-9])?(?:(?:-|\/)[A-Za-z0-9](?:[A-Za-z0-9._]{0,28}[A-Za-z0-9])?)?$/,
                  'Invalid Natural handle.'
                )
            })
          ])
        )
        .describe(
          'Payment recipient counterparty. Party IDs use pty_ + 32 hex characters, agent IDs use agt_ + 32 hex characters, and handles use Natural handle syntax.'
        ),
      currency: currencySchema,
      description: z
        .string()
        .max(500)
        .optional()
        .describe('Payment description. Maximum 500 characters.'),
      walletId: z
        .string()
        .regex(
          /^wal_[0-9a-f]{32}$/,
          'walletId must be a Natural wallet ID (wal_ + 32 hex characters).'
        )
        .optional()
        .describe("Source wallet ID. Omit to use the sender party's default wallet."),
      customerPartyId: z
        .string()
        .regex(
          /^pty_[0-9a-f]{32}$/,
          'customerPartyId must be a Natural party ID (pty_ + 32 hex characters).'
        )
        .optional()
        .describe(
          'Sender party ID for delegated payments on behalf of a customer. Omit to send from your own wallet.'
        ),
      idempotencyKey: idempotencyKeySchema,
      confirm: confirmSchema
    })
  )
  .output(
    z.object({
      paymentId: z.string().optional(),
      transactionId: z.string().optional(),
      senderPartyId: z.string().optional(),
      senderAgentId: z.string().optional(),
      recipientPartyId: z.string().optional(),
      recipientAgentId: z.string().optional(),
      paymentRequestId: z.string().optional(),
      type: z.string().optional(),
      status: z.string().optional(),
      amount: z.number().optional(),
      currency: z.string().optional(),
      description: z.string().nullable().optional(),
      createdAt: z.string().optional(),
      updatedAt: z.string().nullable().optional(),
      payment: rawRecordSchema
    })
  )
  .handleInvocation(async ctx => {
    requireConfirm(ctx.input.confirm, 'create this payment');
    requireIdempotencyKey(ctx.input.idempotencyKey, 'create a payment');
    const client = createClient(ctx);
    const envelope = await client.request('create payment', 'post', '/payments', {
      requiresAgentInstance: true,
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
    const payment = singleData(envelope);
    const attributes = attributesOf(payment);
    const relationships =
      typeof payment.relationships === 'object' &&
      payment.relationships !== null &&
      !Array.isArray(payment.relationships)
        ? (payment.relationships as Record<string, unknown>)
        : {};
    const relationshipId = (key: string) => {
      const relationship = relationships[key];
      if (
        typeof relationship !== 'object' ||
        relationship === null ||
        Array.isArray(relationship) ||
        !('data' in relationship)
      ) {
        return undefined;
      }

      return idOf(relationship.data);
    };
    const output = {
      ...moneyResourceOutput(envelope, 'paymentId', 'payment'),
      transactionId: relationshipId('transaction'),
      senderPartyId: relationshipId('sender'),
      senderAgentId: relationshipId('senderAgent'),
      recipientPartyId: relationshipId('recipient'),
      recipientAgentId: relationshipId('recipientAgent'),
      paymentRequestId: relationshipId('paymentRequest'),
      description:
        typeof attributes.description === 'string' || attributes.description === null
          ? attributes.description
          : undefined,
      createdAt: typeof attributes.createdAt === 'string' ? attributes.createdAt : undefined,
      updatedAt:
        typeof attributes.updatedAt === 'string' || attributes.updatedAt === null
          ? attributes.updatedAt
          : undefined
    };

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
      paymentId: z
        .string()
        .regex(
          /^pay_[0-9a-f]{32}$/,
          'paymentId must be a Natural payment ID (pay_ + 32 lowercase hex characters).'
        )
        .describe('Natural payment ID to retrieve (pay_ + 32 lowercase hex characters).'),
      partyId: z
        .string()
        .regex(
          /^pty_[0-9a-f]{32}$/,
          'partyId must be a Natural party ID (pty_ + 32 lowercase hex characters).'
        )
        .optional()
        .describe(
          'Optional party ID whose payment is being read through an authorized delegation; defaults to the authenticated party.'
        )
    })
  )
  .output(
    paymentOutputSchema.extend({
      transactionId: z.string().optional(),
      senderPartyId: z.string().optional(),
      senderAgentId: z.string().optional(),
      recipientPartyId: z.string().optional(),
      recipientAgentId: z.string().optional(),
      paymentRequestId: z.string().optional(),
      description: z.string().nullable().optional(),
      createdAt: z.string().optional(),
      updatedAt: z.string().nullable().optional()
    })
  )
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
    const payment = singleData(envelope);
    const attributes = attributesOf(payment);
    const relationships =
      typeof payment.relationships === 'object' &&
      payment.relationships !== null &&
      !Array.isArray(payment.relationships)
        ? (payment.relationships as Record<string, unknown>)
        : {};
    const relationshipId = (key: string) => {
      const relationship = relationships[key];
      if (
        typeof relationship !== 'object' ||
        relationship === null ||
        Array.isArray(relationship) ||
        !('data' in relationship)
      ) {
        return undefined;
      }

      return idOf(relationship.data);
    };
    const output = {
      ...moneyResourceOutput(envelope, 'paymentId', 'payment'),
      transactionId: relationshipId('transaction'),
      senderPartyId: relationshipId('sender'),
      senderAgentId: relationshipId('senderAgent'),
      recipientPartyId: relationshipId('recipient'),
      recipientAgentId: relationshipId('recipientAgent'),
      paymentRequestId: relationshipId('paymentRequest'),
      description:
        typeof attributes.description === 'string' || attributes.description === null
          ? attributes.description
          : undefined,
      createdAt: typeof attributes.createdAt === 'string' ? attributes.createdAt : undefined,
      updatedAt:
        typeof attributes.updatedAt === 'string' || attributes.updatedAt === null
          ? attributes.updatedAt
          : undefined
    };

    return {
      output,
      message: `Retrieved payment **${ctx.input.paymentId}**.`
    };
  })
  .build();

export const cancelPayment = SlateTool.create(spec, {
  name: 'Cancel Payment',
  key: 'cancel_payment',
  description:
    'Cancel a Natural payment before the recipient begins claiming it. This destructive state transition requires confirm=true and an idempotency key; reuse the same key when retrying the same cancellation.',
  constraints: [
    'A payment cannot be canceled after the recipient begins claiming it.',
    'Using a fresh idempotency key for a retry can create a separate cancellation attempt.'
  ],
  tags: { destructive: true }
})
  .input(
    z.object({
      paymentId: z
        .string()
        .regex(
          /^pay_[0-9a-f]{32}$/,
          'paymentId must be a Natural payment ID (pay_ + 32 lowercase hex characters).'
        )
        .describe('Natural payment ID to cancel (pay_ + 32 lowercase hex characters).'),
      idempotencyKey: idempotencyKeySchema,
      confirm: confirmSchema
    })
  )
  .output(
    z.object({
      paymentId: z.string().optional(),
      transactionId: z.string().optional(),
      senderPartyId: z.string().optional(),
      senderAgentId: z.string().optional(),
      recipientPartyId: z.string().optional(),
      recipientAgentId: z.string().optional(),
      paymentRequestId: z.string().optional(),
      type: z.string().optional(),
      status: z.string().optional(),
      amount: z.number().optional(),
      currency: z.string().optional(),
      description: z.string().nullable().optional(),
      createdAt: z.string().optional(),
      updatedAt: z.string().nullable().optional(),
      payment: rawRecordSchema
    })
  )
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
    const payment = singleData(envelope);
    const attributes = attributesOf(payment);
    const relationships =
      typeof payment.relationships === 'object' &&
      payment.relationships !== null &&
      !Array.isArray(payment.relationships)
        ? (payment.relationships as Record<string, unknown>)
        : {};
    const relationshipId = (key: string) => {
      const relationship = relationships[key];
      if (
        typeof relationship !== 'object' ||
        relationship === null ||
        Array.isArray(relationship) ||
        !('data' in relationship)
      ) {
        return undefined;
      }

      return idOf(relationship.data);
    };
    const output = {
      ...moneyResourceOutput(envelope, 'paymentId', 'payment'),
      transactionId: relationshipId('transaction'),
      senderPartyId: relationshipId('sender'),
      senderAgentId: relationshipId('senderAgent'),
      recipientPartyId: relationshipId('recipient'),
      recipientAgentId: relationshipId('recipientAgent'),
      paymentRequestId: relationshipId('paymentRequest'),
      description:
        typeof attributes.description === 'string' || attributes.description === null
          ? attributes.description
          : undefined,
      createdAt: typeof attributes.createdAt === 'string' ? attributes.createdAt : undefined,
      updatedAt:
        typeof attributes.updatedAt === 'string' || attributes.updatedAt === null
          ? attributes.updatedAt
          : undefined
    };

    return {
      output,
      message: `Canceled payment **${output.paymentId ?? ctx.input.paymentId}**.`
    };
  })
  .build();

export const listTransfers = SlateTool.create(spec, {
  name: 'List Transfers',
  key: 'list_transfers',
  description:
    'List Natural transfers for the authenticated party, or an authorized delegated party, with cursor pagination. Returns transfer direction, money, lifecycle state, relationship IDs, timestamps, failure or return details, and the raw transfer resource.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      partyId: z
        .string()
        .regex(
          /^pty_[0-9a-f]{32}$/,
          'partyId must be a Natural party ID (pty_ + 32 hex characters).'
        )
        .optional()
        .describe(
          'Optional party ID whose transfers are being read through an authorized delegation; defaults to the authenticated party.'
        ),
      ...paginationInputFields
    })
  )
  .output(
    z.object({
      transfers: z
        .array(
          z.object({
            id: z.string().optional(),
            transferId: z.string().optional(),
            type: z.string().optional(),
            attributes: rawRecordSchema.optional(),
            relationships: rawRecordSchema.optional(),
            transferType: z.string().optional(),
            direction: z.string().optional(),
            status: z.string().optional(),
            amount: z.number().optional(),
            currency: z.string().optional(),
            description: z.string().nullable().optional(),
            externalAccountDisplayMask: z.string().nullable().optional(),
            expectedAvailableAt: z.string().nullable().optional(),
            failure: rawRecordSchema.nullable().optional(),
            return: rawRecordSchema.nullable().optional(),
            submittedAt: z.string().nullable().optional(),
            settledAt: z.string().nullable().optional(),
            createdAt: z.string().optional(),
            updatedAt: z.string().nullable().optional(),
            partyId: z.string().optional(),
            walletId: z.string().optional(),
            destWalletId: z.string().optional(),
            externalAccountId: z.string().optional(),
            transactionId: z.string().optional(),
            transfer: rawRecordSchema
          })
        )
        .and(rawRecordArraySchema),
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
    const listOutput = listResult(envelope, 'transfers');
    const rawTransfers =
      typeof envelope === 'object' &&
      envelope !== null &&
      'data' in envelope &&
      Array.isArray(envelope.data)
        ? envelope.data.filter(
            (transfer): transfer is Record<string, unknown> =>
              typeof transfer === 'object' && transfer !== null && !Array.isArray(transfer)
          )
        : [];
    const transfers = rawTransfers.map((transfer, index) => {
      const attributes = attributesOf(transfer);
      const relationships =
        typeof transfer.relationships === 'object' &&
        transfer.relationships !== null &&
        !Array.isArray(transfer.relationships)
          ? (transfer.relationships as Record<string, unknown>)
          : {};
      const relationshipId = (key: string) => {
        const relationship = relationships[key];
        if (
          typeof relationship !== 'object' ||
          relationship === null ||
          Array.isArray(relationship) ||
          !('data' in relationship)
        ) {
          return undefined;
        }

        return idOf(relationship.data);
      };
      const nullableString = (key: string) => {
        const value = attributes[key];
        return typeof value === 'string' || value === null ? value : undefined;
      };
      const nullableRecord = (key: string) => {
        const value = attributes[key];
        return value === null ||
          (typeof value === 'object' && value !== null && !Array.isArray(value))
          ? value
          : undefined;
      };
      const transferType = typeof attributes.type === 'string' ? attributes.type : undefined;

      return {
        ...listOutput.transfers[index],
        transferId: idOf(transfer),
        attributes,
        relationships,
        transferType,
        direction: transferType,
        status: typeof attributes.status === 'string' ? attributes.status : undefined,
        amount: typeof attributes.amount === 'number' ? attributes.amount : undefined,
        currency: typeof attributes.currency === 'string' ? attributes.currency : undefined,
        description: nullableString('description'),
        externalAccountDisplayMask: nullableString('externalAccountDisplayMask'),
        expectedAvailableAt: nullableString('expectedAvailableAt'),
        failure: nullableRecord('failure'),
        return: nullableRecord('return'),
        submittedAt: nullableString('submittedAt'),
        settledAt: nullableString('settledAt'),
        createdAt: typeof attributes.createdAt === 'string' ? attributes.createdAt : undefined,
        updatedAt: nullableString('updatedAt'),
        partyId: relationshipId('party'),
        walletId: relationshipId('wallet'),
        destWalletId: relationshipId('destWallet'),
        externalAccountId: relationshipId('externalAccount'),
        transactionId: relationshipId('transaction'),
        transfer
      };
    });
    const output = {
      ...listOutput,
      transfers
    };

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
    'Initiate a Natural deposit from a linked external account into a wallet. This moves money; set confirm to true and reuse the same idempotency key when retrying the same deposit.',
  constraints: [
    'Deposit amount has a minimum of 100 cents.',
    'Using a fresh idempotency key for a retry can create a separate deposit.'
  ],
  tags: { destructive: true }
})
  .input(
    z.object({
      ...transferInputFields,
      amount: z.number().int().min(100).describe('Deposit amount in cents. Minimum 100.'),
      externalAccountId: z
        .string()
        .regex(
          /^eac_[0-9a-f]{32}$/,
          'externalAccountId must be a Natural external account ID (eac_ + 32 lowercase hex characters).'
        )
        .describe(
          'Linked Natural external account to debit (eac_ + 32 lowercase hex characters).'
        ),
      walletId: z
        .string()
        .regex(
          /^wal_[0-9a-f]{32}$/,
          'walletId must be a Natural wallet ID (wal_ + 32 lowercase hex characters).'
        )
        .optional()
        .describe("Target wallet ID. Omit to use the party's default wallet.")
    })
  )
  .output(
    z.object({
      transferId: z.string().optional(),
      transactionId: z.string().optional(),
      partyId: z.string().optional(),
      walletId: z.string().optional(),
      externalAccountId: z.string().optional(),
      type: z.string().optional(),
      transferType: z.string().optional(),
      status: z.string().optional(),
      amount: z.number().optional(),
      currency: z.string().optional(),
      description: z.string().nullable().optional(),
      externalAccountDisplayMask: z.string().nullable().optional(),
      expectedAvailableAt: z.string().nullable().optional(),
      failure: rawRecordSchema.nullable().optional(),
      return: rawRecordSchema.nullable().optional(),
      submittedAt: z.string().nullable().optional(),
      settledAt: z.string().nullable().optional(),
      createdAt: z.string().optional(),
      updatedAt: z.string().nullable().optional(),
      transfer: rawRecordSchema
    })
  )
  .handleInvocation(async ctx => {
    requireConfirm(ctx.input.confirm, 'deposit funds');
    requireIdempotencyKey(ctx.input.idempotencyKey, 'deposit funds');
    const client = createClient(ctx);
    const envelope = await client.request('deposit funds', 'post', '/transfers/deposit', {
      requiresAgentInstance: true,
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
    const transfer = singleData(envelope);
    const attributes = attributesOf(transfer);
    const relationships =
      typeof transfer.relationships === 'object' &&
      transfer.relationships !== null &&
      !Array.isArray(transfer.relationships)
        ? (transfer.relationships as Record<string, unknown>)
        : {};
    const relationshipId = (key: string) => {
      const relationship = relationships[key];
      if (
        typeof relationship !== 'object' ||
        relationship === null ||
        Array.isArray(relationship) ||
        !('data' in relationship)
      ) {
        return undefined;
      }

      return idOf(relationship.data);
    };
    const nullableString = (key: string) => {
      const value = attributes[key];
      return typeof value === 'string' || value === null ? value : undefined;
    };
    const nullableRecord = (key: string) => {
      const value = attributes[key];
      return value === null ||
        (typeof value === 'object' && value !== null && !Array.isArray(value))
        ? value
        : undefined;
    };
    const output = {
      ...moneyResourceOutput(envelope, 'transferId', 'transfer'),
      transactionId: relationshipId('transaction'),
      partyId: relationshipId('party'),
      walletId: relationshipId('wallet'),
      externalAccountId: relationshipId('externalAccount'),
      transferType: typeof attributes.type === 'string' ? attributes.type : undefined,
      description: nullableString('description'),
      externalAccountDisplayMask: nullableString('externalAccountDisplayMask'),
      expectedAvailableAt: nullableString('expectedAvailableAt'),
      failure: nullableRecord('failure'),
      return: nullableRecord('return'),
      submittedAt: nullableString('submittedAt'),
      settledAt: nullableString('settledAt'),
      createdAt: typeof attributes.createdAt === 'string' ? attributes.createdAt : undefined,
      updatedAt: nullableString('updatedAt')
    };

    return {
      output,
      message: `Initiated Natural deposit **${output.transferId ?? 'unknown'}**.`
    };
  })
  .build();

export const withdrawFunds = SlateTool.create(spec, {
  name: 'Withdraw Funds',
  key: 'withdraw_funds',
  description:
    'Initiate a Natural withdrawal from a wallet to a linked external account. This moves money; set confirm to true and reuse the same idempotency key when retrying the same withdrawal.',
  constraints: ['Using a fresh idempotency key for a retry can create a separate withdrawal.'],
  tags: { destructive: true }
})
  .input(
    z.object({
      ...transferInputFields,
      amount: z.number().int().positive().describe('Withdrawal amount in cents.'),
      currency: z
        .string()
        .min(1)
        .optional()
        .describe('Withdrawal currency code. Omit to use the Natural API default of USD.'),
      externalAccountId: z
        .string()
        .regex(
          /^eac_[0-9a-f]{32}$/,
          'externalAccountId must be a Natural external account ID (eac_ + 32 lowercase hex characters).'
        )
        .describe(
          'Linked Natural external account to credit (eac_ + 32 lowercase hex characters).'
        ),
      walletId: z
        .string()
        .regex(
          /^wal_[0-9a-f]{32}$/,
          'walletId must be a Natural wallet ID (wal_ + 32 lowercase hex characters).'
        )
        .optional()
        .describe("Source wallet ID. Omit to use the party's default wallet.")
    })
  )
  .output(
    z.object({
      transferId: z.string().optional(),
      transactionId: z.string().optional(),
      partyId: z.string().optional(),
      walletId: z.string().optional(),
      externalAccountId: z.string().optional(),
      type: z.string().optional(),
      transferType: z.string().optional(),
      status: z.string().optional(),
      amount: z.number().optional(),
      currency: z.string().optional(),
      description: z.string().nullable().optional(),
      externalAccountDisplayMask: z.string().nullable().optional(),
      expectedAvailableAt: z.string().nullable().optional(),
      failure: rawRecordSchema.nullable().optional(),
      return: rawRecordSchema.nullable().optional(),
      submittedAt: z.string().nullable().optional(),
      settledAt: z.string().nullable().optional(),
      createdAt: z.string().optional(),
      updatedAt: z.string().nullable().optional(),
      transfer: rawRecordSchema
    })
  )
  .handleInvocation(async ctx => {
    requireConfirm(ctx.input.confirm, 'withdraw funds');
    requireIdempotencyKey(ctx.input.idempotencyKey, 'withdraw funds');
    const client = createClient(ctx);
    const envelope = await client.request('withdraw funds', 'post', '/transfers/withdraw', {
      requiresAgentInstance: true,
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
    const transfer = singleData(envelope);
    const attributes = attributesOf(transfer);
    const relationships =
      typeof transfer.relationships === 'object' &&
      transfer.relationships !== null &&
      !Array.isArray(transfer.relationships)
        ? (transfer.relationships as Record<string, unknown>)
        : {};
    const relationshipId = (key: string) => {
      const relationship = relationships[key];
      if (
        typeof relationship !== 'object' ||
        relationship === null ||
        Array.isArray(relationship) ||
        !('data' in relationship)
      ) {
        return undefined;
      }

      return idOf(relationship.data);
    };
    const nullableString = (key: string) => {
      const value = attributes[key];
      return typeof value === 'string' || value === null ? value : undefined;
    };
    const nullableRecord = (key: string) => {
      const value = attributes[key];
      return value === null ||
        (typeof value === 'object' && value !== null && !Array.isArray(value))
        ? value
        : undefined;
    };
    const output = {
      ...moneyResourceOutput(envelope, 'transferId', 'transfer'),
      transactionId: relationshipId('transaction'),
      partyId: relationshipId('party'),
      walletId: relationshipId('wallet'),
      externalAccountId: relationshipId('externalAccount'),
      transferType: typeof attributes.type === 'string' ? attributes.type : undefined,
      description: nullableString('description'),
      externalAccountDisplayMask: nullableString('externalAccountDisplayMask'),
      expectedAvailableAt: nullableString('expectedAvailableAt'),
      failure: nullableRecord('failure'),
      return: nullableRecord('return'),
      submittedAt: nullableString('submittedAt'),
      settledAt: nullableString('settledAt'),
      createdAt: typeof attributes.createdAt === 'string' ? attributes.createdAt : undefined,
      updatedAt: nullableString('updatedAt')
    };

    return {
      output,
      message: `Initiated Natural withdrawal **${output.transferId ?? 'unknown'}**.`
    };
  })
  .build();

const isUriEncodable = (value: string) => {
  try {
    encodeURIComponent(value);
    return true;
  } catch {
    return false;
  }
};

const opaqueNaturalIdSchema = (prefix: string) =>
  z
    .string()
    .min(prefix.length + 1)
    .startsWith(prefix);

const getTransferIdSchema = opaqueNaturalIdSchema('trf_').refine(
  isUriEncodable,
  'Natural transfer ID must be well-formed Unicode.'
);

const getTransferPartyIdSchema = opaqueNaturalIdSchema('pty_').refine(
  isUriEncodable,
  'Natural party ID must be well-formed Unicode.'
);

const transferResourceIdentifierSchema = (type: string, prefix: string) =>
  z
    .object({
      type: z.literal(type),
      id: opaqueNaturalIdSchema(prefix)
    })
    .passthrough();

const transferRelationshipSchema = (type: string, prefix: string) =>
  z
    .object({
      data: transferResourceIdentifierSchema(type, prefix)
    })
    .passthrough();

const nullableTransferRelationshipSchema = (type: string, prefix: string) =>
  z
    .object({
      data: transferResourceIdentifierSchema(type, prefix).nullable()
    })
    .passthrough();

const nullableTransferTransactionRelationshipSchema = z
  .object({
    data: z
      .object({
        type: z.literal('transaction'),
        id: z.string()
      })
      .passthrough()
      .nullable()
  })
  .passthrough();

const transferFailureSchema = z
  .object({
    code: z.string().nullable(),
    reason: z.string().nullable()
  })
  .passthrough();

const transferReturnSchema = z
  .object({
    code: z.string().nullable(),
    reason: z.string().nullable(),
    returnedAt: z.string().nullable()
  })
  .passthrough();

const getTransferSuccessSchema = z
  .object({
    data: z
      .object({
        type: z.literal('transfer'),
        id: opaqueNaturalIdSchema('trf_'),
        attributes: z
          .object({
            type: z.string(),
            amount: z.number().int(),
            currency: z.string(),
            status: z.string(),
            description: z.string().nullable(),
            externalAccountDisplayMask: z.string().nullable(),
            expectedAvailableAt: z.string().nullable(),
            failure: transferFailureSchema.nullable(),
            return: transferReturnSchema.nullable(),
            submittedAt: z.string().nullable(),
            settledAt: z.string().nullable(),
            createdAt: z.string(),
            updatedAt: z.string().nullable()
          })
          .passthrough(),
        relationships: z
          .object({
            party: transferRelationshipSchema('party', 'pty_'),
            wallet: transferRelationshipSchema('wallet', 'wal_'),
            destWallet: nullableTransferRelationshipSchema('wallet', 'wal_').optional(),
            externalAccount: nullableTransferRelationshipSchema('externalAccount', 'eac_'),
            transaction: nullableTransferTransactionRelationshipSchema
          })
          .passthrough()
      })
      .passthrough()
  })
  .passthrough();

export const getTransfer = SlateTool.create(spec, {
  name: 'Get Transfer',
  key: 'get_transfer',
  description: 'Retrieve a Natural transfer by ID.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      transferId: getTransferIdSchema.describe(
        'Natural transfer ID with the trf_ prefix and a nonempty opaque suffix.'
      ),
      partyId: getTransferPartyIdSchema
        .optional()
        .describe(
          'Optional party ID with the pty_ prefix and a nonempty opaque suffix whose transfer is being read through an authorized delegation; defaults to the authenticated party.'
        )
    })
  )
  .output(
    transferOutputSchema.extend({
      transactionId: z.string().optional(),
      partyId: z.string().optional(),
      walletId: z.string().optional(),
      destWalletId: z.string().optional(),
      externalAccountId: z.string().optional(),
      attributes: rawRecordSchema.optional(),
      relationships: rawRecordSchema.optional(),
      transferType: z.string().optional(),
      direction: z.string().optional(),
      description: z.string().nullable().optional(),
      externalAccountDisplayMask: z.string().nullable().optional(),
      expectedAvailableAt: z.string().nullable().optional(),
      failure: rawRecordSchema.nullable().optional(),
      return: rawRecordSchema.nullable().optional(),
      submittedAt: z.string().nullable().optional(),
      settledAt: z.string().nullable().optional(),
      createdAt: z.string().optional(),
      updatedAt: z.string().nullable().optional()
    })
  )
  .handleInvocation(async ctx => {
    const client = createClient(ctx);
    const envelope = await client.request(
      'get transfer',
      'get',
      `/transfers/${encodeURIComponent(ctx.input.transferId)}`,
      {
        params: {
          partyId: ctx.input.partyId
        }
      }
    );
    const response = getTransferSuccessSchema.safeParse(envelope);
    if (!response.success) {
      throw naturalServiceError(
        'Natural returned a malformed success response when retrieving the transfer. This is a read-only request, so it is safe to retry.',
        'natural_response_error'
      );
    }
    if (response.data.data.id !== ctx.input.transferId) {
      throw naturalServiceError(
        'Natural returned a different transfer than the one requested. This is a read-only request, so it is safe to retry.',
        'natural_response_error'
      );
    }

    const transfer = singleData(response.data);
    const attributes = attributesOf(transfer);
    const relationships =
      typeof transfer.relationships === 'object' &&
      transfer.relationships !== null &&
      !Array.isArray(transfer.relationships)
        ? (transfer.relationships as Record<string, unknown>)
        : {};
    const relationshipId = (key: string) => {
      const relationship = relationships[key];
      if (
        typeof relationship !== 'object' ||
        relationship === null ||
        Array.isArray(relationship) ||
        !('data' in relationship)
      ) {
        return undefined;
      }

      return idOf(relationship.data);
    };
    const nullableString = (key: string) => {
      const value = attributes[key];
      return typeof value === 'string' || value === null ? value : undefined;
    };
    const nullableRecord = (key: string) => {
      const value = attributes[key];
      return value === null ||
        (typeof value === 'object' && value !== null && !Array.isArray(value))
        ? value
        : undefined;
    };
    const transferType = typeof attributes.type === 'string' ? attributes.type : undefined;
    const output = {
      ...moneyResourceOutput(response.data, 'transferId', 'transfer'),
      transactionId: relationshipId('transaction'),
      partyId: relationshipId('party'),
      walletId: relationshipId('wallet'),
      destWalletId: relationshipId('destWallet'),
      externalAccountId: relationshipId('externalAccount'),
      attributes,
      relationships,
      transferType,
      direction: transferType,
      description: nullableString('description'),
      externalAccountDisplayMask: nullableString('externalAccountDisplayMask'),
      expectedAvailableAt: nullableString('expectedAvailableAt'),
      failure: nullableRecord('failure'),
      return: nullableRecord('return'),
      submittedAt: nullableString('submittedAt'),
      settledAt: nullableString('settledAt'),
      createdAt: typeof attributes.createdAt === 'string' ? attributes.createdAt : undefined,
      updatedAt: nullableString('updatedAt')
    };

    return {
      output,
      message: `Retrieved transfer **${output.transferId ?? ctx.input.transferId}**.`
    };
  })
  .build();
