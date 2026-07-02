import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let channelSchema = z.object({
  integration: z.string().describe('Alert integration type: email, webhook, or pagerduty'),
  emails: z.array(z.string()).optional().describe('Email addresses for email alerts'),
  url: z.string().optional().describe('Webhook URL for webhook alerts'),
  method: z.string().optional().describe('HTTP method for webhook (POST, PUT, etc.)'),
  headers: z
    .record(z.string(), z.string())
    .optional()
    .describe('Custom HTTP headers for webhook'),
  bodyTemplate: z
    .string()
    .optional()
    .describe('Body template for webhook, supports {{name}} variables'),
  key: z.string().optional().describe('PagerDuty service key'),
  triggerlimit: z
    .number()
    .optional()
    .describe('Number of log lines that must match before triggering'),
  triggerinterval: z
    .string()
    .optional()
    .describe('Time interval for trigger evaluation (e.g., "15m", "30m", "1h")'),
  operator: z.string().optional().describe('Trigger operator: "presence" or "absence"'),
  immediate: z
    .boolean()
    .optional()
    .describe('Whether to send alert immediately when condition is met'),
  terminal: z.boolean().optional().describe('Whether the alert is terminal'),
  timezone: z.string().optional().describe('Timezone for the alert schedule')
});

let viewOutputSchema = z.object({
  viewId: z.string().describe('Unique ID of the view'),
  name: z.string().optional().describe('Name of the view'),
  query: z.string().optional().describe('Search query for the view'),
  apps: z.array(z.string()).optional().describe('Apps filter'),
  hosts: z.array(z.string()).optional().describe('Hosts filter'),
  levels: z.array(z.string()).optional().describe('Log levels filter'),
  tags: z.array(z.string()).optional().describe('Tags filter'),
  channels: z.array(z.any()).optional().describe('Alert channels attached to this view'),
  category: z.array(z.string()).optional().describe('Category IDs'),
  presetIds: z.array(z.string()).optional().describe('Preset alert IDs attached to this view')
});

export let listViews = SlateTool.create(spec, {
  name: 'List Views',
  key: 'list_views',
  description: `List all saved log views in the LogDNA account. Views are saved log queries with optional alert configurations.`,
  tags: { destructive: false, readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      views: z.array(viewOutputSchema).describe('List of saved views')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ serviceKey: ctx.auth.token });
    let views = await client.listViews();
    let viewList = Array.isArray(views) ? views : [];

    return {
      output: {
        views: viewList.map((v: any) => ({
          viewId: v.viewID || v.id || '',
          name: v.name,
          query: v.query,
          apps: v.apps,
          hosts: v.hosts,
          levels: v.levels,
          tags: v.tags,
          channels: v.channels,
          category: v.category,
          presetIds: v.presetIds
        }))
      },
      message: `Found **${viewList.length}** view(s).`
    };
  })
  .build();

export let getView = SlateTool.create(spec, {
  name: 'Get View',
  key: 'get_view',
  description: `Retrieve the configuration of a specific saved view by its ID, including its query, filters, and alert channels.`,
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      viewId: z.string().describe('ID of the view to retrieve')
    })
  )
  .output(viewOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ serviceKey: ctx.auth.token });
    let v = await client.getView(ctx.input.viewId);

    return {
      output: {
        viewId: v.viewID || v.id || ctx.input.viewId,
        name: v.name,
        query: v.query,
        apps: v.apps,
        hosts: v.hosts,
        levels: v.levels,
        tags: v.tags,
        channels: v.channels,
        category: v.category,
        presetIds: v.presetIds
      },
      message: `Retrieved view **${v.name || ctx.input.viewId}**.`
    };
  })
  .build();

export let createView = SlateTool.create(spec, {
  name: 'Create View',
  key: 'create_view',
  description: `Create a new saved log view with optional filters and alert channels. Views allow you to save log queries filtered by apps, hosts, log levels, query strings, and tags.`,
  tags: { destructive: false, readOnly: false }
})
  .input(
    z.object({
      name: z.string().describe('Name for the new view'),
      query: z.string().optional().describe('Search query string'),
      apps: z.array(z.string()).optional().describe('App names to filter by'),
      hosts: z.array(z.string()).optional().describe('Hostnames to filter by'),
      levels: z
        .array(z.string())
        .optional()
        .describe('Log levels to filter by (e.g., error, warn, info)'),
      tags: z.array(z.string()).optional().describe('Tags to filter by'),
      category: z.array(z.string()).optional().describe('Category IDs to assign the view to'),
      channels: z
        .array(channelSchema)
        .optional()
        .describe('Alert channels to attach to this view'),
      presetId: z.string().optional().describe('Preset alert ID to attach')
    })
  )
  .output(viewOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ serviceKey: ctx.auth.token });
    let v = await client.createView({
      name: ctx.input.name,
      query: ctx.input.query,
      apps: ctx.input.apps,
      hosts: ctx.input.hosts,
      levels: ctx.input.levels,
      tags: ctx.input.tags,
      category: ctx.input.category,
      channels: ctx.input.channels,
      presetId: ctx.input.presetId
    });

    return {
      output: {
        viewId: v.viewID || v.id || '',
        name: v.name,
        query: v.query,
        apps: v.apps,
        hosts: v.hosts,
        levels: v.levels,
        tags: v.tags,
        channels: v.channels,
        category: v.category,
        presetIds: v.presetIds
      },
      message: `Created view **${v.name || ctx.input.name}**.`
    };
  })
  .build();

export let updateView = SlateTool.create(spec, {
  name: 'Update View',
  key: 'update_view',
  description: `Update an existing saved log view. You can modify the name, query, filters, categories, and alert channels.`,
  tags: { destructive: false, readOnly: false }
})
  .input(
    z.object({
      viewId: z.string().describe('ID of the view to update'),
      name: z.string().optional().describe('New name for the view'),
      query: z.string().optional().describe('Updated search query string'),
      apps: z.array(z.string()).optional().describe('Updated app names filter'),
      hosts: z.array(z.string()).optional().describe('Updated hostnames filter'),
      levels: z.array(z.string()).optional().describe('Updated log levels filter'),
      tags: z.array(z.string()).optional().describe('Updated tags filter'),
      category: z.array(z.string()).optional().describe('Updated category IDs'),
      channels: z.array(channelSchema).optional().describe('Updated alert channels'),
      presetId: z.string().optional().describe('Updated preset alert ID')
    })
  )
  .output(viewOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ serviceKey: ctx.auth.token });
    let { viewId, ...updates } = ctx.input;
    let v = await client.updateView(viewId, updates);

    return {
      output: {
        viewId: v.viewID || v.id || viewId,
        name: v.name,
        query: v.query,
        apps: v.apps,
        hosts: v.hosts,
        levels: v.levels,
        tags: v.tags,
        channels: v.channels,
        category: v.category,
        presetIds: v.presetIds
      },
      message: `Updated view **${v.name || viewId}**.`
    };
  })
  .build();

export let deleteView = SlateTool.create(spec, {
  name: 'Delete View',
  key: 'delete_view',
  description: `Delete a saved log view and any attached alerts by its ID.`,
  tags: { destructive: true, readOnly: false }
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
    let client = new Client({ serviceKey: ctx.auth.token });
    await client.deleteView(ctx.input.viewId);

    return {
      output: { deleted: true },
      message: `Deleted view **${ctx.input.viewId}**.`
    };
  })
  .build();
