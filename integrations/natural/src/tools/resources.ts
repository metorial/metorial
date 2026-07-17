import { SlateTool } from 'slates';
import { z } from 'zod';
import { naturalServiceError } from '../lib/errors';
import { paginationInputFields } from '../lib/pagination';
import { requireConfirm } from '../lib/validation';
import { spec } from '../spec';
import { confirmSchema, rawRecordSchema } from './schemas';
import {
  countOf,
  createClient,
  listRawResult,
  resourceResult,
  summaryListMessage
} from './shared';

export const listTransactions = SlateTool.create(spec, {
  name: 'List Transactions',
  key: 'list_transactions',
  description:
    'List payment and transfer transactions visible to the authenticated Natural party; these are not payment request records. Supports type, counterparty, wallet, delegated-customer, delegated-only filters, and cursor pagination.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      type: z
        .enum(['payment', 'transfer', 'all'])
        .default('all')
        .describe('Transaction type filter.'),
      counterpartyPartyId: z
        .string()
        .regex(
          /^pty_[0-9a-f]{32}$/,
          'counterpartyPartyId must be a Natural party ID (pty_ + 32 hex characters).'
        )
        .optional()
        .describe(
          'Restrict results to transactions whose payment counterparty is this party.'
        ),
      walletId: z
        .string()
        .regex(
          /^wal_[0-9a-f]{32}$/,
          'walletId must be a Natural wallet ID (wal_ + 32 hex characters).'
        )
        .optional()
        .describe('Restrict results to transactions visible through this wallet.'),
      customerPartyId: z
        .string()
        .regex(
          /^pty_[0-9a-f]{32}$/,
          'customerPartyId must be a Natural party ID (pty_ + 32 hex characters).'
        )
        .optional()
        .describe(
          'Restrict results to delegated activity performed for this customer, not activity involving it as a payment counterparty.'
        ),
      delegated: z
        .boolean()
        .optional()
        .describe(
          'When true, return only transactions executed through an agent delegation in the connection-scoped feed.'
        ),
      ...paginationInputFields
    })
  )
  .output(
    z.object({
      transactions: z.array(
        z.object({
          id: z.string().optional(),
          transactionId: z.string().optional(),
          type: z.string().optional(),
          attributes: rawRecordSchema.optional(),
          relationships: rawRecordSchema.optional(),
          status: z.string().optional(),
          amount: z.number().optional(),
          currency: z.string().optional(),
          transactionType: z.string().optional(),
          direction: z.string().optional(),
          description: z.string().nullable().optional(),
          createdAt: z.string().optional(),
          updatedAt: z.string().nullable().optional(),
          expectedAvailableAt: z.string().nullable().optional(),
          sourcePartyId: z.string().optional(),
          destinationPartyId: z.string().optional(),
          paymentId: z.string().optional(),
          transferId: z.string().optional(),
          walletId: z.string().optional(),
          transaction: rawRecordSchema
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
    const envelope = await client.request('list transactions', 'get', '/transactions', {
      params: {
        type: ctx.input.type,
        counterpartyPartyId: ctx.input.counterpartyPartyId,
        walletId: ctx.input.walletId,
        customerPartyId: ctx.input.customerPartyId,
        delegated: ctx.input.delegated,
        limit: ctx.input.limit,
        cursor: ctx.input.cursor
      }
    });
    const rawOutput = listRawResult(envelope, 'transactions');
    const transactions = rawOutput.transactions.map(transaction => {
      const attributes =
        typeof transaction.attributes === 'object' &&
        transaction.attributes !== null &&
        !Array.isArray(transaction.attributes)
          ? transaction.attributes
          : {};
      const relationships =
        typeof transaction.relationships === 'object' &&
        transaction.relationships !== null &&
        !Array.isArray(transaction.relationships)
          ? transaction.relationships
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
        ...transaction,
        transactionId: typeof transaction.id === 'string' ? transaction.id : undefined,
        status: typeof attributes.status === 'string' ? attributes.status : undefined,
        amount: typeof attributes.amount === 'number' ? attributes.amount : undefined,
        currency: typeof attributes.currency === 'string' ? attributes.currency : undefined,
        transactionType:
          typeof attributes.transactionType === 'string'
            ? attributes.transactionType
            : undefined,
        direction: typeof attributes.direction === 'string' ? attributes.direction : undefined,
        description:
          typeof attributes.description === 'string' || attributes.description === null
            ? attributes.description
            : undefined,
        createdAt: typeof attributes.createdAt === 'string' ? attributes.createdAt : undefined,
        updatedAt:
          typeof attributes.updatedAt === 'string' || attributes.updatedAt === null
            ? attributes.updatedAt
            : undefined,
        expectedAvailableAt:
          typeof attributes.expectedAvailableAt === 'string' ||
          attributes.expectedAvailableAt === null
            ? attributes.expectedAvailableAt
            : undefined,
        sourcePartyId: relationshipId('sourceParty'),
        destinationPartyId: relationshipId('destinationParty'),
        paymentId: relationshipId('payment'),
        transferId: relationshipId('transfer'),
        walletId: relationshipId('wallet'),
        transaction
      };
    });
    const output = {
      ...rawOutput,
      transactions
    };

    return {
      output,
      message: summaryListMessage(countOf(output, 'transactions'), 'transactions')
    };
  })
  .build();

export const getTransaction = SlateTool.create(spec, {
  name: 'Get Transaction',
  key: 'get_transaction',
  description:
    'Retrieve one payment or transfer transaction visible to the authenticated Natural party, or to a delegated party when partyId is provided. Returns stable monetary, lifecycle, and relationship fields plus the raw transaction resource.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      transactionId: z
        .string()
        .regex(
          /^txn_[0-9a-f]{32}$/,
          'transactionId must be a Natural transaction ID (txn_ + 32 hex characters).'
        )
        .describe('Natural transaction ID (txn_ + 32 hex characters).'),
      partyId: z
        .string()
        .regex(
          /^pty_[0-9a-f]{32}$/,
          'partyId must be a Natural party ID (pty_ + 32 hex characters).'
        )
        .optional()
        .describe(
          'Optional party ID whose transaction is being read through an authorized delegation; defaults to the authenticated party.'
        )
    })
  )
  .output(
    z.object({
      transactionId: z.string().optional(),
      type: z.string().optional(),
      status: z.string().optional(),
      amount: z.number().optional(),
      currency: z.string().optional(),
      transactionType: z.string().optional(),
      direction: z.string().optional(),
      description: z.string().nullable().optional(),
      createdAt: z.string().optional(),
      updatedAt: z.string().nullable().optional(),
      expectedAvailableAt: z.string().nullable().optional(),
      sourcePartyId: z.string().optional(),
      destinationPartyId: z.string().optional(),
      paymentId: z.string().optional(),
      transferId: z.string().optional(),
      walletId: z.string().optional(),
      transaction: rawRecordSchema
    })
  )
  .handleInvocation(async ctx => {
    const client = createClient(ctx);
    const envelope = await client.request(
      'get transaction',
      'get',
      `/transactions/${ctx.input.transactionId}`,
      {
        params: {
          partyId: ctx.input.partyId
        }
      }
    );
    const rawOutput = resourceResult(envelope, 'transactionId', 'transaction');
    const attributes =
      typeof rawOutput.transaction.attributes === 'object' &&
      rawOutput.transaction.attributes !== null &&
      !Array.isArray(rawOutput.transaction.attributes)
        ? rawOutput.transaction.attributes
        : {};
    const relationships =
      typeof rawOutput.transaction.relationships === 'object' &&
      rawOutput.transaction.relationships !== null &&
      !Array.isArray(rawOutput.transaction.relationships)
        ? rawOutput.transaction.relationships
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
    const output = {
      ...rawOutput,
      amount: typeof attributes.amount === 'number' ? attributes.amount : undefined,
      currency: typeof attributes.currency === 'string' ? attributes.currency : undefined,
      transactionType:
        typeof attributes.transactionType === 'string'
          ? attributes.transactionType
          : undefined,
      direction: typeof attributes.direction === 'string' ? attributes.direction : undefined,
      description:
        typeof attributes.description === 'string' || attributes.description === null
          ? attributes.description
          : undefined,
      createdAt: typeof attributes.createdAt === 'string' ? attributes.createdAt : undefined,
      updatedAt:
        typeof attributes.updatedAt === 'string' || attributes.updatedAt === null
          ? attributes.updatedAt
          : undefined,
      expectedAvailableAt:
        typeof attributes.expectedAvailableAt === 'string' ||
        attributes.expectedAvailableAt === null
          ? attributes.expectedAvailableAt
          : undefined,
      sourcePartyId: relationshipId('sourceParty'),
      destinationPartyId: relationshipId('destinationParty'),
      paymentId: relationshipId('payment'),
      transferId: relationshipId('transfer'),
      walletId: relationshipId('wallet')
    };

    return {
      output,
      message: `Retrieved transaction **${ctx.input.transactionId}**.`
    };
  })
  .build();

export const listWallets = SlateTool.create(spec, {
  name: 'List Wallets',
  key: 'list_wallets',
  description:
    'List wallets for the authenticated Natural party, or for an authorized delegated party when partyId is provided. Returns stable wallet, balance, ownership, lifecycle, and deposit fields plus each raw wallet resource.',
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
          "Party ID for an authorized delegated wallet lookup; omit to list the authenticated party's wallets."
        )
    })
  )
  .output(
    z.object({
      wallets: z.array(
        z.object({
          id: z.string().optional(),
          walletId: z.string().optional(),
          type: z.string().optional(),
          attributes: rawRecordSchema.optional(),
          relationships: rawRecordSchema.optional(),
          status: z.string().optional(),
          walletType: z.string().optional(),
          isDefault: z.boolean().optional(),
          displayName: z.string().nullable().optional(),
          description: z.string().nullable().optional(),
          availableBalance: z.number().int().optional(),
          totalBalance: z.number().int().optional(),
          currency: z.string().optional(),
          claimsAmount: z.number().int().optional(),
          claimsCount: z.number().int().optional(),
          depositBankName: z.string().optional(),
          createdAt: z.string().nullable().optional(),
          partyId: z.string().optional(),
          wallet: rawRecordSchema
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
    const envelope = await client.request('list wallets', 'get', '/wallets', {
      params: {
        partyId: ctx.input.partyId
      }
    });
    const rawOutput = listRawResult(envelope, 'wallets');
    const wallets = rawOutput.wallets.map(wallet => {
      const attributes =
        typeof wallet.attributes === 'object' &&
        wallet.attributes !== null &&
        !Array.isArray(wallet.attributes)
          ? wallet.attributes
          : {};
      const relationships =
        typeof wallet.relationships === 'object' &&
        wallet.relationships !== null &&
        !Array.isArray(wallet.relationships)
          ? wallet.relationships
          : {};
      const balance =
        typeof attributes.balance === 'object' &&
        attributes.balance !== null &&
        !Array.isArray(attributes.balance)
          ? attributes.balance
          : {};
      const claims =
        typeof attributes.claims === 'object' &&
        attributes.claims !== null &&
        !Array.isArray(attributes.claims)
          ? attributes.claims
          : {};
      const depositInstructions =
        typeof attributes.depositInstructions === 'object' &&
        attributes.depositInstructions !== null &&
        !Array.isArray(attributes.depositInstructions)
          ? attributes.depositInstructions
          : {};
      const partyRelationship = relationships.party;
      const party =
        typeof partyRelationship === 'object' &&
        partyRelationship !== null &&
        !Array.isArray(partyRelationship) &&
        'data' in partyRelationship &&
        typeof partyRelationship.data === 'object' &&
        partyRelationship.data !== null &&
        !Array.isArray(partyRelationship.data)
          ? partyRelationship.data
          : {};

      return {
        ...wallet,
        walletId: typeof wallet.id === 'string' ? wallet.id : undefined,
        status: typeof attributes.status === 'string' ? attributes.status : undefined,
        walletType:
          typeof attributes.walletType === 'string' ? attributes.walletType : undefined,
        isDefault:
          typeof attributes.isDefault === 'boolean' ? attributes.isDefault : undefined,
        displayName:
          typeof attributes.displayName === 'string' || attributes.displayName === null
            ? attributes.displayName
            : undefined,
        description:
          typeof attributes.description === 'string' || attributes.description === null
            ? attributes.description
            : undefined,
        availableBalance:
          typeof balance.available === 'number' ? balance.available : undefined,
        totalBalance: typeof balance.total === 'number' ? balance.total : undefined,
        currency: typeof balance.currency === 'string' ? balance.currency : undefined,
        claimsAmount: typeof claims.amount === 'number' ? claims.amount : undefined,
        claimsCount: typeof claims.count === 'number' ? claims.count : undefined,
        depositBankName:
          typeof depositInstructions.bankName === 'string'
            ? depositInstructions.bankName
            : undefined,
        createdAt:
          typeof attributes.createdAt === 'string' || attributes.createdAt === null
            ? attributes.createdAt
            : undefined,
        partyId: typeof party.id === 'string' ? party.id : undefined,
        wallet
      };
    });
    const output = {
      ...rawOutput,
      wallets
    };

    return {
      output,
      message: summaryListMessage(countOf(output, 'wallets'), 'wallets')
    };
  })
  .build();

export const getWallet = SlateTool.create(spec, {
  name: 'Get Wallet',
  key: 'get_wallet',
  description:
    'Retrieve one Natural wallet by ID. Returns stable lifecycle, balance, claims, deposit, ownership, and raw wallet fields.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      walletId: z
        .string()
        .regex(
          /^wal_[0-9a-f]{32}$/,
          'walletId must be a Natural wallet ID (wal_ + 32 hex characters).'
        )
        .describe('Natural wallet ID (wal_ + 32 hex characters).')
    })
  )
  .output(
    z.object({
      walletId: z.string().optional(),
      type: z.string().optional(),
      status: z.string().optional(),
      walletType: z.string().optional(),
      isDefault: z.boolean().optional(),
      displayName: z.string().nullable().optional(),
      description: z.string().nullable().optional(),
      availableBalance: z.number().int().optional(),
      totalBalance: z.number().int().optional(),
      currency: z.string().optional(),
      claimsAmount: z.number().int().optional(),
      claimsCount: z.number().int().optional(),
      depositBankName: z.string().optional(),
      createdAt: z.string().nullable().optional(),
      partyId: z.string().optional(),
      wallet: rawRecordSchema
    })
  )
  .handleInvocation(async ctx => {
    const client = createClient(ctx);
    const envelope = await client.request(
      'get wallet',
      'get',
      `/wallets/${ctx.input.walletId}`
    );
    const rawOutput = resourceResult(envelope, 'walletId', 'wallet');
    const attributes =
      typeof rawOutput.wallet.attributes === 'object' &&
      rawOutput.wallet.attributes !== null &&
      !Array.isArray(rawOutput.wallet.attributes)
        ? rawOutput.wallet.attributes
        : {};
    const relationships =
      typeof rawOutput.wallet.relationships === 'object' &&
      rawOutput.wallet.relationships !== null &&
      !Array.isArray(rawOutput.wallet.relationships)
        ? rawOutput.wallet.relationships
        : {};
    const balance =
      typeof attributes.balance === 'object' &&
      attributes.balance !== null &&
      !Array.isArray(attributes.balance)
        ? attributes.balance
        : {};
    const claims =
      typeof attributes.claims === 'object' &&
      attributes.claims !== null &&
      !Array.isArray(attributes.claims)
        ? attributes.claims
        : {};
    const depositInstructions =
      typeof attributes.depositInstructions === 'object' &&
      attributes.depositInstructions !== null &&
      !Array.isArray(attributes.depositInstructions)
        ? attributes.depositInstructions
        : {};
    const partyRelationship = relationships.party;
    const party =
      typeof partyRelationship === 'object' &&
      partyRelationship !== null &&
      !Array.isArray(partyRelationship) &&
      'data' in partyRelationship &&
      typeof partyRelationship.data === 'object' &&
      partyRelationship.data !== null &&
      !Array.isArray(partyRelationship.data)
        ? partyRelationship.data
        : {};
    const output = {
      ...rawOutput,
      walletType:
        typeof attributes.walletType === 'string' ? attributes.walletType : undefined,
      isDefault: typeof attributes.isDefault === 'boolean' ? attributes.isDefault : undefined,
      displayName:
        typeof attributes.displayName === 'string' || attributes.displayName === null
          ? attributes.displayName
          : undefined,
      description:
        typeof attributes.description === 'string' || attributes.description === null
          ? attributes.description
          : undefined,
      availableBalance: typeof balance.available === 'number' ? balance.available : undefined,
      totalBalance: typeof balance.total === 'number' ? balance.total : undefined,
      currency: typeof balance.currency === 'string' ? balance.currency : undefined,
      claimsAmount: typeof claims.amount === 'number' ? claims.amount : undefined,
      claimsCount: typeof claims.count === 'number' ? claims.count : undefined,
      depositBankName:
        typeof depositInstructions.bankName === 'string'
          ? depositInstructions.bankName
          : undefined,
      createdAt:
        typeof attributes.createdAt === 'string' || attributes.createdAt === null
          ? attributes.createdAt
          : undefined,
      partyId: typeof party.id === 'string' ? party.id : undefined
    };

    return {
      output,
      message: `Retrieved wallet **${ctx.input.walletId}**.`
    };
  })
  .build();

export const listExternalAccounts = SlateTool.create(spec, {
  name: 'List External Accounts',
  key: 'list_external_accounts',
  description:
    'List linked Natural external bank accounts visible to the authenticated party. Returns stable lifecycle, connection-health, bank, account-mask, ownership, and raw resource fields with cursor pagination.',
  tags: { readOnly: true }
})
  .input(z.object(paginationInputFields))
  .output(
    z.object({
      externalAccounts: z.array(
        z.object({
          id: z.string().optional(),
          externalAccountId: z.string().optional(),
          type: z.string().optional(),
          attributes: rawRecordSchema.optional(),
          relationships: rawRecordSchema.optional(),
          status: z.string().optional(),
          connectionStatus: z.string().optional(),
          bankName: z.string().nullable().optional(),
          accountName: z.string().nullable().optional(),
          accountType: z.string().nullable().optional(),
          lastFour: z.string().optional(),
          createdAt: z.string().optional(),
          partyId: z.string().optional(),
          externalAccount: rawRecordSchema
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
      'list external accounts',
      'get',
      '/external-accounts',
      {
        params: {
          cursor: ctx.input.cursor,
          limit: ctx.input.limit
        }
      }
    );
    const rawOutput = listRawResult(envelope, 'externalAccounts');
    const externalAccounts = rawOutput.externalAccounts.map(externalAccount => {
      const attributes =
        typeof externalAccount.attributes === 'object' &&
        externalAccount.attributes !== null &&
        !Array.isArray(externalAccount.attributes)
          ? externalAccount.attributes
          : {};
      const relationships =
        typeof externalAccount.relationships === 'object' &&
        externalAccount.relationships !== null &&
        !Array.isArray(externalAccount.relationships)
          ? externalAccount.relationships
          : {};
      const partyRelationship = relationships.party;
      const party =
        typeof partyRelationship === 'object' &&
        partyRelationship !== null &&
        !Array.isArray(partyRelationship) &&
        'data' in partyRelationship &&
        typeof partyRelationship.data === 'object' &&
        partyRelationship.data !== null &&
        !Array.isArray(partyRelationship.data)
          ? partyRelationship.data
          : {};

      return {
        ...externalAccount,
        externalAccountId:
          typeof externalAccount.id === 'string' ? externalAccount.id : undefined,
        status: typeof attributes.status === 'string' ? attributes.status : undefined,
        connectionStatus:
          typeof attributes.connectionStatus === 'string'
            ? attributes.connectionStatus
            : undefined,
        bankName:
          typeof attributes.bankName === 'string' || attributes.bankName === null
            ? attributes.bankName
            : undefined,
        accountName:
          typeof attributes.accountName === 'string' || attributes.accountName === null
            ? attributes.accountName
            : undefined,
        accountType:
          typeof attributes.accountType === 'string' || attributes.accountType === null
            ? attributes.accountType
            : undefined,
        lastFour: typeof attributes.lastFour === 'string' ? attributes.lastFour : undefined,
        createdAt: typeof attributes.createdAt === 'string' ? attributes.createdAt : undefined,
        partyId: typeof party.id === 'string' ? party.id : undefined,
        externalAccount
      };
    });
    const output = {
      ...rawOutput,
      externalAccounts
    };

    return {
      output,
      message: summaryListMessage(countOf(output, 'externalAccounts'), 'external accounts')
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

const externalAccountIdSchema = z
  .string()
  .min(5, 'External account IDs require a non-empty value after eac_.')
  .startsWith('eac_', 'External account IDs use the eac_ prefix.')
  .refine(isUriEncodable, 'Natural external account ID must be well-formed Unicode.');

const removeExternalAccountSuccessSchema = z
  .object({
    data: z
      .object({
        type: z.literal('externalAccount'),
        id: externalAccountIdSchema,
        attributes: z
          .object({
            bankName: z.string().nullable(),
            accountName: z.string().nullable(),
            accountType: z.string().nullable(),
            lastFour: z.string(),
            status: z.string().min(1),
            connectionStatus: z.string().min(1),
            createdAt: z.string().datetime({ offset: true })
          })
          .passthrough(),
        relationships: z
          .object({
            party: z
              .object({
                data: z
                  .object({
                    type: z.literal('party'),
                    id: z.string().min(1)
                  })
                  .passthrough()
              })
              .passthrough()
          })
          .passthrough()
      })
      .passthrough(),
    meta: z
      .object({
        deleted: z.literal(true)
      })
      .passthrough()
  })
  .passthrough();

export const removeExternalAccount = SlateTool.create(spec, {
  name: 'Remove External Account',
  key: 'remove_external_account',
  description:
    'Remove (unlink) a linked Natural external account so the current link can no longer be used as a funding source. Requires explicit confirmation, is not documented as idempotent, and returns the removed account resource, lifecycle status, and deletion metadata.',
  tags: { destructive: true }
})
  .input(
    z.object({
      externalAccountId: externalAccountIdSchema.describe(
        'Natural external account ID with the eac_ prefix and a nonempty opaque suffix.'
      ),
      confirm: confirmSchema
    })
  )
  .output(
    z.object({
      externalAccountId: z.string().optional().describe('Removed external account ID.'),
      type: z.string().optional().describe('Natural resource type.'),
      status: z
        .string()
        .optional()
        .describe('External account lifecycle status returned after removal.'),
      externalAccount: rawRecordSchema.describe(
        'Raw Natural external account resource returned after removal, including attributes and relationships.'
      ),
      deleted: z
        .literal(true)
        .describe('Natural confirmed that the external account was deleted.'),
      meta: rawRecordSchema.describe(
        'Raw Natural deletion metadata, preserving request identifiers and additive fields.'
      )
    })
  )
  .handleInvocation(async ctx => {
    requireConfirm(ctx.input.confirm, 'remove this external account');
    const client = createClient(ctx);
    const envelope = await client.request(
      'remove external account',
      'delete',
      `/external-accounts/${encodeURIComponent(ctx.input.externalAccountId)}`
    );
    const response = removeExternalAccountSuccessSchema.safeParse(envelope);
    if (!response.success) {
      throw naturalServiceError(
        'Natural returned a malformed success response when removing an external account. Verify external account state in Natural before retrying this non-idempotent request.',
        'natural_response_error'
      );
    }
    if (response.data.data.id !== ctx.input.externalAccountId) {
      throw naturalServiceError(
        'Natural returned a different external account than the one requested when removing it. Verify external account state in Natural before retrying this non-idempotent request.',
        'natural_response_error'
      );
    }

    const { data: externalAccount, meta } = response.data;

    return {
      output: {
        externalAccountId: externalAccount.id,
        type: externalAccount.type,
        status: externalAccount.attributes.status,
        externalAccount,
        deleted: meta.deleted,
        meta
      },
      message: `Removed external account **${ctx.input.externalAccountId}**.`
    };
  })
  .build();

const legacyCounterpartyResourceSchema = z
  .object({
    id: z.string().min(1),
    type: z.literal('party'),
    attributes: z
      .object({
        counterpartyPartyId: z.string().min(1),
        totalAmountMinor: z.number().int(),
        transactionCount: z.number().int().nonnegative(),
        firstAt: z.string().datetime({ offset: true }),
        partyName: z.string().nullable(),
        partyEmail: z.string().nullable(),
        partyStatus: z.string().nullable()
      })
      .passthrough()
  })
  .passthrough();

const legacyCounterpartyListSuccessSchema = z
  .object({
    data: z.array(legacyCounterpartyResourceSchema),
    meta: z
      .object({
        pagination: z
          .object({
            hasMore: z.boolean(),
            nextCursor: z.string().nullable()
          })
          .passthrough()
      })
      .passthrough()
  })
  .passthrough();

export const listCounterparties = SlateTool.create(spec, {
  name: 'List Counterparties',
  key: 'list_counterparties',
  description:
    'List aggregated counterparties through Natural provider-deprecated legacy directional endpoints. Choose sent for recipients of payments from your agents or received for senders to your agents. Returns aggregate payment activity, identity fields, raw resources, and raw response metadata with cursor pagination.',
  instructions: [
    'Retain this tool only for compatibility with existing workflows. Natural currently documents no equivalent replacement endpoint.'
  ],
  constraints: [
    'The current Natural OpenAPI and SDK omit these legacy endpoints and currently offer no replacement endpoint.',
    'A direction is required because Natural never documented an unfiltered GET /counterparties endpoint.'
  ],
  tags: { readOnly: true, deprecated: true }
})
  .input(
    z.object({
      direction: z
        .enum(['sent', 'received'])
        .describe(
          'Required legacy endpoint direction: sent lists recipients of payments from your agents; received lists senders of payments to your agents.'
        ),
      ...paginationInputFields
    })
  )
  .output(
    z.object({
      counterparties: z.array(
        z.object({
          id: z.string().optional().describe('Raw Natural counterparty resource ID.'),
          counterpartyId: z
            .string()
            .optional()
            .describe(
              'Natural counterparty party ID from the legacy aggregate resource attributes.'
            ),
          partyId: z
            .string()
            .optional()
            .describe('Natural party ID when the counterparty has a claimed party identity.'),
          type: z.string().optional().describe('Natural resource type, currently party.'),
          attributes: rawRecordSchema
            .optional()
            .describe('Raw Natural counterparty attributes.'),
          relationships: rawRecordSchema
            .optional()
            .describe('Raw relationships when Natural includes them.'),
          name: z.string().nullable().optional().describe('Counterparty display name.'),
          email: z
            .string()
            .nullable()
            .optional()
            .describe('Counterparty primary contact email.'),
          status: z.string().nullable().optional().describe('Counterparty lifecycle status.'),
          totalAmountMinor: z
            .number()
            .int()
            .describe('Aggregate payment amount in minor currency units.'),
          transactionCount: z
            .number()
            .int()
            .nonnegative()
            .describe('Number of aggregated payment transactions.'),
          firstAt: z.string().describe('Timestamp of the first aggregated payment activity.'),
          counterparty: rawRecordSchema.describe(
            'Complete raw Natural counterparty resource, preserving provider metadata and additive fields.'
          )
        })
      ),
      pagination: z.object({
        hasMore: z.boolean(),
        nextCursor: z.string().nullable()
      }),
      meta: rawRecordSchema.describe(
        'Complete raw Natural response metadata, including pagination and additive fields.'
      )
    })
  )
  .handleInvocation(async ctx => {
    const client = createClient(ctx);
    const envelope = await client.request(
      'list counterparties',
      'get',
      `/counterparties/${ctx.input.direction}`,
      {
        params: {
          limit: ctx.input.limit,
          cursor: ctx.input.cursor
        }
      }
    );
    const response = legacyCounterpartyListSuccessSchema.safeParse(envelope);
    if (!response.success) {
      throw naturalServiceError(
        'Natural returned a malformed success response when listing legacy counterparties. The response must include complete counterparty resources and pagination metadata. Retry the read or inspect the provider response before using these results.',
        'natural_response_error'
      );
    }

    const counterparties = response.data.data.map(counterparty => {
      const { attributes } = counterparty;

      return {
        ...counterparty,
        counterpartyId: attributes.counterpartyPartyId,
        partyId: attributes.counterpartyPartyId,
        name: attributes.partyName,
        email: attributes.partyEmail,
        status: attributes.partyStatus,
        totalAmountMinor: attributes.totalAmountMinor,
        transactionCount: attributes.transactionCount,
        firstAt: attributes.firstAt,
        counterparty
      };
    });
    const output = {
      counterparties,
      pagination: response.data.meta.pagination,
      meta: response.data.meta
    };

    return {
      output,
      message: summaryListMessage(countOf(output, 'counterparties'), 'counterparties')
    };
  })
  .build();
