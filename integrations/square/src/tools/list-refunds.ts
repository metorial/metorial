import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';
import { mapRefund, refundOutputSchema } from './shared';

export let listRefunds = SlateTool.create(spec, {
  name: 'List Refunds',
  key: 'list_refunds',
  description:
    'Retrieve Square payment refunds with pagination and filters for created time, updated time, location, status, and source type.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      beginTime: z.string().optional().describe('Start created_at time in RFC 3339 format'),
      endTime: z.string().optional().describe('End created_at time in RFC 3339 format'),
      updatedAtBeginTime: z
        .string()
        .optional()
        .describe('Start updated_at time in RFC 3339 format'),
      updatedAtEndTime: z
        .string()
        .optional()
        .describe('End updated_at time in RFC 3339 format'),
      sortOrder: z.enum(['ASC', 'DESC']).optional().describe('Sort order by created_at'),
      sortField: z.enum(['CREATED_AT', 'UPDATED_AT']).optional().describe('Refund sort field'),
      cursor: z.string().optional().describe('Pagination cursor from a previous response'),
      locationId: z.string().optional().describe('Filter refunds by location ID'),
      status: z
        .enum(['PENDING', 'COMPLETED', 'REJECTED', 'FAILED'])
        .optional()
        .describe('Filter refunds by status'),
      sourceType: z
        .enum(['CARD', 'BANK_ACCOUNT', 'WALLET', 'CASH', 'EXTERNAL'])
        .optional()
        .describe('Filter refunds by payment source type'),
      limit: z.number().optional().describe('Maximum number of results per page (max 100)')
    })
  )
  .output(
    z.object({
      refunds: z.array(refundOutputSchema),
      cursor: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth, ctx.config);
    let result = await client.listRefunds({
      beginTime: ctx.input.beginTime,
      endTime: ctx.input.endTime,
      updatedAtBeginTime: ctx.input.updatedAtBeginTime,
      updatedAtEndTime: ctx.input.updatedAtEndTime,
      sortOrder: ctx.input.sortOrder,
      sortField: ctx.input.sortField,
      cursor: ctx.input.cursor,
      locationId: ctx.input.locationId,
      status: ctx.input.status,
      sourceType: ctx.input.sourceType,
      limit: ctx.input.limit
    });

    let refunds = result.refunds.map(mapRefund);

    return {
      output: { refunds, cursor: result.cursor },
      message: `Found **${refunds.length}** refund(s).${result.cursor ? ' More results available.' : ''}`
    };
  })
  .build();
