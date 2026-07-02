import { SlateTool } from 'slates';
import { z } from 'zod';
import { GraphClient } from '../lib/client';
import { spec } from '../spec';

export let manageShifts = SlateTool.create(spec, {
  name: 'Manage Shifts',
  key: 'manage_shifts',
  description: `Manage workforce shifts for a Microsoft Team. Can view the team's schedule, list existing shifts, create new shifts, or delete shifts. Useful for frontline worker scheduling.`,
  instructions: [
    'Use action "get_schedule" to view the team\'s overall schedule configuration.',
    'Use action "list" to see all shifts.',
    'Use action "create" to add a new shift with start/end times and assigned user.'
  ]
})
  .input(
    z.object({
      teamId: z.string().describe('ID of the team'),
      action: z
        .enum(['get_schedule', 'list', 'create', 'delete'])
        .describe('Action to perform'),
      shiftId: z.string().optional().describe('Shift ID (required for delete)'),
      userId: z.string().optional().describe('User ID to assign the shift to (for create)'),
      startDateTime: z
        .string()
        .optional()
        .describe('Shift start time in ISO 8601 format (for create)'),
      endDateTime: z
        .string()
        .optional()
        .describe('Shift end time in ISO 8601 format (for create)'),
      displayName: z
        .string()
        .optional()
        .describe('Label/name for the shift activity (for create)'),
      theme: z.string().optional().describe('Color theme for the shift display (for create)')
    })
  )
  .output(
    z.object({
      schedule: z.any().optional().describe('Schedule configuration (for get_schedule)'),
      shifts: z
        .array(
          z.object({
            shiftId: z.string().describe('Shift ID'),
            userId: z.string().optional().describe('Assigned user ID'),
            startDateTime: z.string().optional().describe('Shift start time'),
            endDateTime: z.string().optional().describe('Shift end time'),
            displayName: z.string().optional().describe('Shift activity label'),
            theme: z.string().optional().describe('Shift color theme')
          })
        )
        .optional()
        .describe('List of shifts'),
      success: z.boolean().describe('Whether the operation succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GraphClient({ token: ctx.auth.token });

    if (ctx.input.action === 'get_schedule') {
      let schedule = await client.getSchedule(ctx.input.teamId);
      return {
        output: { schedule, success: true },
        message: `Retrieved schedule for team.`
      };
    }

    if (ctx.input.action === 'list') {
      let shifts = await client.listShifts(ctx.input.teamId);
      let mapped = shifts.map((s: any) => ({
        shiftId: s.id,
        userId: s.userId,
        startDateTime: s.sharedShift?.startDateTime,
        endDateTime: s.sharedShift?.endDateTime,
        displayName: s.sharedShift?.displayName,
        theme: s.sharedShift?.theme
      }));
      return {
        output: { shifts: mapped, success: true },
        message: `Found **${mapped.length}** shifts.`
      };
    }

    if (ctx.input.action === 'create') {
      let body: any = {
        userId: ctx.input.userId,
        sharedShift: {
          startDateTime: ctx.input.startDateTime,
          endDateTime: ctx.input.endDateTime,
          displayName: ctx.input.displayName || '',
          theme: ctx.input.theme || 'blue'
        }
      };
      let shift = await client.createShift(ctx.input.teamId, body);
      return {
        output: {
          shifts: [
            {
              shiftId: shift.id,
              userId: shift.userId,
              startDateTime: shift.sharedShift?.startDateTime,
              endDateTime: shift.sharedShift?.endDateTime,
              displayName: shift.sharedShift?.displayName,
              theme: shift.sharedShift?.theme
            }
          ],
          success: true
        },
        message: `Shift created successfully.`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.shiftId) throw new Error('shiftId is required for delete');
      await client.deleteShift(ctx.input.teamId, ctx.input.shiftId);
      return {
        output: { success: true },
        message: `Shift deleted successfully.`
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();
