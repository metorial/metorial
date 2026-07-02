import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient, gitLabServiceError, resolveProjectId } from '../lib/helpers';
import { spec } from '../spec';

let scheduleSchema = z.object({
  scheduleId: z.number(),
  description: z.string(),
  ref: z.string(),
  cron: z.string(),
  cronTimezone: z.string().optional(),
  active: z.boolean(),
  nextRunAt: z.string().optional().nullable(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  ownerName: z.string().optional(),
  variables: z
    .array(
      z.object({
        key: z.string(),
        value: z.string(),
        variableType: z.string().optional()
      })
    )
    .optional()
});

export let manageSchedules = SlateTool.create(spec, {
  name: 'Manage Pipeline Schedules',
  key: 'manage_schedules',
  description: `Create, list, update, or delete scheduled pipelines that run at recurring intervals using cron syntax. Schedule variables can be added, updated, or removed as part of schedule management.`,
  instructions: [
    'Use action "list" to see all pipeline schedules.',
    'Use action "get" to fetch schedule details including variables.',
    'Use action "create" to create a new schedule with cron expression.',
    'Use action "update" to modify schedule settings.',
    'Use action "delete" to remove a schedule.',
    'Cron format: "minute hour day_of_month month day_of_week" (e.g. "0 1 * * *" for daily at 1 AM).'
  ]
})
  .input(
    z.object({
      projectId: z
        .string()
        .optional()
        .describe('Project ID or URL-encoded path. Falls back to config default.'),
      action: z
        .enum(['list', 'get', 'create', 'update', 'delete'])
        .describe('Action to perform'),
      scheduleId: z
        .number()
        .optional()
        .describe('Schedule ID (required for get, update, delete)'),
      description: z
        .string()
        .optional()
        .describe('Schedule description (required for create)'),
      ref: z
        .string()
        .optional()
        .describe('Branch or tag to run scheduled pipeline on (required for create)'),
      cron: z
        .string()
        .optional()
        .describe('Cron expression (required for create, e.g. "0 1 * * *")'),
      cronTimezone: z
        .string()
        .optional()
        .describe('Timezone (e.g. "UTC", "America/New_York")'),
      active: z.boolean().optional().describe('Whether the schedule is active'),
      variables: z
        .array(
          z.object({
            action: z
              .enum(['create', 'update', 'delete'])
              .describe('Action for this variable'),
            key: z.string().describe('Variable key'),
            value: z.string().optional().describe('Variable value (for create/update)'),
            variableType: z.enum(['env_var', 'file']).optional().describe('Variable type')
          })
        )
        .optional()
        .describe('Variable operations to perform on the schedule')
    })
  )
  .output(
    z.object({
      schedules: z.array(scheduleSchema).optional(),
      schedule: scheduleSchema.optional(),
      deleted: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth, ctx.config);
    let projectId = resolveProjectId(ctx.input.projectId, ctx.config.projectId);
    let { action, scheduleId } = ctx.input;

    let mapSchedule = (s: any) => ({
      scheduleId: s.id,
      description: s.description,
      ref: s.ref,
      cron: s.cron,
      cronTimezone: s.cron_timezone,
      active: s.active,
      nextRunAt: s.next_run_at,
      createdAt: s.created_at,
      updatedAt: s.updated_at,
      ownerName: s.owner?.name || s.owner?.username,
      variables: s.variables?.map((v: any) => ({
        key: v.key,
        value: v.value,
        variableType: v.variable_type
      }))
    });

    if (action === 'list') {
      let result = (await client.listPipelineSchedules(projectId)) as any[];
      let schedules = result.map(mapSchedule);
      return {
        output: { schedules },
        message: `Found **${schedules.length}** pipeline schedule(s).`
      };
    }

    if (action === 'get') {
      if (!scheduleId) throw gitLabServiceError('scheduleId is required for get action');
      let s = await client.getPipelineSchedule(projectId, scheduleId);
      return {
        output: { schedule: mapSchedule(s) },
        message: `Schedule **"${(s as any).description}"** — cron: \`${(s as any).cron}\`, active: ${(s as any).active}.`
      };
    }

    if (action === 'create') {
      if (!ctx.input.description || !ctx.input.ref || !ctx.input.cron) {
        throw gitLabServiceError('description, ref, and cron are required for create action');
      }
      let s = await client.createPipelineSchedule(projectId, {
        description: ctx.input.description,
        ref: ctx.input.ref,
        cron: ctx.input.cron,
        cron_timezone: ctx.input.cronTimezone,
        active: ctx.input.active
      });
      let sid = (s as any).id;

      // Handle variable operations
      if (ctx.input.variables) {
        for (let v of ctx.input.variables) {
          if (v.action === 'create' && v.value !== undefined) {
            await client.createPipelineScheduleVariable(
              projectId,
              sid,
              v.key,
              v.value,
              v.variableType
            );
          }
        }
        s = await client.getPipelineSchedule(projectId, sid);
      }

      return {
        output: { schedule: mapSchedule(s) },
        message: `Created pipeline schedule **"${(s as any).description}"** with cron \`${(s as any).cron}\`.`
      };
    }

    if (action === 'update') {
      if (!scheduleId) throw gitLabServiceError('scheduleId is required for update action');
      let data: any = {};
      if (ctx.input.description !== undefined) data.description = ctx.input.description;
      if (ctx.input.ref !== undefined) data.ref = ctx.input.ref;
      if (ctx.input.cron !== undefined) data.cron = ctx.input.cron;
      if (ctx.input.cronTimezone !== undefined) data.cron_timezone = ctx.input.cronTimezone;
      if (ctx.input.active !== undefined) data.active = ctx.input.active;

      if (Object.keys(data).length > 0) {
        await client.updatePipelineSchedule(projectId, scheduleId, data);
      }

      // Handle variable operations
      if (ctx.input.variables) {
        for (let v of ctx.input.variables) {
          if (v.action === 'create' && v.value !== undefined) {
            await client.createPipelineScheduleVariable(
              projectId,
              scheduleId,
              v.key,
              v.value,
              v.variableType
            );
          } else if (v.action === 'update' && v.value !== undefined) {
            await client.updatePipelineScheduleVariable(
              projectId,
              scheduleId,
              v.key,
              v.value,
              v.variableType
            );
          } else if (v.action === 'delete') {
            await client.deletePipelineScheduleVariable(projectId, scheduleId, v.key);
          }
        }
      }

      let s = await client.getPipelineSchedule(projectId, scheduleId);
      return {
        output: { schedule: mapSchedule(s) },
        message: `Updated pipeline schedule **#${scheduleId}**.`
      };
    }

    // delete
    if (!scheduleId) throw gitLabServiceError('scheduleId is required for delete action');
    await client.deletePipelineSchedule(projectId, scheduleId);
    return {
      output: { deleted: true },
      message: `Deleted pipeline schedule **#${scheduleId}**.`
    };
  })
  .build();
