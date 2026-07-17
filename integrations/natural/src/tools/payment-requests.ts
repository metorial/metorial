import { SlateTool } from 'slates';
import { z } from 'zod';
import { attributesOf, idOf, jsonApiBody, singleData } from '../lib/envelopes';
import { naturalServiceError } from '../lib/errors';
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

const nullablePartyRelationshipSchema = z
  .object({
    data: z
      .object({
        type: z.literal('party'),
        id: z.string().regex(/^pty_[0-9a-f]{32}$/)
      })
      .passthrough()
      .nullable()
  })
  .passthrough();

const nullableAgentRelationshipSchema = z
  .object({
    data: z
      .object({
        type: z.literal('agent'),
        id: z.string().regex(/^agt_[0-9a-f]{32}$/)
      })
      .passthrough()
      .nullable()
  })
  .passthrough();

const fulfillPaymentRequestSuccessSchema = z
  .object({
    data: z
      .object({
        type: z.literal('payment'),
        id: z.string().regex(/^pay_[0-9a-f]{32}$/),
        attributes: z
          .object({
            amount: z.number().int(),
            currency: z.string(),
            status: z.string(),
            description: z.string().nullable(),
            createdAt: z.string(),
            updatedAt: z.string().nullable()
          })
          .passthrough(),
        relationships: z
          .object({
            sender: nullablePartyRelationshipSchema,
            senderAgent: nullableAgentRelationshipSchema,
            recipient: nullablePartyRelationshipSchema,
            recipientAgent: nullableAgentRelationshipSchema,
            transaction: z
              .object({
                data: z
                  .object({
                    type: z.literal('transaction'),
                    id: z.string()
                  })
                  .passthrough()
                  .nullable()
              })
              .passthrough(),
            paymentRequest: z
              .object({
                data: z
                  .object({
                    type: z.literal('paymentRequest'),
                    id: z.string().regex(/^prq_[0-9a-f]{32}$/)
                  })
                  .passthrough()
                  .nullable()
              })
              .passthrough()
          })
          .passthrough()
      })
      .passthrough()
  })
  .passthrough();

const isUriEncodable = (value: string) => {
  try {
    encodeURIComponent(value);
    return true;
  } catch {
    return false;
  }
};

const opaquePaymentRequestIdSchema = z
  .string()
  .min(5, 'Payment request IDs require a non-empty value after prq_.')
  .startsWith('prq_', 'Payment request IDs use the prq_ prefix.')
  .refine(isUriEncodable, 'Natural payment request ID must be well-formed Unicode.');

const opaqueResourceIdSchema = (prefix: string) =>
  z
    .string()
    .min(prefix.length + 1)
    .startsWith(prefix);

const paymentRequestPartyRelationshipSchema = z
  .object({
    data: z
      .object({
        type: z.literal('party'),
        id: opaqueResourceIdSchema('pty_')
      })
      .passthrough()
  })
  .passthrough();

const paymentRequestWalletRelationshipSchema = z
  .object({
    data: z
      .object({
        type: z.literal('wallet'),
        id: opaqueResourceIdSchema('wal_')
      })
      .passthrough()
  })
  .passthrough();

const nullablePaymentRequestRelationshipSchema = (
  type: 'party' | 'agent' | 'payment',
  prefix: 'pty_' | 'agt_' | 'pay_'
) =>
  z
    .object({
      data: z
        .object({
          type: z.literal(type),
          id: opaqueResourceIdSchema(prefix)
        })
        .passthrough()
        .nullable()
    })
    .passthrough();

const declinePaymentRequestSuccessSchema = z
  .object({
    data: z
      .object({
        type: z.literal('paymentRequest'),
        id: opaquePaymentRequestIdSchema,
        attributes: z
          .object({
            amount: z.number().int(),
            currency: z.string(),
            status: z.string(),
            description: z.string().nullable(),
            requesterName: z.string().nullable(),
            requesterEmail: z.string().nullable(),
            requesterAvatarUrl: z.string().url().nullable(),
            walletName: z.string().nullable(),
            payerName: z.string().nullable(),
            payerEmail: z.string().nullable(),
            payerAvatarUrl: z.string().url().nullable(),
            payerPhone: z.string().nullable(),
            payerPartyId: z.string().nullable(),
            payerIdentifierType: z.string(),
            payerIdentifier: z.string(),
            paymentLinkUrl: z.string().url(),
            transactionId: z.string().nullable(),
            createdAt: z.string(),
            updatedAt: z.string()
          })
          .passthrough(),
        relationships: z
          .object({
            requesterParty: paymentRequestPartyRelationshipSchema,
            wallet: paymentRequestWalletRelationshipSchema,
            payerParty: nullablePaymentRequestRelationshipSchema('party', 'pty_'),
            payerAgent: nullablePaymentRequestRelationshipSchema('agent', 'agt_'),
            payment: nullablePaymentRequestRelationshipSchema('payment', 'pay_')
          })
          .passthrough()
      })
      .passthrough()
  })
  .passthrough();

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
      includeCompleted: z
        .boolean()
        .optional()
        .default(true)
        .describe('Whether to include completed payment requests. Defaults to true.'),
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
          includeCompleted: ctx.input.includeCompleted,
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
  description:
    'List open Natural payment requests that the effective party has been asked to pay.',
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
      paymentRequests: z.array(
        z.object({
          id: z.string().optional(),
          paymentRequestId: z.string().optional(),
          type: z.string().optional(),
          attributes: rawRecordSchema.optional(),
          relationships: rawRecordSchema.optional(),
          amount: z.number().optional(),
          currency: z.string().optional(),
          status: z.string().optional(),
          description: z.string().nullable().optional(),
          requesterName: z.string().nullable().optional(),
          requesterEmail: z.string().nullable().optional(),
          requesterAvatarUrl: z.string().nullable().optional(),
          walletName: z.string().nullable().optional(),
          payerName: z.string().nullable().optional(),
          payerEmail: z.string().nullable().optional(),
          payerAvatarUrl: z.string().nullable().optional(),
          payerPhone: z.string().nullable().optional(),
          payerPartyId: z.string().nullable().optional(),
          payerIdentifierType: z.string().optional(),
          payerIdentifier: z.string().optional(),
          paymentLinkUrl: z.string().optional(),
          transactionId: z.string().nullable().optional(),
          createdAt: z.string().optional(),
          updatedAt: z.string().optional(),
          requesterPartyId: z.string().optional(),
          walletId: z.string().optional(),
          payerAgentId: z.string().optional(),
          paymentId: z.string().optional(),
          paymentRequest: rawRecordSchema
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
    const rawOutput = listRawResult(envelope, 'paymentRequests');
    const paymentRequests = rawOutput.paymentRequests.map(paymentRequest => {
      const attributes = attributesOf(paymentRequest);
      const relationships =
        typeof paymentRequest.relationships === 'object' &&
        paymentRequest.relationships !== null &&
        !Array.isArray(paymentRequest.relationships)
          ? paymentRequest.relationships
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
      const nullableString = (key: string) => {
        const value = attributes[key];
        return typeof value === 'string' || value === null ? value : undefined;
      };

      return {
        ...paymentRequest,
        paymentRequestId: idOf(paymentRequest),
        amount: typeof attributes.amount === 'number' ? attributes.amount : undefined,
        currency: typeof attributes.currency === 'string' ? attributes.currency : undefined,
        status: typeof attributes.status === 'string' ? attributes.status : undefined,
        description: nullableString('description'),
        requesterName: nullableString('requesterName'),
        requesterEmail: nullableString('requesterEmail'),
        requesterAvatarUrl: nullableString('requesterAvatarUrl'),
        walletName: nullableString('walletName'),
        payerName: nullableString('payerName'),
        payerEmail: nullableString('payerEmail'),
        payerAvatarUrl: nullableString('payerAvatarUrl'),
        payerPhone: nullableString('payerPhone'),
        payerPartyId: relationshipId('payerParty') ?? nullableString('payerPartyId'),
        payerIdentifierType:
          typeof attributes.payerIdentifierType === 'string'
            ? attributes.payerIdentifierType
            : undefined,
        payerIdentifier:
          typeof attributes.payerIdentifier === 'string'
            ? attributes.payerIdentifier
            : undefined,
        paymentLinkUrl:
          typeof attributes.paymentLinkUrl === 'string'
            ? attributes.paymentLinkUrl
            : undefined,
        transactionId: nullableString('transactionId'),
        createdAt: typeof attributes.createdAt === 'string' ? attributes.createdAt : undefined,
        updatedAt: typeof attributes.updatedAt === 'string' ? attributes.updatedAt : undefined,
        requesterPartyId: relationshipId('requesterParty'),
        walletId: relationshipId('wallet'),
        payerAgentId: relationshipId('payerAgent'),
        paymentId: relationshipId('payment'),
        paymentRequest
      };
    });
    const output = {
      ...rawOutput,
      paymentRequests
    };

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
    'Create a Natural payment request for an email, phone, party, agent, or handle payer and return its payment link plus lifecycle metadata. This creates an externally actionable request; set confirm to true and reuse the same idempotency key on retries.',
  constraints: [
    'Using a fresh idempotency key for a retry can create a duplicate payment request.'
  ]
})
  .input(
    z.object({
      amount: amountSchema,
      payer: payerSchema
        .extend({
          type: z.enum(['email', 'phone', 'party_id', 'agent_id', 'handle'])
        })
        .pipe(
          z.discriminatedUnion('type', [
            z.object({
              type: z.literal('email'),
              value: z.string().email().describe('Payer email address.')
            }),
            z.object({
              type: z.literal('phone'),
              value: z.string().min(1).describe('Payer phone number.')
            }),
            z.object({
              type: z.literal('party_id'),
              value: z
                .string()
                .regex(/^pty_[0-9a-f]{32}$/, 'Party payer IDs use pty_ + 32 hex characters.')
            }),
            z.object({
              type: z.literal('agent_id'),
              value: z
                .string()
                .regex(/^agt_[0-9a-f]{32}$/, 'Agent payer IDs use agt_ + 32 hex characters.')
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
          'Payment request payer. Party IDs use pty_ + 32 hex characters, agent IDs use agt_ + 32 hex characters, and handles use Natural handle syntax.'
        ),
      currency: currencySchema,
      description: z
        .string()
        .max(500)
        .optional()
        .describe('Payment request description. Maximum 500 characters.'),
      payerName: z.string().optional().describe('Display name for the payer.'),
      walletId: z
        .string()
        .regex(
          /^wal_[0-9a-f]{32}$/,
          'walletId must be a Natural wallet ID (wal_ + 32 hex characters).'
        )
        .optional()
        .describe(
          "Wallet that should receive funds. Omit to use the requester party's default wallet."
        ),
      customerPartyId: z
        .string()
        .regex(
          /^pty_[0-9a-f]{32}$/,
          'customerPartyId must be a Natural party ID (pty_ + 32 hex characters).'
        )
        .optional()
        .describe(
          'Requester party ID for a delegated payment request. Omit to request into your own wallet.'
        ),
      idempotencyKey: idempotencyKeySchema,
      confirm: confirmSchema
    })
  )
  .output(
    paymentRequestOutputSchema.extend({
      description: z.string().nullable().optional(),
      requesterName: z.string().nullable().optional(),
      requesterEmail: z.string().nullable().optional(),
      requesterAvatarUrl: z.string().nullable().optional(),
      requesterPartyId: z.string().optional(),
      walletName: z.string().nullable().optional(),
      payerName: z.string().nullable().optional(),
      payerEmail: z.string().nullable().optional(),
      payerAvatarUrl: z.string().nullable().optional(),
      payerPhone: z.string().nullable().optional(),
      payerPartyId: z.string().nullable().optional(),
      payerIdentifierType: z.string().optional(),
      payerIdentifier: z.string().optional(),
      transactionId: z.string().nullable().optional(),
      createdAt: z.string().optional(),
      updatedAt: z.string().optional()
    })
  )
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
    const paymentRequest = singleData(envelope);
    const attributes = attributesOf(paymentRequest);
    const relationships =
      typeof paymentRequest.relationships === 'object' &&
      paymentRequest.relationships !== null &&
      !Array.isArray(paymentRequest.relationships)
        ? (paymentRequest.relationships as Record<string, unknown>)
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
    const output = {
      ...paymentRequestOutput(envelope),
      description: nullableString('description'),
      requesterName: nullableString('requesterName'),
      requesterEmail: nullableString('requesterEmail'),
      requesterAvatarUrl: nullableString('requesterAvatarUrl'),
      requesterPartyId: relationshipId('requesterParty'),
      walletName: nullableString('walletName'),
      payerName: nullableString('payerName'),
      payerEmail: nullableString('payerEmail'),
      payerAvatarUrl: nullableString('payerAvatarUrl'),
      payerPhone: nullableString('payerPhone'),
      payerPartyId: relationshipId('payerParty') ?? nullableString('payerPartyId'),
      payerIdentifierType:
        typeof attributes.payerIdentifierType === 'string'
          ? attributes.payerIdentifierType
          : undefined,
      payerIdentifier:
        typeof attributes.payerIdentifier === 'string'
          ? attributes.payerIdentifier
          : undefined,
      transactionId: nullableString('transactionId'),
      createdAt: typeof attributes.createdAt === 'string' ? attributes.createdAt : undefined,
      updatedAt: typeof attributes.updatedAt === 'string' ? attributes.updatedAt : undefined
    };

    return {
      output,
      message: `Created payment request **${output.paymentRequestId ?? idOf(singleData(envelope)) ?? 'unknown'}**.`
    };
  })
  .build();

export const getPaymentRequest = SlateTool.create(spec, {
  name: 'Get Payment Request',
  key: 'get_payment_request',
  description:
    'Retrieve a Natural payment request your party created or was asked to pay, including lifecycle, payer, requester, wallet, payment, and transaction metadata.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      paymentRequestId: z
        .string()
        .regex(
          /^prq_[0-9a-f]{32}$/,
          'paymentRequestId must be a Natural payment request ID (prq_ + 32 lowercase hex characters).'
        )
        .describe(
          'Natural payment request ID to retrieve (prq_ + 32 lowercase hex characters).'
        ),
      partyId: z
        .string()
        .regex(
          /^pty_[0-9a-f]{32}$/,
          'partyId must be a Natural party ID (pty_ + 32 lowercase hex characters).'
        )
        .optional()
        .describe(
          'Optional party ID whose payment request is being read through an authorized delegation; defaults to the authenticated party.'
        )
    })
  )
  .output(
    paymentRequestOutputSchema.extend({
      description: z.string().nullable().optional(),
      requesterName: z.string().nullable().optional(),
      requesterEmail: z.string().nullable().optional(),
      requesterAvatarUrl: z.string().nullable().optional(),
      requesterPartyId: z.string().optional(),
      walletName: z.string().nullable().optional(),
      walletId: z.string().optional(),
      payerName: z.string().nullable().optional(),
      payerEmail: z.string().nullable().optional(),
      payerAvatarUrl: z.string().nullable().optional(),
      payerPhone: z.string().nullable().optional(),
      payerPartyId: z.string().nullable().optional(),
      payerIdentifierType: z.string().optional(),
      payerIdentifier: z.string().optional(),
      payerAgentId: z.string().optional(),
      transactionId: z.string().nullable().optional(),
      paymentId: z.string().optional(),
      createdAt: z.string().optional(),
      updatedAt: z.string().optional()
    })
  )
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
    const paymentRequest = singleData(envelope);
    const attributes = attributesOf(paymentRequest);
    const relationships =
      typeof paymentRequest.relationships === 'object' &&
      paymentRequest.relationships !== null &&
      !Array.isArray(paymentRequest.relationships)
        ? (paymentRequest.relationships as Record<string, unknown>)
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
    const output = {
      ...paymentRequestOutput(envelope),
      description: nullableString('description'),
      requesterName: nullableString('requesterName'),
      requesterEmail: nullableString('requesterEmail'),
      requesterAvatarUrl: nullableString('requesterAvatarUrl'),
      requesterPartyId: relationshipId('requesterParty'),
      walletName: nullableString('walletName'),
      walletId: relationshipId('wallet'),
      payerName: nullableString('payerName'),
      payerEmail: nullableString('payerEmail'),
      payerAvatarUrl: nullableString('payerAvatarUrl'),
      payerPhone: nullableString('payerPhone'),
      payerPartyId: relationshipId('payerParty') ?? nullableString('payerPartyId'),
      payerIdentifierType:
        typeof attributes.payerIdentifierType === 'string'
          ? attributes.payerIdentifierType
          : undefined,
      payerIdentifier:
        typeof attributes.payerIdentifier === 'string'
          ? attributes.payerIdentifier
          : undefined,
      payerAgentId: relationshipId('payerAgent'),
      transactionId: nullableString('transactionId'),
      paymentId: relationshipId('payment'),
      createdAt: typeof attributes.createdAt === 'string' ? attributes.createdAt : undefined,
      updatedAt: typeof attributes.updatedAt === 'string' ? attributes.updatedAt : undefined
    };

    return {
      output,
      message: `Retrieved payment request **${output.paymentRequestId ?? ctx.input.paymentRequestId}**.`
    };
  })
  .build();

export const fulfillPaymentRequest = SlateTool.create(spec, {
  name: 'Fulfill Payment Request',
  key: 'fulfill_payment_request',
  description:
    'Fulfill an open Natural payment request from a wallet or external account and return payment lifecycle, money, and relationship metadata. This moves money; set confirm to true and reuse the same idempotency key on retries.',
  constraints: [
    'Using a fresh idempotency key for a retry can create duplicate payment activity.'
  ],
  tags: { destructive: true }
})
  .input(
    z.object({
      paymentRequestId: z
        .string()
        .regex(
          /^prq_[0-9a-f]{32}$/,
          'paymentRequestId must be a Natural payment request ID (prq_ + 32 hex characters).'
        )
        .describe('Natural payment request ID (prq_ + 32 hex characters).'),
      paymentSourceType: z
        .enum(['wallet', 'external_account'])
        .describe(
          'Payment source discriminator. Use wallet with walletId, or external_account with externalAccountId.'
        ),
      partyId: z
        .string()
        .regex(
          /^pty_[0-9a-f]{32}$/,
          'partyId must be a Natural party ID (pty_ + 32 hex characters).'
        )
        .optional()
        .describe('Effective payer party ID for delegated payment request fulfillment.'),
      walletId: z
        .string()
        .regex(
          /^wal_[0-9a-f]{32}$/,
          'walletId must be a Natural wallet ID (wal_ + 32 hex characters).'
        )
        .optional()
        .describe('Required when paymentSourceType is wallet; invalid for external_account.'),
      externalAccountId: z
        .string()
        .regex(
          /^eac_[0-9a-f]{32}$/,
          'externalAccountId must be a Natural external account ID (eac_ + 32 hex characters).'
        )
        .optional()
        .describe('Required when paymentSourceType is external_account; invalid for wallet.'),
      idempotencyKey: idempotencyKeySchema,
      confirm: confirmSchema
    })
  )
  .output(
    fulfilledPaymentOutputSchema.extend({
      transactionId: z.string().nullable().optional(),
      paymentRequestId: z.string().optional(),
      senderPartyId: z.string().nullable().optional(),
      senderAgentId: z.string().nullable().optional(),
      recipientPartyId: z.string().nullable().optional(),
      recipientAgentId: z.string().nullable().optional(),
      amount: z.number().optional(),
      currency: z.string().optional(),
      description: z.string().nullable().optional(),
      createdAt: z.string().optional(),
      updatedAt: z.string().nullable().optional()
    })
  )
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
        requiresAgentInstance: true,
        idempotencyKey: ctx.input.idempotencyKey,
        body: {
          ...(ctx.input.partyId ? { partyId: ctx.input.partyId } : {}),
          ...jsonApiBody({
            paymentSource
          })
        }
      }
    );
    const response = fulfillPaymentRequestSuccessSchema.safeParse(envelope);
    if (!response.success) {
      throw naturalServiceError(
        'Natural returned a malformed success response when fulfilling a payment request. Retry this fulfillment with the same idempotency key to safely recover the original result.',
        'natural_response_error'
      );
    }

    const payment = response.data.data;
    const { attributes, relationships } = payment;
    const relationshipId = (relationship: { data: { id: string } | null }) =>
      relationship.data?.id ?? null;
    const output = {
      paymentId: payment.id,
      type: payment.type,
      status: attributes.status,
      payment,
      transactionId: relationshipId(relationships.transaction),
      paymentRequestId:
        relationshipId(relationships.paymentRequest) ?? ctx.input.paymentRequestId,
      senderPartyId: relationshipId(relationships.sender),
      senderAgentId: relationshipId(relationships.senderAgent),
      recipientPartyId: relationshipId(relationships.recipient),
      recipientAgentId: relationshipId(relationships.recipientAgent),
      amount: attributes.amount,
      currency: attributes.currency,
      description: attributes.description,
      createdAt: attributes.createdAt,
      updatedAt: attributes.updatedAt
    };

    return {
      output,
      message: `Fulfilled payment request **${output.paymentRequestId ?? ctx.input.paymentRequestId}** as payment **${output.paymentId ?? 'unknown'}**.`
    };
  })
  .build();

export const declinePaymentRequest = SlateTool.create(spec, {
  name: 'Decline Payment Request',
  key: 'decline_payment_request',
  description:
    'Decline an open Natural payment request and return its lifecycle, payer, requester, and relationship metadata. This mutates live state; set confirm to true and reuse the same idempotency key on retries.',
  tags: { destructive: true }
})
  .input(
    z.object({
      paymentRequestId: opaquePaymentRequestIdSchema.describe(
        'Natural payment request ID with a prq_ prefix and non-empty opaque suffix.'
      ),
      idempotencyKey: idempotencyKeySchema,
      confirm: confirmSchema
    })
  )
  .output(
    paymentRequestOutputSchema.extend({
      description: z.string().nullable().optional(),
      requesterName: z.string().nullable().optional(),
      requesterEmail: z.string().nullable().optional(),
      requesterAvatarUrl: z.string().nullable().optional(),
      requesterPartyId: z.string().optional(),
      walletName: z.string().nullable().optional(),
      walletId: z.string().optional(),
      payerName: z.string().nullable().optional(),
      payerEmail: z.string().nullable().optional(),
      payerAvatarUrl: z.string().nullable().optional(),
      payerPhone: z.string().nullable().optional(),
      payerPartyId: z.string().nullable().optional(),
      payerIdentifierType: z.string().optional(),
      payerIdentifier: z.string().optional(),
      payerAgentId: z.string().nullable().optional(),
      transactionId: z.string().nullable().optional(),
      paymentId: z.string().nullable().optional(),
      createdAt: z.string().optional(),
      updatedAt: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    requireConfirm(ctx.input.confirm, 'decline this payment request');
    requireIdempotencyKey(ctx.input.idempotencyKey, 'decline a payment request');
    const client = createClient(ctx);
    const envelope = await client.request(
      'decline payment request',
      'post',
      `/payment-requests/${encodeURIComponent(ctx.input.paymentRequestId)}/decline`,
      { idempotencyKey: ctx.input.idempotencyKey }
    );
    const response = declinePaymentRequestSuccessSchema.safeParse(envelope);
    if (!response.success) {
      throw naturalServiceError(
        'Natural returned a malformed success response when declining a payment request. Retry this decline with the same idempotency key to safely recover the original result.',
        'natural_response_error'
      );
    }
    if (response.data.data.id !== ctx.input.paymentRequestId) {
      throw naturalServiceError(
        'Natural returned a different payment request than the one declined. Retry this decline with the same idempotency key to safely recover the original result.',
        'natural_response_error'
      );
    }

    const paymentRequest = response.data.data;
    const { attributes, relationships } = paymentRequest;
    const output = {
      paymentRequestId: paymentRequest.id,
      type: paymentRequest.type,
      status: attributes.status,
      amount: attributes.amount,
      currency: attributes.currency,
      paymentLinkUrl: attributes.paymentLinkUrl,
      paymentRequest,
      description: attributes.description,
      requesterName: attributes.requesterName,
      requesterEmail: attributes.requesterEmail,
      requesterAvatarUrl: attributes.requesterAvatarUrl,
      requesterPartyId: relationships.requesterParty.data.id,
      walletName: attributes.walletName,
      walletId: relationships.wallet.data.id,
      payerName: attributes.payerName,
      payerEmail: attributes.payerEmail,
      payerAvatarUrl: attributes.payerAvatarUrl,
      payerPhone: attributes.payerPhone,
      payerPartyId: relationships.payerParty.data?.id ?? attributes.payerPartyId,
      payerIdentifierType: attributes.payerIdentifierType,
      payerIdentifier: attributes.payerIdentifier,
      payerAgentId: relationships.payerAgent.data?.id ?? null,
      transactionId: attributes.transactionId,
      paymentId: relationships.payment.data?.id ?? null,
      createdAt: attributes.createdAt,
      updatedAt: attributes.updatedAt
    };

    return {
      output,
      message: `Declined payment request **${output.paymentRequestId ?? ctx.input.paymentRequestId}**.`
    };
  })
  .build();

const cancelPaymentRequestSuccessSchema = z
  .object({
    data: z
      .object({
        type: z.literal('paymentRequest'),
        id: opaquePaymentRequestIdSchema,
        attributes: z
          .object({
            amount: z.number().int(),
            currency: z.string(),
            status: z.literal('CANCELED'),
            description: z.string().nullable(),
            requesterName: z.string().nullable(),
            requesterEmail: z.string().nullable(),
            requesterAvatarUrl: z.string().url().nullable(),
            walletName: z.string().nullable(),
            payerName: z.string().nullable(),
            payerEmail: z.string().nullable(),
            payerAvatarUrl: z.string().url().nullable(),
            payerPhone: z.string().nullable(),
            payerPartyId: z.string().nullable(),
            payerIdentifierType: z.string(),
            payerIdentifier: z.string(),
            paymentLinkUrl: z.string().url(),
            transactionId: z.string().nullable(),
            createdAt: z.string(),
            updatedAt: z.string()
          })
          .passthrough(),
        relationships: z
          .object({
            requesterParty: paymentRequestPartyRelationshipSchema,
            wallet: paymentRequestWalletRelationshipSchema,
            payerParty: nullablePaymentRequestRelationshipSchema('party', 'pty_'),
            payerAgent: nullablePaymentRequestRelationshipSchema('agent', 'agt_'),
            payment: nullablePaymentRequestRelationshipSchema('payment', 'pay_')
          })
          .passthrough()
      })
      .passthrough(),
    meta: rawRecordSchema.optional()
  })
  .passthrough();

export const cancelPaymentRequest = SlateTool.create(spec, {
  name: 'Cancel Payment Request',
  key: 'cancel_payment_request',
  description:
    'Cancel an open Natural payment request your party created and return its complete canceled resource plus response metadata. This mutates live state; set confirm to true, verify the current status before retrying, and reuse the same idempotency key for every retry.',
  constraints: [
    'Before retrying an uncertain cancellation, verify the payment request status and reuse the original idempotency key.'
  ],
  tags: { destructive: true }
})
  .input(
    z.object({
      paymentRequestId: opaquePaymentRequestIdSchema.describe(
        'Natural payment request ID with a prq_ prefix and non-empty opaque suffix.'
      ),
      idempotencyKey: idempotencyKeySchema
        .max(255, 'Natural idempotency keys must be at most 255 characters.')
        .describe(
          'Natural Idempotency-Key header, up to 255 characters. Reuse the same key when retrying this cancellation.'
        ),
      confirm: confirmSchema
    })
  )
  .output(
    paymentRequestOutputSchema.extend({
      description: z.string().nullable(),
      requesterName: z.string().nullable(),
      requesterEmail: z.string().nullable(),
      requesterAvatarUrl: z.string().nullable(),
      requesterPartyId: z.string(),
      walletName: z.string().nullable(),
      walletId: z.string(),
      payerName: z.string().nullable(),
      payerEmail: z.string().nullable(),
      payerAvatarUrl: z.string().nullable(),
      payerPhone: z.string().nullable(),
      payerPartyId: z.string().nullable(),
      payerIdentifierType: z.string(),
      payerIdentifier: z.string(),
      payerAgentId: z.string().nullable(),
      transactionId: z.string().nullable(),
      paymentId: z.string().nullable(),
      createdAt: z.string(),
      updatedAt: z.string(),
      meta: rawRecordSchema.optional()
    })
  )
  .handleInvocation(async ctx => {
    requireConfirm(ctx.input.confirm, 'cancel this payment request');
    requireIdempotencyKey(ctx.input.idempotencyKey, 'cancel a payment request');
    const client = createClient(ctx);
    const envelope = await client.request(
      'cancel payment request',
      'post',
      `/payment-requests/${encodeURIComponent(ctx.input.paymentRequestId)}/cancel`,
      { idempotencyKey: ctx.input.idempotencyKey }
    );
    const response = cancelPaymentRequestSuccessSchema.safeParse(envelope);
    if (!response.success) {
      throw naturalServiceError(
        "Natural returned a malformed or non-canceled success response when canceling a payment request. Verify the payment request's current status before retrying; if a retry is needed, reuse the same idempotency key to safely recover the original result.",
        'natural_response_error'
      );
    }
    if (response.data.data.id !== ctx.input.paymentRequestId) {
      throw naturalServiceError(
        "Natural returned a different payment request than the one canceled. Verify the requested payment request's current status before retrying; if a retry is needed, reuse the same idempotency key to safely recover the original result.",
        'natural_response_error'
      );
    }

    const paymentRequest = response.data.data;
    const { attributes, relationships } = paymentRequest;
    const output = {
      paymentRequestId: paymentRequest.id,
      type: paymentRequest.type,
      status: attributes.status,
      amount: attributes.amount,
      currency: attributes.currency,
      paymentLinkUrl: attributes.paymentLinkUrl,
      paymentRequest,
      description: attributes.description,
      requesterName: attributes.requesterName,
      requesterEmail: attributes.requesterEmail,
      requesterAvatarUrl: attributes.requesterAvatarUrl,
      requesterPartyId: relationships.requesterParty.data.id,
      walletName: attributes.walletName,
      walletId: relationships.wallet.data.id,
      payerName: attributes.payerName,
      payerEmail: attributes.payerEmail,
      payerAvatarUrl: attributes.payerAvatarUrl,
      payerPhone: attributes.payerPhone,
      payerPartyId: relationships.payerParty.data?.id ?? attributes.payerPartyId,
      payerIdentifierType: attributes.payerIdentifierType,
      payerIdentifier: attributes.payerIdentifier,
      payerAgentId: relationships.payerAgent.data?.id ?? null,
      transactionId: attributes.transactionId,
      paymentId: relationships.payment.data?.id ?? null,
      createdAt: attributes.createdAt,
      updatedAt: attributes.updatedAt,
      meta: response.data.meta
    };

    return {
      output,
      message: `Canceled payment request **${output.paymentRequestId}**.`
    };
  })
  .build();
