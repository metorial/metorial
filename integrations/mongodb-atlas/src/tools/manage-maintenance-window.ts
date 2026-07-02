import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { failValidation, invalidAction, resolveProjectId } from '../lib/validation';
import { spec } from '../spec';

let protectedHoursSchema = z.object({
  startHourOfDay: z
    .number()
    .optional()
    .describe('Start hour, 0 through 23, when maintenance must not begin.'),
  endHourOfDay: z
    .number()
    .optional()
    .describe('End hour, 0 through 23, when maintenance must not begin.')
});

export let manageMaintenanceWindowTool = SlateTool.create(spec, {
  name: 'Manage Maintenance Window',
  key: 'manage_maintenance_window',
  description: `Get, update, reset, or defer the MongoDB Atlas maintenance window for a project. Use this to control when Atlas applies scheduled maintenance and to defer the next maintenance window when allowed.`,
  instructions: [
    'For update, dayOfWeek is required and must be 1 for Sunday through 7 for Saturday.',
    'hourOfDay uses 0 through 23 in the project maintenance timezone.',
    'Use reset to clear the configured maintenance window, and defer only when Atlas reports maintenance can be deferred.'
  ]
})
  .input(
    z.object({
      projectId: z
        .string()
        .optional()
        .describe('Atlas Project ID. Uses config projectId if not provided.'),
      action: z.enum(['get', 'update', 'reset', 'defer']).describe('Action to perform'),
      dayOfWeek: z
        .number()
        .optional()
        .describe('One-based day of week for update: 1 Sunday through 7 Saturday.'),
      hourOfDay: z
        .number()
        .optional()
        .describe('Zero-based start hour for update: 0 through 23.'),
      autoDeferOnceEnabled: z
        .boolean()
        .optional()
        .describe('Whether Atlas should auto-defer maintenance once after enabling it.'),
      protectedHours: protectedHoursSchema
        .optional()
        .describe('Hours during which maintenance should not begin.'),
      startASAP: z
        .boolean()
        .optional()
        .describe('Whether maintenance should start as soon as possible.'),
      waveAssignment: z.number().optional().describe('Maintenance wave assignment.')
    })
  )
  .output(
    z.object({
      maintenanceWindow: z.any().optional(),
      updated: z.boolean().optional(),
      reset: z.boolean().optional(),
      deferred: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth);
    let projectId = resolveProjectId(ctx.input.projectId, ctx.config.projectId);
    let { action } = ctx.input;

    if (action === 'get') {
      let maintenanceWindow = await client.getMaintenanceWindow(projectId);
      return {
        output: { maintenanceWindow },
        message: 'Retrieved the project maintenance window.'
      };
    }

    if (action === 'update') {
      let dayOfWeek = ctx.input.dayOfWeek;
      if (dayOfWeek === undefined || dayOfWeek < 1 || dayOfWeek > 7) {
        failValidation('dayOfWeek is required for update and must be between 1 and 7.');
      }
      if (
        ctx.input.hourOfDay !== undefined &&
        (ctx.input.hourOfDay < 0 || ctx.input.hourOfDay > 23)
      ) {
        failValidation('hourOfDay must be between 0 and 23.');
      }

      let data: any = {
        dayOfWeek
      };
      if (ctx.input.hourOfDay !== undefined) data.hourOfDay = ctx.input.hourOfDay;
      if (ctx.input.autoDeferOnceEnabled !== undefined) {
        data.autoDeferOnceEnabled = ctx.input.autoDeferOnceEnabled;
      }
      if (ctx.input.protectedHours) data.protectedHours = ctx.input.protectedHours;
      if (ctx.input.startASAP !== undefined) data.startASAP = ctx.input.startASAP;
      if (ctx.input.waveAssignment !== undefined)
        data.waveAssignment = ctx.input.waveAssignment;

      let maintenanceWindow = await client.updateMaintenanceWindow(projectId, data);
      return {
        output: { maintenanceWindow, updated: true },
        message: 'Updated the project maintenance window.'
      };
    }

    if (action === 'reset') {
      await client.resetMaintenanceWindow(projectId);
      return {
        output: { reset: true },
        message: 'Reset the project maintenance window.'
      };
    }

    if (action === 'defer') {
      await client.deferMaintenanceWindow(projectId);
      return {
        output: { deferred: true },
        message: 'Deferred the next project maintenance window.'
      };
    }

    return invalidAction(action);
  })
  .build();
