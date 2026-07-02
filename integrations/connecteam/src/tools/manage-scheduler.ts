import { SlateTool } from 'slates';
import { z } from 'zod';
import { ConnecteamClient } from '../lib/client';
import { spec } from '../spec';

export let manageScheduler = SlateTool.create(spec, {
  name: 'Manage Scheduler',
  key: 'manage_scheduler',
  description: `Manage employee shift scheduling: list schedulers, retrieve/create/update/delete shifts, view shift custom fields and layers, and manage unavailabilities. Use this for all shift scheduling operations.`,
  constraints: [
    'Max 500 shifts per create request',
    'Shift duration cannot exceed 24 hours',
    'Published non-open shifts require at least 1 assigned user',
    'startTime and endTime must be Unix timestamps in seconds'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z
        .enum([
          'list_schedulers',
          'get_shifts',
          'get_shift',
          'create_shifts',
          'update_shifts',
          'delete_shift',
          'get_custom_fields',
          'get_shift_layers',
          'get_unavailabilities',
          'create_unavailability',
          'delete_unavailability'
        ])
        .describe('Scheduler action to perform'),
      schedulerId: z.number().optional().describe('Scheduler ID (required for most actions)'),
      shiftId: z.string().optional().describe('Shift ID (for get_shift, delete_shift)'),
      unavailabilityId: z
        .string()
        .optional()
        .describe('Unavailability ID (for delete_unavailability)'),
      startTime: z
        .number()
        .optional()
        .describe(
          'Start time as Unix timestamp in seconds (for get_shifts, get_unavailabilities)'
        ),
      endTime: z
        .number()
        .optional()
        .describe(
          'End time as Unix timestamp in seconds (for get_shifts, get_unavailabilities)'
        ),
      shifts: z
        .array(z.any())
        .optional()
        .describe('Array of shift objects for create_shifts or update_shifts'),
      unavailabilityBody: z
        .any()
        .optional()
        .describe('Unavailability data for create_unavailability'),
      notifyUsers: z.boolean().optional().describe('Whether to notify users of shift changes'),
      isOpenShift: z.boolean().optional().describe('Filter for open shifts'),
      isPublished: z.boolean().optional().describe('Filter for published shifts'),
      assignedUserIds: z
        .array(z.number())
        .optional()
        .describe('Filter shifts by assigned user IDs'),
      jobId: z.array(z.string()).optional().describe('Filter shifts by job IDs'),
      title: z.string().optional().describe('Filter shifts by title (partial match)'),
      sort: z.enum(['created_at', 'updated_at']).optional().describe('Sort field'),
      order: z.enum(['asc', 'desc']).optional().describe('Sort order'),
      limit: z.number().optional().describe('Results per page'),
      offset: z.number().optional().describe('Pagination offset')
    })
  )
  .output(
    z.object({
      result: z.any().describe('API response data')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ConnecteamClient({
      baseUrl: ctx.config.baseUrl,
      token: ctx.auth.token
    });

    let { action, schedulerId } = ctx.input;

    if (action === 'list_schedulers') {
      let result = await client.getSchedulers();
      return {
        output: { result },
        message: `Retrieved schedulers.`
      };
    }

    if (!schedulerId) throw new Error('schedulerId is required for this action.');

    if (action === 'get_shifts') {
      if (!ctx.input.startTime || !ctx.input.endTime) {
        throw new Error('startTime and endTime are required for get_shifts.');
      }
      let result = await client.getShifts(schedulerId, {
        startTime: ctx.input.startTime,
        endTime: ctx.input.endTime,
        isOpenShift: ctx.input.isOpenShift,
        isPublished: ctx.input.isPublished,
        assignedUserIds: ctx.input.assignedUserIds,
        jobId: ctx.input.jobId,
        title: ctx.input.title,
        sort: ctx.input.sort,
        order: ctx.input.order,
        limit: ctx.input.limit,
        offset: ctx.input.offset
      });
      return {
        output: { result },
        message: `Retrieved shifts for scheduler **${schedulerId}**.`
      };
    }

    if (action === 'get_shift') {
      if (!ctx.input.shiftId) throw new Error('shiftId is required.');
      let result = await client.getShift(schedulerId, ctx.input.shiftId);
      return {
        output: { result },
        message: `Retrieved shift **${ctx.input.shiftId}**.`
      };
    }

    if (action === 'create_shifts') {
      if (!ctx.input.shifts) throw new Error('shifts array is required.');
      let result = await client.createShifts(
        schedulerId,
        ctx.input.shifts,
        ctx.input.notifyUsers
      );
      return {
        output: { result },
        message: `Created **${ctx.input.shifts.length}** shift(s) in scheduler **${schedulerId}**.`
      };
    }

    if (action === 'update_shifts') {
      if (!ctx.input.shifts) throw new Error('shifts array is required.');
      let result = await client.updateShifts(
        schedulerId,
        ctx.input.shifts,
        ctx.input.notifyUsers
      );
      return {
        output: { result },
        message: `Updated **${ctx.input.shifts.length}** shift(s) in scheduler **${schedulerId}**.`
      };
    }

    if (action === 'delete_shift') {
      if (!ctx.input.shiftId) throw new Error('shiftId is required.');
      let result = await client.deleteShift(
        schedulerId,
        ctx.input.shiftId,
        ctx.input.notifyUsers
      );
      return {
        output: { result },
        message: `Deleted shift **${ctx.input.shiftId}** from scheduler **${schedulerId}**.`
      };
    }

    if (action === 'get_custom_fields') {
      let result = await client.getShiftCustomFields(schedulerId, {
        limit: ctx.input.limit,
        offset: ctx.input.offset
      });
      return {
        output: { result },
        message: `Retrieved custom fields for scheduler **${schedulerId}**.`
      };
    }

    if (action === 'get_shift_layers') {
      let result = await client.getShiftLayers(schedulerId);
      return {
        output: { result },
        message: `Retrieved shift layers for scheduler **${schedulerId}**.`
      };
    }

    if (action === 'get_unavailabilities') {
      if (!ctx.input.startTime || !ctx.input.endTime) {
        throw new Error('startTime and endTime are required.');
      }
      let result = await client.getScheduleUnavailabilities(schedulerId, {
        startTime: ctx.input.startTime,
        endTime: ctx.input.endTime,
        limit: ctx.input.limit,
        offset: ctx.input.offset
      });
      return {
        output: { result },
        message: `Retrieved unavailabilities for scheduler **${schedulerId}**.`
      };
    }

    if (action === 'create_unavailability') {
      let result = await client.createUnavailability(
        schedulerId,
        ctx.input.unavailabilityBody
      );
      return {
        output: { result },
        message: `Created unavailability in scheduler **${schedulerId}**.`
      };
    }

    if (action === 'delete_unavailability') {
      if (!ctx.input.unavailabilityId) throw new Error('unavailabilityId is required.');
      let result = await client.deleteUnavailability(schedulerId, ctx.input.unavailabilityId);
      return {
        output: { result },
        message: `Deleted unavailability **${ctx.input.unavailabilityId}** from scheduler **${schedulerId}**.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
