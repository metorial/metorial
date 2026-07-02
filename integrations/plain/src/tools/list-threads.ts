import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listThreads = SlateTool.create(spec, {
  name: 'List Threads',
  key: 'list_threads',
  description: `List support threads with optional filtering by status, customer, or tenant. Returns thread details with pagination support.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      first: z.number().optional().default(25).describe('Number of threads to return'),
      after: z.string().optional().describe('Cursor for pagination'),
      statuses: z
        .array(z.enum(['TODO', 'SNOOZED', 'DONE']))
        .optional()
        .describe('Filter by thread statuses'),
      customerId: z.string().optional().describe('Filter by customer ID'),
      tenantIdentifier: z
        .object({
          tenantId: z.string().optional().describe('Plain tenant ID'),
          externalId: z.string().optional().describe('External tenant ID')
        })
        .optional()
        .describe('Filter by tenant')
    })
  )
  .output(
    z.object({
      threads: z.array(
        z.object({
          threadId: z.string().describe('Plain thread ID'),
          title: z.string().nullable().describe('Thread title'),
          status: z.string().describe('Thread status'),
          priority: z.number().describe('Priority level'),
          customerId: z.string().describe('Customer ID'),
          createdAt: z.string().describe('ISO 8601 creation timestamp')
        })
      ),
      hasNextPage: z.boolean().describe('Whether more pages exist'),
      endCursor: z.string().nullable().describe('Cursor for next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let filters: any = {};
    if (ctx.input.statuses) {
      filters.statuses = ctx.input.statuses;
    }
    if (ctx.input.customerId) {
      filters.customerIds = [ctx.input.customerId];
    }
    if (ctx.input.tenantIdentifier) {
      filters.tenantIdentifiers = [ctx.input.tenantIdentifier];
    }

    let res = await client.getThreads(
      Object.keys(filters).length > 0 ? filters : undefined,
      ctx.input.first,
      ctx.input.after
    );

    let threads = (res.edges || []).map((edge: any) => ({
      threadId: edge.node.id,
      title: edge.node.title,
      status: edge.node.status,
      priority: edge.node.priority,
      customerId: edge.node.customer?.id,
      createdAt: edge.node.createdAt?.iso8601
    }));

    return {
      output: {
        threads,
        hasNextPage: res.pageInfo?.hasNextPage ?? false,
        endCursor: res.pageInfo?.endCursor ?? null
      },
      message: `Returned **${threads.length}** threads`
    };
  })
  .build();
