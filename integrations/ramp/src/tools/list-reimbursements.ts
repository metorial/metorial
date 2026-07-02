import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listReimbursements = SlateTool.create(spec, {
  name: 'List Reimbursements',
  key: 'list_reimbursements',
  description: `Retrieve a paginated list of employee reimbursements. Supports filtering by state, sync status, entity, user, date range, and direction (business-to-user or user-to-business repayments).`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      cursor: z.string().optional().describe('Pagination cursor from a previous response'),
      pageSize: z
        .number()
        .min(2)
        .max(100)
        .optional()
        .describe('Number of results per page (2-100)'),
      state: z.string().optional().describe('Filter by reimbursement state'),
      syncStatus: z.string().optional().describe('Filter by sync status (e.g. SYNC_READY)'),
      entityId: z.string().optional().describe('Filter by business entity ID'),
      userId: z.string().optional().describe('Filter by user ID'),
      fromDate: z
        .string()
        .optional()
        .describe('Filter reimbursements from this date (ISO 8601)'),
      toDate: z
        .string()
        .optional()
        .describe('Filter reimbursements until this date (ISO 8601)'),
      direction: z
        .enum(['BUSINESS_TO_USER', 'USER_TO_BUSINESS'])
        .optional()
        .describe('Filter by direction')
    })
  )
  .output(
    z.object({
      reimbursements: z.array(z.any()).describe('List of reimbursement objects'),
      nextCursor: z.string().optional().describe('Cursor for fetching the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      environment: ctx.config.environment
    });

    let result = await client.listReimbursements({
      start: ctx.input.cursor,
      pageSize: ctx.input.pageSize,
      state: ctx.input.state,
      syncStatus: ctx.input.syncStatus,
      entityId: ctx.input.entityId,
      userId: ctx.input.userId,
      fromDate: ctx.input.fromDate,
      toDate: ctx.input.toDate,
      direction: ctx.input.direction
    });

    return {
      output: {
        reimbursements: result.data,
        nextCursor: result.page?.next
      },
      message: `Retrieved **${result.data.length}** reimbursements${result.page?.next ? ' (more pages available)' : ''}.`
    };
  })
  .build();
