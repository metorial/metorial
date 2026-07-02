import { SlateTool } from 'slates';
import { z } from 'zod';
import { PersonaClient } from '../lib/client';
import { normalizeResource } from '../lib/helpers';
import { spec } from '../spec';

export let createTransaction = SlateTool.create(spec, {
  name: 'Create Transaction',
  key: 'create_transaction',
  description: `Create a new transaction for API-driven identity verification. Transactions are the primary mechanism for triggering verifications and reports through Workflows without front-end user interaction.`,
  tags: { destructive: false, readOnly: false }
})
  .input(
    z.object({
      referenceId: z.string().optional().describe('Your internal reference ID'),
      transactionTemplateId: z.string().optional().describe('Transaction template ID'),
      accountId: z.string().optional().describe('Persona account ID to associate with'),
      fields: z
        .record(z.string(), z.any())
        .optional()
        .describe('Fields for the transaction (name, address, etc.)')
    })
  )
  .output(
    z.object({
      transactionId: z.string().describe('Persona transaction ID'),
      status: z.string().optional().describe('Transaction status'),
      attributes: z
        .record(z.string(), z.any())
        .optional()
        .describe('Full transaction attributes')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PersonaClient({ token: ctx.auth.token });

    let attrs: Record<string, any> = {};
    if (ctx.input.referenceId) attrs['reference-id'] = ctx.input.referenceId;
    if (ctx.input.transactionTemplateId)
      attrs['transaction-template-id'] = ctx.input.transactionTemplateId;
    if (ctx.input.accountId) attrs['account-id'] = ctx.input.accountId;
    if (ctx.input.fields) attrs.fields = ctx.input.fields;

    let result = await client.createTransaction(attrs);
    let normalized = normalizeResource(result.data);

    return {
      output: {
        transactionId: result.data?.id,
        status: normalized.status,
        attributes: normalized
      },
      message: `Created transaction **${result.data?.id}**. Status: **${normalized.status || 'created'}**.`
    };
  })
  .build();

export let getTransaction = SlateTool.create(spec, {
  name: 'Get Transaction',
  key: 'get_transaction',
  description: `Retrieve the details of a specific transaction including its status, associated verifications, and reports.`,
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      transactionId: z.string().describe('Persona transaction ID (starts with txn_)')
    })
  )
  .output(
    z.object({
      transactionId: z.string().describe('Transaction ID'),
      status: z.string().optional().describe('Transaction status'),
      referenceId: z.string().optional().describe('Reference ID'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      attributes: z
        .record(z.string(), z.any())
        .optional()
        .describe('Full transaction attributes'),
      included: z.array(z.any()).optional().describe('Related resources')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PersonaClient({ token: ctx.auth.token });
    let result = await client.getTransaction(ctx.input.transactionId);
    let n = normalizeResource(result.data);

    return {
      output: {
        transactionId: result.data?.id,
        status: n.status,
        referenceId: n['reference-id'] || n.reference_id,
        createdAt: n['created-at'] || n.created_at,
        attributes: n,
        included: result.included
      },
      message: `Transaction **${result.data?.id}** is **${n.status}**.`
    };
  })
  .build();

export let listTransactions = SlateTool.create(spec, {
  name: 'List Transactions',
  key: 'list_transactions',
  description: `List transactions with optional filters. Supports cursor-based pagination.`,
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      filterReferenceId: z.string().optional().describe('Filter by reference ID'),
      filterStatus: z.string().optional().describe('Filter by status'),
      pageSize: z.number().optional().describe('Number of results per page'),
      pageCursor: z.string().optional().describe('Cursor for pagination')
    })
  )
  .output(
    z.object({
      transactions: z
        .array(
          z.object({
            transactionId: z.string().describe('Transaction ID'),
            status: z.string().optional().describe('Status'),
            referenceId: z.string().optional().describe('Reference ID'),
            createdAt: z.string().optional().describe('Creation timestamp')
          })
        )
        .describe('List of transactions'),
      nextCursor: z.string().optional().describe('Cursor for the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PersonaClient({ token: ctx.auth.token });
    let result = await client.listTransactions({
      filterReferenceId: ctx.input.filterReferenceId,
      filterStatus: ctx.input.filterStatus,
      pageSize: ctx.input.pageSize,
      pageAfter: ctx.input.pageCursor
    });

    let transactions = (result.data || []).map((item: any) => {
      let n = normalizeResource(item);
      return {
        transactionId: item.id,
        status: n.status,
        referenceId: n['reference-id'] || n.reference_id,
        createdAt: n['created-at'] || n.created_at
      };
    });

    let nextCursor: string | undefined;
    if (result.links?.next) {
      try {
        let parsed = new URL(result.links.next, 'https://withpersona.com');
        nextCursor = parsed.searchParams.get('page[after]') || undefined;
      } catch {
        /* ignore */
      }
    }

    return {
      output: { transactions, nextCursor },
      message: `Found **${transactions.length}** transactions.`
    };
  })
  .build();

export let tagTransaction = SlateTool.create(spec, {
  name: 'Tag Transaction',
  key: 'tag_transaction',
  description: `Add or remove tags on a transaction to organize and categorize them.`,
  tags: { destructive: false, readOnly: false }
})
  .input(
    z.object({
      transactionId: z.string().describe('Persona transaction ID (starts with txn_)'),
      action: z.enum(['add', 'remove']).describe('Tag action: add or remove a tag'),
      tag: z.string().describe('Tag name')
    })
  )
  .output(
    z.object({
      transactionId: z.string().describe('Transaction ID'),
      attributes: z
        .record(z.string(), z.any())
        .optional()
        .describe('Updated transaction attributes')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PersonaClient({ token: ctx.auth.token });
    let result: any;

    if (ctx.input.action === 'add') {
      result = await client.addTransactionTag(ctx.input.transactionId, ctx.input.tag);
    } else {
      result = await client.removeTransactionTag(ctx.input.transactionId, ctx.input.tag);
    }

    let normalized = normalizeResource(result.data);
    return {
      output: {
        transactionId: result.data?.id || ctx.input.transactionId,
        attributes: normalized
      },
      message: `${ctx.input.action === 'add' ? 'Added' : 'Removed'} tag "${ctx.input.tag}" on transaction **${ctx.input.transactionId}**.`
    };
  })
  .build();
