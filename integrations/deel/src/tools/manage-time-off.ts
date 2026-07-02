import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/utils';
import { spec } from '../spec';

export let manageTimeOff = SlateTool.create(spec, {
  name: 'Manage Time Off',
  key: 'manage_time_off',
  description: `Create, list, update, or delete time-off requests for workers. Use action "list" to see requests for a profile, "create" to submit a new request, "update" to modify, or "delete" to cancel a request.`,
  instructions: [
    'For "list": provide the profileId of the worker.',
    'For "create": provide the required time-off details such as start/end dates and type.',
    'For "update": provide the timeOffId and the fields to update.',
    'For "delete": provide the timeOffId to cancel the request.'
  ]
})
  .input(
    z.object({
      action: z.enum(['list', 'create', 'update', 'delete']).describe('Action to perform'),
      profileId: z
        .string()
        .optional()
        .describe('Worker HRIS profile ID (required for "list")'),
      timeOffId: z
        .string()
        .optional()
        .describe('Time-off request ID (required for "update" and "delete")'),
      contractId: z.string().optional().describe('For "create": the contract ID'),
      startDate: z
        .string()
        .optional()
        .describe('For "create"/"update": start date (YYYY-MM-DD)'),
      endDate: z.string().optional().describe('For "create"/"update": end date (YYYY-MM-DD)'),
      type: z
        .string()
        .optional()
        .describe('For "create": time-off type (e.g. "vacation", "sick_leave")'),
      reason: z.string().optional().describe('For "create"/"update": reason for the time-off'),
      halfDay: z
        .boolean()
        .optional()
        .describe('For "create"/"update": whether this is a half-day request')
    })
  )
  .output(
    z.object({
      timeOffs: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('List of time-off requests (for "list")'),
      timeOff: z
        .record(z.string(), z.any())
        .optional()
        .describe('Created, updated, or deleted time-off request')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    switch (ctx.input.action) {
      case 'list': {
        if (!ctx.input.profileId)
          throw new Error('profileId is required for listing time-off requests');
        let result = await client.listTimeOffs(ctx.input.profileId);
        let timeOffs = result?.data ?? [];
        return {
          output: { timeOffs },
          message: `Found ${timeOffs.length} time-off request(s) for profile **${ctx.input.profileId}**.`
        };
      }

      case 'create': {
        let data: Record<string, any> = {};
        if (ctx.input.contractId) data.contract_id = ctx.input.contractId;
        if (ctx.input.startDate) data.start_date = ctx.input.startDate;
        if (ctx.input.endDate) data.end_date = ctx.input.endDate;
        if (ctx.input.type) data.type = ctx.input.type;
        if (ctx.input.reason) data.reason = ctx.input.reason;
        if (ctx.input.halfDay !== undefined) data.half_day = ctx.input.halfDay;

        let result = await client.createTimeOff(data);
        let timeOff = result?.data ?? result;
        return {
          output: { timeOff },
          message: `Created time-off request from **${ctx.input.startDate}** to **${ctx.input.endDate}**.`
        };
      }

      case 'update': {
        if (!ctx.input.timeOffId)
          throw new Error('timeOffId is required for updating a time-off request');

        let data: Record<string, any> = {};
        if (ctx.input.startDate) data.start_date = ctx.input.startDate;
        if (ctx.input.endDate) data.end_date = ctx.input.endDate;
        if (ctx.input.reason) data.reason = ctx.input.reason;
        if (ctx.input.halfDay !== undefined) data.half_day = ctx.input.halfDay;

        let result = await client.updateTimeOff(ctx.input.timeOffId, data);
        let timeOff = result?.data ?? result;
        return {
          output: { timeOff },
          message: `Updated time-off request **${ctx.input.timeOffId}**.`
        };
      }

      case 'delete': {
        if (!ctx.input.timeOffId)
          throw new Error('timeOffId is required for deleting a time-off request');

        let result = await client.deleteTimeOff(ctx.input.timeOffId);
        let timeOff = result?.data ?? result;
        return {
          output: { timeOff },
          message: `Deleted time-off request **${ctx.input.timeOffId}**.`
        };
      }
    }
  })
  .build();
