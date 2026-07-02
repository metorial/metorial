import { SlateTool } from 'slates';
import { z } from 'zod';
import { MezmoClient } from '../lib/client';
import { spec } from '../spec';

let channelSchema = z
  .object({
    integration: z
      .enum(['email', 'webhook', 'pagerduty', 'slack'])
      .describe('Alert channel type'),
    emails: z.array(z.string()).optional().describe('Email addresses for email alerts'),
    url: z.string().optional().describe('Webhook URL'),
    key: z.string().optional().describe('PagerDuty or Slack key'),
    method: z.string().optional().describe('HTTP method for webhook (POST, PUT, etc.)'),
    headers: z
      .record(z.string(), z.string())
      .optional()
      .describe('Custom headers for webhook'),
    bodyTemplate: z
      .record(z.string(), z.unknown())
      .optional()
      .describe('Custom body template for webhook'),
    triggerlimit: z
      .number()
      .optional()
      .describe('Number of lines that must match to trigger alert'),
    triggerinterval: z
      .string()
      .optional()
      .describe('Time interval for the trigger (e.g., "30", "1m", "15m")'),
    operator: z.string().optional().describe('Alert condition operator (presence, absence)'),
    immediate: z
      .string()
      .optional()
      .describe('Whether to send alert immediately ("true" or "false")'),
    terminal: z
      .string()
      .optional()
      .describe('Whether to include terminal output ("true" or "false")'),
    timezone: z.string().optional().describe('Timezone for alert schedule')
  })
  .describe('Alert channel configuration');

let viewOutputSchema = z.object({
  viewId: z.string().describe('Unique view identifier'),
  name: z.string().describe('View name'),
  query: z.string().describe('Search query'),
  apps: z.array(z.string()).describe('Filtered applications'),
  hosts: z.array(z.string()).describe('Filtered hostnames'),
  levels: z.array(z.string()).describe('Filtered log levels'),
  tags: z.array(z.string()).describe('Filtered tags'),
  categories: z.array(z.string()).describe('Associated categories'),
  presetAlertIds: z.array(z.string()).describe('Attached preset alert IDs')
});

export let listViews = SlateTool.create(spec, {
  name: 'List Views',
  key: 'list_views',
  description: `List all views configured in Mezmo. Views are saved search queries and filters for organizing and interacting with log data.`,
  tags: { readOnly: true, destructive: false }
})
  .input(z.object({}))
  .output(
    z.object({
      views: z.array(viewOutputSchema).describe('List of views')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MezmoClient({ token: ctx.auth.token });
    let views = await client.listViews();

    let mapped = (Array.isArray(views) ? views : []).map(v => ({
      viewId: v.viewID || '',
      name: v.name || '',
      query: v.query || '',
      apps: v.apps || [],
      hosts: v.hosts || [],
      levels: v.levels || [],
      tags: v.tags || [],
      categories: v.category || [],
      presetAlertIds: v.presetids || []
    }));

    return {
      output: { views: mapped },
      message: `Found **${mapped.length}** view(s).`
    };
  })
  .build();

export let createView = SlateTool.create(spec, {
  name: 'Create View',
  key: 'create_view',
  description: `Create a new view in Mezmo with search filters and optional alert channels. Views are saved search queries that help you organize and monitor specific log data.`,
  tags: { readOnly: false, destructive: false }
})
  .input(
    z.object({
      name: z.string().describe('Name of the view'),
      query: z.string().optional().describe('Search query for the view'),
      apps: z.array(z.string()).optional().describe('Applications to filter'),
      hosts: z.array(z.string()).optional().describe('Hostnames to filter'),
      levels: z
        .array(z.string())
        .optional()
        .describe('Log levels to filter (e.g., error, warn, info)'),
      tags: z.array(z.string()).optional().describe('Tags to filter'),
      categories: z.array(z.string()).optional().describe('Categories to assign the view to'),
      channels: z
        .array(channelSchema)
        .optional()
        .describe('Alert channels to attach to the view'),
      presetAlertId: z.string().optional().describe('Preset alert ID to attach')
    })
  )
  .output(viewOutputSchema)
  .handleInvocation(async ctx => {
    let client = new MezmoClient({ token: ctx.auth.token });

    let result = await client.createView({
      name: ctx.input.name,
      query: ctx.input.query,
      apps: ctx.input.apps,
      hosts: ctx.input.hosts,
      levels: ctx.input.levels,
      tags: ctx.input.tags,
      category: ctx.input.categories,
      channels: ctx.input.channels as any,
      presetid: ctx.input.presetAlertId
    });

    return {
      output: {
        viewId: result.viewID || '',
        name: result.name || '',
        query: result.query || '',
        apps: result.apps || [],
        hosts: result.hosts || [],
        levels: result.levels || [],
        tags: result.tags || [],
        categories: result.category || [],
        presetAlertIds: result.presetids || []
      },
      message: `Created view **${result.name}** with ID \`${result.viewID}\`.`
    };
  })
  .build();

export let updateView = SlateTool.create(spec, {
  name: 'Update View',
  key: 'update_view',
  description: `Update an existing view's configuration including its name, search query, filters, and alert channels. Can also attach or detach preset alerts.`,
  tags: { readOnly: false, destructive: false }
})
  .input(
    z.object({
      viewId: z.string().describe('ID of the view to update'),
      name: z.string().optional().describe('New name for the view'),
      query: z.string().optional().describe('Updated search query'),
      apps: z.array(z.string()).optional().describe('Updated applications filter'),
      hosts: z.array(z.string()).optional().describe('Updated hostnames filter'),
      levels: z.array(z.string()).optional().describe('Updated log levels filter'),
      tags: z.array(z.string()).optional().describe('Updated tags filter'),
      categories: z.array(z.string()).optional().describe('Updated categories'),
      channels: z.array(channelSchema).optional().describe('Updated alert channels'),
      presetAlertId: z.string().optional().describe('Preset alert ID to attach')
    })
  )
  .output(viewOutputSchema)
  .handleInvocation(async ctx => {
    let client = new MezmoClient({ token: ctx.auth.token });

    let result = await client.updateView(ctx.input.viewId, {
      name: ctx.input.name,
      query: ctx.input.query,
      apps: ctx.input.apps,
      hosts: ctx.input.hosts,
      levels: ctx.input.levels,
      tags: ctx.input.tags,
      category: ctx.input.categories,
      channels: ctx.input.channels as any,
      presetid: ctx.input.presetAlertId
    });

    return {
      output: {
        viewId: result.viewID || '',
        name: result.name || '',
        query: result.query || '',
        apps: result.apps || [],
        hosts: result.hosts || [],
        levels: result.levels || [],
        tags: result.tags || [],
        categories: result.category || [],
        presetAlertIds: result.presetids || []
      },
      message: `Updated view **${result.name}** (\`${result.viewID}\`).`
    };
  })
  .build();

export let deleteView = SlateTool.create(spec, {
  name: 'Delete View',
  key: 'delete_view',
  description: `Delete a view and all of its attached alerts from Mezmo.`,
  tags: { readOnly: false, destructive: true }
})
  .input(
    z.object({
      viewId: z.string().describe('ID of the view to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the view was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MezmoClient({ token: ctx.auth.token });
    await client.deleteView(ctx.input.viewId);

    return {
      output: { deleted: true },
      message: `Deleted view \`${ctx.input.viewId}\` and its attached alerts.`
    };
  })
  .build();
