import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { buildFilterParams, flattenResource, validateInput } from '../lib/helpers';
import { spec } from '../spec';

export const listSequenceStates = SlateTool.create(spec, {
  name: 'List Sequence Enrollments',
  key: 'list_sequence_states',
  description:
    'Discover prospect enrollments and their current state before requesting pause, resume or finish. Filter by prospect, sequence or mailbox; returns identifiers and continuation cursors.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      prospectId: z.string().optional().describe('Filter by prospect ID.'),
      sequenceId: z.string().optional().describe('Filter by sequence ID.'),
      mailboxId: z
        .string()
        .optional()
        .describe('Filter by sending mailbox ID; discover mailboxes with list_metadata.'),
      state: z
        .string()
        .optional()
        .describe('Exact provider state, such as active, paused or finished.'),
      pageSize: z.number().optional().describe('Results per page, from 1 to 1000.'),
      pageOffset: z
        .number()
        .optional()
        .describe('Legacy offset from 0 to 10000; omit to use cursor pagination.'),
      pageAfter: z
        .string()
        .optional()
        .describe('Returned nextPageAfter cursor with unchanged filters and sorting.'),
      sortBy: z
        .string()
        .optional()
        .describe('Supported attribute name, with a minus prefix for descending order.')
    })
  )
  .output(
    z.object({
      sequenceStates: z.array(
        z.object({
          sequenceStateId: z.string(),
          state: z.string().optional(),
          prospectId: z.string().optional(),
          sequenceId: z.string().optional(),
          mailboxId: z.string().optional(),
          sequenceStepId: z.string().optional(),
          createdAt: z.string().optional(),
          updatedAt: z.string().optional()
        })
      ),
      hasMore: z.boolean(),
      nextPageAfter: z.string().optional(),
      nextPageOffset: z.number().optional(),
      totalCount: z
        .number()
        .optional()
        .describe('Exact provider count when available and not truncated.')
    })
  )
  .handleInvocation(async ctx => {
    validateInput(ctx.input);
    const params = buildFilterParams({
      'prospect/id': ctx.input.prospectId,
      'sequence/id': ctx.input.sequenceId,
      'mailbox/id': ctx.input.mailboxId,
      state: ctx.input.state
    });
    if (ctx.input.pageSize !== undefined) params['page[limit]'] = String(ctx.input.pageSize);
    if (ctx.input.pageOffset !== undefined)
      params['page[offset]'] = String(ctx.input.pageOffset);
    if (ctx.input.pageAfter !== undefined) params['page[after]'] = ctx.input.pageAfter;
    if (ctx.input.sortBy !== undefined) params.sort = ctx.input.sortBy;
    const result = await new Client({ token: ctx.auth.token }).listSequenceStates(params);
    const sequenceStates = result.records.map(resource => {
      const row = flattenResource(resource);
      return {
        sequenceStateId: row.id,
        state: row.state,
        prospectId: row.prospectId,
        sequenceId: row.sequenceId,
        mailboxId: row.mailboxId,
        sequenceStepId: row.sequenceStepId,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt
      };
    });
    return {
      output: {
        sequenceStates,
        hasMore: result.hasMore,
        nextPageAfter: result.nextPageAfter,
        nextPageOffset: result.nextPageOffset,
        totalCount: result.totalCount ?? undefined
      },
      message: `Found ${sequenceStates.length} enrollments${result.hasMore ? ' (more available)' : ''}.`
    };
  })
  .build();
