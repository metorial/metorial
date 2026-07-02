import { SlateTool } from 'slates';
import { z } from 'zod';
import { SensiboClient } from '../lib/client';
import { spec } from '../spec';

let scheduleAcStateSchema = z.object({
  on: z.boolean().optional(),
  mode: z.enum(['cool', 'heat', 'fan', 'dry', 'auto']).optional(),
  targetTemperature: z.number().optional(),
  temperatureUnit: z.enum(['C', 'F']).optional(),
  fanLevel: z.string().optional(),
  swing: z.string().optional()
});

let scheduleOutputSchema = z.object({
  scheduleId: z.string().describe('Unique ID of the schedule'),
  isEnabled: z.boolean().describe('Whether the schedule is enabled'),
  recurOnDaysOfWeek: z
    .array(z.string())
    .optional()
    .describe('Days of week the schedule recurs on'),
  timeOfDay: z.string().optional().describe('Time of day for the schedule (HH:MM)'),
  acState: scheduleAcStateSchema
    .optional()
    .describe('AC state to apply when the schedule fires')
});

export let manageScheduleTool = SlateTool.create(spec, {
  name: 'Manage Schedule',
  key: 'manage_schedule',
  description: `Create, list, update, or delete recurring schedules for a Sensibo device. Schedules apply an AC state at a specific time on selected days of the week.`,
  instructions: [
    'Use action "list" to see all schedules, "create" to add a new one, "update" to modify, or "delete" to remove.',
    'Days of week use full names: Sunday, Monday, Tuesday, Wednesday, Thursday, Friday, Saturday.',
    'Time must be in HH:MM format (24-hour).'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      deviceId: z.string().describe('The unique ID of the Sensibo device'),
      action: z.enum(['list', 'create', 'update', 'delete']).describe('Action to perform'),
      scheduleId: z
        .string()
        .optional()
        .describe('Schedule ID (required for update and delete)'),
      isEnabled: z
        .boolean()
        .optional()
        .describe('Whether the schedule is enabled (for create/update)'),
      recurOnDaysOfWeek: z
        .array(z.string())
        .optional()
        .describe('Days of week (e.g. ["Monday", "Wednesday", "Friday"])'),
      timeOfDay: z.string().optional().describe('Time of day in HH:MM format (24-hour)'),
      acState: scheduleAcStateSchema
        .optional()
        .describe('AC state to apply when the schedule fires')
    })
  )
  .output(
    z.object({
      deviceId: z.string().describe('The device the schedule(s) belong to'),
      schedules: z
        .array(scheduleOutputSchema)
        .optional()
        .describe('List of schedules (for list action)'),
      schedule: scheduleOutputSchema.optional().describe('The created/updated schedule'),
      deleted: z.boolean().optional().describe('Whether the schedule was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SensiboClient(ctx.auth.token);
    let { deviceId, action } = ctx.input;

    if (action === 'list') {
      let schedules = await client.listSchedules(deviceId);
      let mapped = (schedules || []).map((s: any) => ({
        scheduleId: s.id,
        isEnabled: s.isEnabled,
        recurOnDaysOfWeek: s.recurOnDaysOfWeek,
        timeOfDay: s.timeOfDay,
        acState: s.acState
          ? {
              on: s.acState.on,
              mode: s.acState.mode,
              targetTemperature: s.acState.targetTemperature,
              temperatureUnit: s.acState.temperatureUnit,
              fanLevel: s.acState.fanLevel,
              swing: s.acState.swing
            }
          : undefined
      }));

      return {
        output: { deviceId, schedules: mapped },
        message: `Found **${mapped.length}** schedule(s) for device **${deviceId}**.`
      };
    }

    if (action === 'delete') {
      await client.deleteSchedule(deviceId, ctx.input.scheduleId!);
      return {
        output: { deviceId, deleted: true },
        message: `Deleted schedule **${ctx.input.scheduleId}** from device **${deviceId}**.`
      };
    }

    if (action === 'create') {
      let scheduleData: Record<string, any> = {
        isEnabled: ctx.input.isEnabled ?? true,
        recurOnDaysOfWeek: ctx.input.recurOnDaysOfWeek,
        timeOfDay: ctx.input.timeOfDay,
        acState: ctx.input.acState
      };
      let result = await client.createSchedule(deviceId, scheduleData);
      return {
        output: {
          deviceId,
          schedule: {
            scheduleId: result.id,
            isEnabled: result.isEnabled,
            recurOnDaysOfWeek: result.recurOnDaysOfWeek,
            timeOfDay: result.timeOfDay,
            acState: result.acState
          }
        },
        message: `Created schedule **${result.id}** on device **${deviceId}** for ${ctx.input.recurOnDaysOfWeek?.join(', ')} at ${ctx.input.timeOfDay}.`
      };
    }

    // action === 'update'
    let updateData: Record<string, any> = {};
    if (ctx.input.isEnabled !== undefined) updateData.isEnabled = ctx.input.isEnabled;
    if (ctx.input.recurOnDaysOfWeek)
      updateData.recurOnDaysOfWeek = ctx.input.recurOnDaysOfWeek;
    if (ctx.input.timeOfDay) updateData.timeOfDay = ctx.input.timeOfDay;
    if (ctx.input.acState) updateData.acState = ctx.input.acState;

    let result = await client.updateSchedule(deviceId, ctx.input.scheduleId!, updateData);
    return {
      output: {
        deviceId,
        schedule: {
          scheduleId: result.id || ctx.input.scheduleId!,
          isEnabled: result.isEnabled,
          recurOnDaysOfWeek: result.recurOnDaysOfWeek,
          timeOfDay: result.timeOfDay,
          acState: result.acState
        }
      },
      message: `Updated schedule **${ctx.input.scheduleId}** on device **${deviceId}**.`
    };
  })
  .build();
