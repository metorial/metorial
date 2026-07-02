import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { calComServiceError } from '../lib/errors';
import { spec } from '../spec';

let reasonSchema = z.enum(['unspecified', 'vacation', 'travel', 'sick', 'public_holiday']);

export let manageOutOfOffice = SlateTool.create(spec, {
  name: 'Manage Out Of Office',
  key: 'manage_out_of_office',
  description: `List, create, update, or delete out-of-office entries for the authenticated Cal.com user.`,
  instructions: [
    'Use start and end ISO 8601 timestamps for create.',
    'Use oooId for update and delete.',
    'reason should be one of unspecified, vacation, travel, sick, or public_holiday.'
  ]
})
  .input(
    z.object({
      action: z
        .enum(['list', 'create', 'update', 'delete'])
        .describe('Out-of-office action to perform'),
      oooId: z.number().optional().describe('Out-of-office entry ID for update/delete'),
      start: z.string().optional().describe('Start time in ISO 8601 format'),
      end: z.string().optional().describe('End time in ISO 8601 format'),
      notes: z.string().optional().describe('Optional notes for the out-of-office entry'),
      toUserId: z
        .number()
        .optional()
        .describe('Optional user ID to route bookings to during the out-of-office period'),
      reason: reasonSchema.optional().describe('Reason for the out-of-office entry'),
      take: z.number().optional().describe('Maximum entries to return for list'),
      skip: z.number().optional().describe('Entries to skip for list'),
      sortStart: z.enum(['asc', 'desc']).optional().describe('Sort list by start time'),
      sortEnd: z.enum(['asc', 'desc']).optional().describe('Sort list by end time')
    })
  )
  .output(
    z.object({
      entries: z.array(z.any()).optional().describe('Out-of-office entries for list'),
      entry: z.any().optional().describe('Out-of-office entry for create/update'),
      result: z.any().optional().describe('Raw result for delete or non-array list responses')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    switch (ctx.input.action) {
      case 'list': {
        let params: Record<string, any> = {};
        if (ctx.input.take !== undefined) params.take = ctx.input.take;
        if (ctx.input.skip !== undefined) params.skip = ctx.input.skip;
        if (ctx.input.sortStart) params.sortStart = ctx.input.sortStart;
        if (ctx.input.sortEnd) params.sortEnd = ctx.input.sortEnd;

        let result = await client.listOutOfOffice(params);
        let entries = Array.isArray(result) ? result : [];
        return {
          output: { entries, result },
          message: `Found **${entries.length}** out-of-office entr${
            entries.length === 1 ? 'y' : 'ies'
          }.`
        };
      }
      case 'create': {
        if (!ctx.input.start || !ctx.input.end) {
          throw calComServiceError('start and end are required for create.');
        }

        let body: Record<string, any> = {
          start: ctx.input.start,
          end: ctx.input.end
        };
        if (ctx.input.notes) body.notes = ctx.input.notes;
        if (ctx.input.toUserId !== undefined) body.toUserId = ctx.input.toUserId;
        if (ctx.input.reason) body.reason = ctx.input.reason;

        let entry = await client.createOutOfOffice(body);
        return {
          output: { entry },
          message: 'Out-of-office entry created.'
        };
      }
      case 'update': {
        if (ctx.input.oooId === undefined) {
          throw calComServiceError('oooId is required for update.');
        }

        let body: Record<string, any> = {};
        if (ctx.input.start) body.start = ctx.input.start;
        if (ctx.input.end) body.end = ctx.input.end;
        if (ctx.input.notes) body.notes = ctx.input.notes;
        if (ctx.input.toUserId !== undefined) body.toUserId = ctx.input.toUserId;
        if (ctx.input.reason) body.reason = ctx.input.reason;
        if (Object.keys(body).length === 0) {
          throw calComServiceError(
            'start, end, notes, toUserId, or reason is required for update.'
          );
        }

        let entry = await client.updateOutOfOffice(ctx.input.oooId, body);
        return {
          output: { entry },
          message: `Out-of-office entry **${ctx.input.oooId}** updated.`
        };
      }
      case 'delete': {
        if (ctx.input.oooId === undefined) {
          throw calComServiceError('oooId is required for delete.');
        }

        let result = await client.deleteOutOfOffice(ctx.input.oooId);
        return {
          output: { result },
          message: `Out-of-office entry **${ctx.input.oooId}** deleted.`
        };
      }
    }

    throw calComServiceError(`Unsupported out-of-office action: ${ctx.input.action}`);
  })
  .build();
