import { SlateTool } from 'slates';
import { z } from 'zod';
import { harvestAccountIdSchema, resolveHarvestAccountId } from '../lib/account-id';
import { HarvestClient } from '../lib/client';
import { spec } from '../spec';

export let listEstimates = SlateTool.create(spec, {
  name: 'List Estimates',
  key: 'list_estimates',
  description:
    'List Harvest estimates to discover estimate IDs, clients, amounts, and states before updating an estimate. Call list_accounts to discover account IDs when choosing between multiple accounts.',
  constraints: [
    'Requires administrator access or a manager with permission to create and edit estimates.'
  ],
  tags: { readOnly: true }
})
  .input(
    z.object({
      accountId: harvestAccountIdSchema,
      clientId: z.number().optional().describe('Filter by client ID from list_clients'),
      state: z
        .string()
        .optional()
        .describe('Filter by state: draft, sent, accepted, or declined'),
      updatedSince: z
        .string()
        .optional()
        .describe('Only estimates updated since this ISO 8601 timestamp'),
      from: z.string().optional().describe('Earliest issue date (YYYY-MM-DD)'),
      to: z.string().optional().describe('Latest issue date (YYYY-MM-DD)'),
      page: z.number().int().min(1).optional().describe('Page number'),
      perPage: z.number().int().min(1).max(2000).optional().describe('Results per page')
    })
  )
  .output(
    z.object({
      estimates: z.array(
        z.object({
          estimateId: z.number(),
          number: z.string().nullable(),
          clientId: z.number().optional(),
          clientName: z.string().optional(),
          subject: z.string().nullable(),
          amount: z.number(),
          currency: z.string(),
          state: z.string(),
          issueDate: z.string().nullable(),
          createdAt: z.string(),
          updatedAt: z.string()
        })
      ),
      totalEntries: z.number(),
      totalPages: z.number(),
      page: z.number(),
      nextPage: z.number().nullable()
    })
  )
  .handleInvocation(async ctx => {
    let client = new HarvestClient({
      token: ctx.auth.token,
      accountId: resolveHarvestAccountId(ctx)
    });
    let result = await client.listEstimates(ctx.input);
    return {
      output: {
        estimates: result.results.map(estimate => ({
          estimateId: estimate.id,
          number: estimate.number,
          clientId: estimate.client?.id,
          clientName: estimate.client?.name,
          subject: estimate.subject,
          amount: estimate.amount,
          currency: estimate.currency,
          state: estimate.state,
          issueDate: estimate.issue_date,
          createdAt: estimate.created_at,
          updatedAt: estimate.updated_at
        })),
        totalEntries: result.totalEntries,
        totalPages: result.totalPages,
        page: result.page,
        nextPage: result.nextPage
      },
      message: `Found **${result.totalEntries}** estimates.`
    };
  })
  .build();
