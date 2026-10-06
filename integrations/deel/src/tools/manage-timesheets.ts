import { anyOf, createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { isDeelNotFound } from '../lib/errors';
import {
  acknowledgedData,
  dataList,
  dataObject,
  exactResourceId,
  pageSchema,
  requireDate,
  requireNumber,
  requireText,
  resourceSchema,
  responsePage,
  validateLimit,
  validateOffset
} from '../lib/response';
import { createClient } from '../lib/utils';
import { spec } from '../spec';

export let manageTimesheets = SlateTool.create(spec, {
  name: 'Manage Timesheets',
  key: 'manage_timesheets',
  description: `Create, list, read, review or delete contractor timesheets. Use action "list" to retrieve timesheets for a contract, "create" to submit a new timesheet entry, or "review" to approve or decline a timesheet.`,
  tags: { destructive: true },
  instructions: [
    'For "list": provide contractId.',
    'For "create": provide contractId, quantity, dateSubmitted, and optionally a description.',
    'For "review": provide timesheetId and reviewStatus ("approved" or "declined"), with an optional reason.'
  ]
})
  .scopes(anyOf('timesheets:read', 'timesheets:write'))
  .input(
    z.object({
      action: z
        .enum(['list', 'create', 'review', 'get', 'delete'])
        .describe('Action to perform'),
      contractId: z
        .string()
        .optional()
        .describe('Contract ID (required for "list" and "create")'),
      quantity: z
        .number()
        .optional()
        .describe('For "create": number of hours or units worked'),
      description: z
        .string()
        .optional()
        .describe('For "create": description of work performed'),
      dateSubmitted: z.string().optional().describe('For "create": date of work (YYYY-MM-DD)'),
      timesheetId: z.string().optional().describe('For get, review or delete: timesheet ID'),
      reviewStatus: z
        .enum(['approved', 'declined'])
        .optional()
        .describe('For "review": approval decision'),
      reviewReason: z.string().optional().describe('For "review": reason for the decision'),
      limit: z.number().optional().describe('For list: positive integer page size'),
      offset: z.number().optional().describe('For list: page offset')
    })
  )
  .output(
    z.object({
      timesheets: z
        .array(resourceSchema)
        .optional()
        .describe('List of timesheets (for "list" action)'),
      timesheet: z
        .record(z.string(), z.any())
        .optional()
        .describe('Provider creation or review acknowledgement'),
      page: pageSchema.optional(),
      deleted: z.boolean().optional(),
      resourceId: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    switch (ctx.input.action) {
      case 'get': {
        let id = requireText(ctx.input.timesheetId, 'timesheetId');
        let timesheet = dataObject(await client.getTimesheet(id), 'timesheet');
        if (exactResourceId(timesheet.id) !== id)
          throw createApiServiceError('Deel returned a different timesheet identity.');
        return { output: { timesheet }, message: `Retrieved timesheet **${id}**.` };
      }
      case 'delete': {
        let id = requireText(ctx.input.timesheetId, 'timesheetId');
        acknowledgedData(await client.deleteTimesheet(id), 'delete timesheet', 'deleted');
        try {
          await client.getTimesheet(id);
        } catch (error) {
          if (isDeelNotFound(error))
            return {
              output: { deleted: true, resourceId: id },
              message: `Deleted timesheet **${id}** and confirmed it is no longer available.`
            };
          throw createApiServiceError(
            'Deel acknowledged deletion but removal could not be verified. Check the resource before retrying.'
          );
        }
        throw createApiServiceError(
          'Deel acknowledged deletion but the resource is still readable. Verify its state before retrying.'
        );
      }
      case 'list': {
        requireText(ctx.input.contractId, 'contractId');
        validateLimit(ctx.input.limit, Number.MAX_SAFE_INTEGER);
        validateOffset(ctx.input.offset);
        let result = await client.listTimesheets(ctx.input.contractId!, {
          limit: ctx.input.limit,
          offset: ctx.input.offset
        });
        let timesheets = dataList(result, 'timesheets');
        let page = responsePage(result);
        return {
          output: { timesheets, page },
          message: `Found ${timesheets.length} timesheet(s) for contract **${ctx.input.contractId}**.`
        };
      }

      case 'create': {
        requireText(ctx.input.contractId, 'contractId');
        requireDate(ctx.input.dateSubmitted, 'dateSubmitted');
        requireNumber(ctx.input.quantity, 'quantity', 0.01);

        let data: Record<string, unknown> = {
          contract_id: ctx.input.contractId,
          quantity: ctx.input.quantity,
          date_submitted: ctx.input.dateSubmitted,
          description: ctx.input.description ?? '',
          is_auto_approved: false
        };
        if (ctx.input.description) data.description = ctx.input.description;

        let result = await client.createTimesheet(data);
        let timesheet = acknowledgedData(result, 'timesheet action');
        return {
          output: { timesheet },
          message: `Created timesheet entry for contract **${ctx.input.contractId}** on ${ctx.input.dateSubmitted}.`
        };
      }

      case 'review': {
        let timesheetId = requireText(ctx.input.timesheetId, 'timesheetId');
        let status = requireText(ctx.input.reviewStatus, 'reviewStatus');

        let reviewData: { status: string; reason?: string } = {
          status
        };
        if (ctx.input.reviewReason) reviewData.reason = ctx.input.reviewReason;

        let result = await client.reviewTimesheet(timesheetId, reviewData);
        let timesheet = acknowledgedData(result, 'timesheet action');
        return {
          output: { timesheet },
          message: `Timesheet **${ctx.input.timesheetId}** has been **${ctx.input.reviewStatus}**.`
        };
      }
    }
  })
  .build();
