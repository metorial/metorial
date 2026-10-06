import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/client';
import { nativeId, optionalText, reject, stringArray } from '../lib/contracts';
import { spec } from '../spec';

export let manageAutomation = SlateTool.create(spec, {
  name: 'Manage Automation',
  key: 'manage_automation',
  description: `Create, update, list, delete, or manually run automations. Automations perform file operations (create folders, copy, move, delete, import files, run sync) triggered by schedules, file events, webhooks, or manual invocation.`,
  instructions: [
    'The "automation" field specifies the type: create_folder, copy, move, delete, import, run_sync.',
    'The "trigger" field specifies when it runs: daily, custom_schedule, action, webhook.',
    'For schedule-based triggers, provide schedule_times_of_day in HH:MM format.',
    'The "path" field supports globs (e.g. "uploads/*.csv") except on remote mounts.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'create', 'update', 'delete', 'run'])
        .describe('Action to perform'),
      automationId: z
        .number()
        .optional()
        .describe('Automation ID (required for get, update, delete, run)'),
      automationType: z
        .enum(['create_folder', 'copy', 'move', 'delete', 'import', 'run_sync'])
        .optional()
        .describe('Type of automation (required for create)'),
      trigger: z
        .enum(['daily', 'custom_schedule', 'action', 'webhook'])
        .optional()
        .describe('Trigger type'),
      triggerActions: z
        .array(z.enum(['create', 'read', 'update', 'destroy', 'move', 'copy']))
        .optional()
        .describe('File actions that trigger automation (for "action" trigger type)'),
      name: z.string().optional().describe('Automation name'),
      description: z.string().optional().describe('Description'),
      path: z.string().optional().describe('Source path (supports globs)'),
      source: z.string().optional().describe('Source filter pattern'),
      destinations: z.array(z.string()).optional().describe('Destination paths'),
      interval: z
        .string()
        .optional()
        .describe('Schedule interval: day, week, month, quarter, year'),
      scheduleTimesOfDay: z
        .array(z.string())
        .optional()
        .describe('Times to run in HH:MM format'),
      scheduleDaysOfWeek: z
        .array(z.number())
        .optional()
        .describe('Days to run (0=Sunday through 6=Saturday)'),
      scheduleTimeZone: z.string().optional().describe('Timezone for schedule'),
      disabled: z.boolean().optional().describe('Disable the automation'),
      overwriteFiles: z
        .boolean()
        .optional()
        .describe('Overwrite existing files at destination'),
      excludePattern: z.string().optional().describe('Glob pattern for files to skip'),
      cursor: z.string().optional().describe('Pagination cursor (for list)'),
      perPage: z.number().optional().describe('Results per page (for list)')
    })
  )
  .output(
    z.object({
      automations: z
        .array(
          z.object({
            automationId: z.number().describe('Automation ID'),
            automationType: z.string().optional().describe('Automation type'),
            name: z.string().optional().describe('Name'),
            trigger: z.string().optional().describe('Trigger type'),
            path: z.string().optional().describe('Source path'),
            disabled: z.boolean().optional().describe('Whether disabled'),
            lastModifiedAt: z.string().optional().describe('Last modified timestamp')
          })
        )
        .optional()
        .describe('List of automations'),
      automation: z
        .object({
          automationId: z.number().describe('Automation ID'),
          automationType: z.string().optional().describe('Automation type'),
          name: z.string().optional().describe('Name'),
          description: z.string().optional().describe('Description'),
          trigger: z.string().optional().describe('Trigger type'),
          path: z.string().optional().describe('Source path'),
          destinations: z.array(z.string()).optional().describe('Destination paths'),
          disabled: z.boolean().optional().describe('Whether disabled'),
          scheduleDescription: z.string().optional().describe('Human-readable schedule')
        })
        .optional()
        .describe('Single automation details'),
      deleted: z.boolean().optional().describe('Whether deleted'),
      triggered: z.boolean().optional().describe('Whether manually triggered'),
      nextCursor: z.string().optional().describe('Pagination cursor')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth, ctx.config);

    let { action, automationId } = ctx.input;

    if (action === 'list') {
      let result = await client.listAutomations({
        cursor: ctx.input.cursor,
        perPage: ctx.input.perPage
      });

      let automations = result.automations.map((a: Record<string, unknown>) => ({
        automationId: nativeId(a.id),
        automationType: optionalText(a.automation),
        name: optionalText(a.name),
        trigger: optionalText(a.trigger),
        path: optionalText(a.path),
        disabled: typeof a.disabled === 'boolean' ? a.disabled : undefined,
        lastModifiedAt: optionalText(a.last_modified_at)
      }));

      return {
        output: { automations, nextCursor: result.cursor },
        message: `Found **${automations.length}** automations${result.cursor ? '. More results available.' : '.'}`
      };
    }

    if (action === 'get') {
      if (!automationId) reject('automationId is required for get');
      let a = await client.getAutomation(automationId);
      return {
        output: {
          automation: mapAutomation(a)
        },
        message: `Retrieved automation **${a.name || automationId}**`
      };
    }

    if (action === 'run') {
      if (!automationId) reject('automationId is required for run');
      await client.runAutomation(automationId);
      return {
        output: { triggered: true },
        message: `Files.com accepted the manual run for automation **${automationId}**. This does not confirm completion.`
      };
    }

    if (action === 'delete') {
      if (!automationId) reject('automationId is required for delete');
      await client.deleteAutomation(automationId);
      return {
        output: { deleted: true },
        message: `Deleted automation **${automationId}**`
      };
    }

    let data: Record<string, unknown> = {};
    if (ctx.input.automationType !== undefined) data.automation = ctx.input.automationType;
    if (ctx.input.trigger !== undefined) data.trigger = ctx.input.trigger;
    if (ctx.input.triggerActions !== undefined)
      data.trigger_actions = ctx.input.triggerActions;
    if (ctx.input.name !== undefined) data.name = ctx.input.name;
    if (ctx.input.description !== undefined) data.description = ctx.input.description;
    if (ctx.input.path !== undefined) data.path = ctx.input.path;
    if (ctx.input.source !== undefined) data.source = ctx.input.source;
    if (ctx.input.destinations !== undefined) data.destinations = ctx.input.destinations;
    if (ctx.input.interval !== undefined) data.interval = ctx.input.interval;
    if (ctx.input.scheduleTimesOfDay !== undefined)
      data.schedule_times_of_day = ctx.input.scheduleTimesOfDay;
    if (ctx.input.scheduleDaysOfWeek !== undefined)
      data.schedule_days_of_week = ctx.input.scheduleDaysOfWeek;
    if (ctx.input.scheduleTimeZone !== undefined)
      data.schedule_time_zone = ctx.input.scheduleTimeZone;
    if (ctx.input.disabled !== undefined) data.disabled = ctx.input.disabled;
    if (ctx.input.overwriteFiles !== undefined)
      data.overwrite_files = ctx.input.overwriteFiles;
    if (ctx.input.excludePattern !== undefined)
      data.exclude_pattern = ctx.input.excludePattern;

    if (action === 'create') {
      if (!ctx.input.automationType) reject('automationType is required for create');
      let a = await client.createAutomation(data);
      return {
        output: {
          automation: mapAutomation(a)
        },
        message: `Created automation **${a.name || a.id}** (${ctx.input.automationType})`
      };
    }

    // update
    if (!automationId) reject('automationId is required for update');
    let a = await client.updateAutomation(automationId, data);
    return {
      output: {
        automation: mapAutomation(a)
      },
      message: `Updated automation **${a.name || automationId}**`
    };
  })
  .build();

let mapAutomation = (a: Record<string, unknown>) => ({
  automationId: nativeId(a.id),
  automationType: optionalText(a.automation),
  name: optionalText(a.name),
  description: optionalText(a.description),
  trigger: optionalText(a.trigger),
  path: optionalText(a.path),
  destinations: stringArray(a.destinations),
  disabled: typeof a.disabled === 'boolean' ? a.disabled : undefined,
  scheduleDescription: optionalText(a.human_readable_schedule)
});
