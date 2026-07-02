import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let manageMonitorTool = SlateTool.create(spec, {
  name: 'Manage Cron Monitor',
  key: 'manage_monitor',
  description: `List, create, update, or delete cron monitors for tracking scheduled jobs. Monitors detect missed or failed check-ins and can alert when jobs don't run on schedule.`,
  instructions: [
    'Schedule config requires a "schedule_type" of either "crontab" or "interval"',
    'For crontab: provide "schedule" as a cron expression (e.g. "0 * * * *")',
    'For interval: provide "schedule" as [value, unit] (e.g. [1, "hour"])',
    'Config also accepts "checkin_margin" and "max_runtime" in minutes'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'create', 'update', 'delete'])
        .describe('Action to perform'),
      monitorSlug: z
        .string()
        .optional()
        .describe('Monitor slug (required for get/update/delete)'),
      projectSlug: z
        .string()
        .optional()
        .describe('Project slug (required for create, optional filter for list)'),
      name: z.string().optional().describe('Monitor name (required for create)'),
      slug: z.string().optional().describe('Custom slug for the monitor'),
      monitorConfig: z
        .object({
          scheduleType: z.enum(['crontab', 'interval']).optional().describe('Schedule type'),
          schedule: z
            .any()
            .optional()
            .describe('Cron expression string or [value, unit] array'),
          checkinMargin: z.number().optional().describe('Margin in minutes for check-in'),
          maxRuntime: z.number().optional().describe('Maximum runtime in minutes'),
          timezone: z.string().optional().describe('Timezone for the schedule')
        })
        .optional()
        .describe('Monitor schedule configuration'),
      cursor: z.string().optional().describe('Pagination cursor')
    })
  )
  .output(
    z.object({
      monitor: z.any().optional().describe('Monitor data'),
      monitors: z.array(z.any()).optional().describe('List of monitors'),
      deleted: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    if (ctx.input.action === 'list') {
      let monitors = await client.listMonitors({
        cursor: ctx.input.cursor,
        project: ctx.input.projectSlug
      });

      return {
        output: { monitors },
        message: `Found **${(monitors || []).length}** cron monitors.`
      };
    }

    if (ctx.input.action === 'get') {
      if (!ctx.input.monitorSlug) throw new Error('monitorSlug is required');
      let monitor = await client.getMonitor(ctx.input.monitorSlug);

      return {
        output: { monitor },
        message: `Retrieved monitor **${monitor.name || ctx.input.monitorSlug}**.`
      };
    }

    if (ctx.input.action === 'create') {
      if (!ctx.input.name) throw new Error('name is required');
      if (!ctx.input.projectSlug) throw new Error('projectSlug is required');
      if (!ctx.input.monitorConfig) throw new Error('monitorConfig is required');

      let config: Record<string, any> = {};
      if (ctx.input.monitorConfig.scheduleType)
        config.schedule_type = ctx.input.monitorConfig.scheduleType;
      if (ctx.input.monitorConfig.schedule) config.schedule = ctx.input.monitorConfig.schedule;
      if (ctx.input.monitorConfig.checkinMargin)
        config.checkin_margin = ctx.input.monitorConfig.checkinMargin;
      if (ctx.input.monitorConfig.maxRuntime)
        config.max_runtime = ctx.input.monitorConfig.maxRuntime;
      if (ctx.input.monitorConfig.timezone) config.timezone = ctx.input.monitorConfig.timezone;

      let monitor = await client.createMonitor({
        name: ctx.input.name,
        slug: ctx.input.slug,
        project: ctx.input.projectSlug,
        type: 'cron_job',
        config
      });

      return {
        output: { monitor },
        message: `Created cron monitor **${monitor.name}**.`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.monitorSlug) throw new Error('monitorSlug is required');

      let updateData: Record<string, any> = {};
      if (ctx.input.name) updateData.name = ctx.input.name;
      if (ctx.input.slug) updateData.slug = ctx.input.slug;
      if (ctx.input.monitorConfig) {
        let config: Record<string, any> = {};
        if (ctx.input.monitorConfig.scheduleType)
          config.schedule_type = ctx.input.monitorConfig.scheduleType;
        if (ctx.input.monitorConfig.schedule)
          config.schedule = ctx.input.monitorConfig.schedule;
        if (ctx.input.monitorConfig.checkinMargin)
          config.checkin_margin = ctx.input.monitorConfig.checkinMargin;
        if (ctx.input.monitorConfig.maxRuntime)
          config.max_runtime = ctx.input.monitorConfig.maxRuntime;
        if (ctx.input.monitorConfig.timezone)
          config.timezone = ctx.input.monitorConfig.timezone;
        updateData.config = config;
      }

      let monitor = await client.updateMonitor(ctx.input.monitorSlug, updateData);

      return {
        output: { monitor },
        message: `Updated cron monitor **${monitor.name || ctx.input.monitorSlug}**.`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.monitorSlug) throw new Error('monitorSlug is required');
      await client.deleteMonitor(ctx.input.monitorSlug);

      return {
        output: { deleted: true },
        message: `Deleted cron monitor **${ctx.input.monitorSlug}**.`
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();
