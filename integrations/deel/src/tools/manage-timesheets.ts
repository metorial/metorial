import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/utils';
import { spec } from '../spec';

export let manageTimesheets = SlateTool.create(spec, {
  name: 'Manage Timesheets',
  key: 'manage_timesheets',
  description: `Create, list, or review contractor timesheets. Use action "list" to retrieve timesheets for a contract, "create" to submit a new timesheet entry, or "review" to approve or decline a timesheet.`,
  instructions: [
    'For "list": provide contractId.',
    'For "create": provide contractId, quantity, dateSubmitted, and optionally a description.',
    'For "review": provide timesheetId and reviewStatus ("approved" or "declined"), with an optional reason.'
  ]
})
  .input(
    z.object({
      action: z.enum(['list', 'create', 'review']).describe('Action to perform'),
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
      timesheetId: z
        .string()
        .optional()
        .describe('For "review": ID of the timesheet to review'),
      reviewStatus: z
        .enum(['approved', 'declined'])
        .optional()
        .describe('For "review": approval decision'),
      reviewReason: z.string().optional().describe('For "review": reason for the decision')
    })
  )
  .output(
    z.object({
      timesheets: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('List of timesheets (for "list" action)'),
      timesheet: z
        .record(z.string(), z.any())
        .optional()
        .describe('Created or reviewed timesheet')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    switch (ctx.input.action) {
      case 'list': {
        if (!ctx.input.contractId)
          throw new Error('contractId is required for listing timesheets');
        let result = await client.listTimesheets(ctx.input.contractId);
        let timesheets = result?.data ?? [];
        return {
          output: { timesheets },
          message: `Found ${timesheets.length} timesheet(s) for contract **${ctx.input.contractId}**.`
        };
      }

      case 'create': {
        if (!ctx.input.contractId)
          throw new Error('contractId is required for creating a timesheet');
        if (!ctx.input.dateSubmitted)
          throw new Error('dateSubmitted is required for creating a timesheet');

        let data: Record<string, any> = {
          contract_id: ctx.input.contractId,
          quantity: ctx.input.quantity ?? 1,
          date_submitted: ctx.input.dateSubmitted
        };
        if (ctx.input.description) data.description = ctx.input.description;

        let result = await client.createTimesheet(data);
        let timesheet = result?.data ?? result;
        return {
          output: { timesheet },
          message: `Created timesheet entry for contract **${ctx.input.contractId}** on ${ctx.input.dateSubmitted}.`
        };
      }

      case 'review': {
        if (!ctx.input.timesheetId)
          throw new Error('timesheetId is required for reviewing a timesheet');
        if (!ctx.input.reviewStatus)
          throw new Error('reviewStatus is required for reviewing a timesheet');

        let reviewData: { status: string; reason?: string } = {
          status: ctx.input.reviewStatus
        };
        if (ctx.input.reviewReason) reviewData.reason = ctx.input.reviewReason;

        let result = await client.reviewTimesheet(ctx.input.timesheetId, reviewData);
        let timesheet = result?.data ?? result;
        return {
          output: { timesheet },
          message: `Timesheet **${ctx.input.timesheetId}** has been **${ctx.input.reviewStatus}**.`
        };
      }
    }
  })
  .build();
