import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let codeMonitorSchema = z.object({
  codeMonitorId: z.string().describe('GraphQL ID of the code monitor'),
  description: z.string().describe('Description of what the monitor watches for'),
  enabled: z.boolean(),
  owner: z.string().optional().describe('Owner username or org name'),
  query: z.string().optional().describe('Search query that triggers the monitor'),
  actions: z
    .array(
      z.object({
        actionType: z.string().describe('Type of action: email, slackWebhook, or webhook'),
        enabled: z.boolean(),
        url: z.string().optional().describe('Webhook URL (for slack/webhook actions)')
      })
    )
    .optional(),
  createdAt: z.string().optional()
});

export let listCodeMonitors = SlateTool.create(spec, {
  name: 'List Code Monitors',
  key: 'list_code_monitors',
  description: `List code monitors for the current user. Code monitors watch for changes matching a search query and trigger notifications via email, Slack, or webhooks.
Useful for tracking secrets, anti-patterns, or specific code changes.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      first: z.number().optional().describe('Number of monitors to return (default 50)'),
      after: z.string().optional().describe('Pagination cursor')
    })
  )
  .output(
    z.object({
      codeMonitors: z.array(codeMonitorSchema),
      totalCount: z.number(),
      hasNextPage: z.boolean(),
      endCursor: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      instanceUrl: ctx.config.instanceUrl,
      authorizationHeader: ctx.auth.authorizationHeader
    });

    let data = await client.listCodeMonitors({
      first: ctx.input.first,
      after: ctx.input.after
    });

    let monitors = data.currentUser.monitors;
    let codeMonitors = (monitors.nodes || []).map((n: any) => {
      let actions = (n.actions?.nodes || []).map((a: any) => {
        if (a.url !== undefined) {
          let actionType = a.__typename === 'MonitorSlackWebhook' ? 'slackWebhook' : 'webhook';
          return { actionType, enabled: a.enabled, url: a.url };
        }
        return { actionType: 'email', enabled: a.enabled };
      });

      return {
        codeMonitorId: n.id,
        description: n.description,
        enabled: n.enabled,
        owner: n.owner?.username || n.owner?.name || undefined,
        query: n.trigger?.query || undefined,
        actions,
        createdAt: n.createdAt || undefined
      };
    });

    return {
      output: {
        codeMonitors,
        totalCount: monitors.totalCount || 0,
        hasNextPage: monitors.pageInfo?.hasNextPage || false,
        endCursor: monitors.pageInfo?.endCursor || undefined
      },
      message: `Found **${monitors.totalCount}** code monitors. Showing ${codeMonitors.length}.`
    };
  })
  .build();

export let createCodeMonitor = SlateTool.create(spec, {
  name: 'Create Code Monitor',
  key: 'create_code_monitor',
  description: `Create a new code monitor that watches for code changes matching a search query.
When matches are found in new commits, the monitor triggers notifications via email, Slack webhook, or generic webhook.
The search query must include a \`type:diff\` or \`type:commit\` filter.`,
  instructions: [
    'The search query must include type:diff or type:commit to monitor for new changes',
    'At least one action (email, slack, or webhook) must be specified'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      description: z.string().describe('Description of what the monitor watches for'),
      enabled: z
        .boolean()
        .optional()
        .describe('Whether the monitor is enabled. Defaults to true.'),
      namespaceUserId: z.string().describe('GraphQL ID of the user who owns the monitor'),
      query: z
        .string()
        .describe('Sourcegraph search query (must include type:diff or type:commit)'),
      emailRecipients: z
        .array(z.string())
        .optional()
        .describe('GraphQL IDs of email recipients'),
      slackWebhookUrl: z.string().optional().describe('Slack webhook URL for notifications'),
      webhookUrl: z.string().optional().describe('Generic webhook URL for notifications')
    })
  )
  .output(
    z.object({
      codeMonitorId: z.string(),
      description: z.string(),
      enabled: z.boolean(),
      query: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      instanceUrl: ctx.config.instanceUrl,
      authorizationHeader: ctx.auth.authorizationHeader
    });

    let actions: any[] = [];
    if (ctx.input.emailRecipients && ctx.input.emailRecipients.length > 0) {
      actions.push({
        email: {
          enabled: true,
          recipients: ctx.input.emailRecipients
        }
      });
    }
    if (ctx.input.slackWebhookUrl) {
      actions.push({
        slackWebhook: {
          enabled: true,
          url: ctx.input.slackWebhookUrl
        }
      });
    }
    if (ctx.input.webhookUrl) {
      actions.push({
        webhook: {
          enabled: true,
          url: ctx.input.webhookUrl
        }
      });
    }

    let data = await client.createCodeMonitor({
      description: ctx.input.description,
      enabled: ctx.input.enabled !== false,
      namespace: ctx.input.namespaceUserId,
      trigger: { query: ctx.input.query },
      actions
    });

    let monitor = data.createCodeMonitor;

    return {
      output: {
        codeMonitorId: monitor.id,
        description: monitor.description,
        enabled: monitor.enabled,
        query: monitor.trigger?.query || undefined
      },
      message: `Created code monitor **${monitor.description}** watching for: \`${ctx.input.query}\`.`
    };
  })
  .build();

export let deleteCodeMonitor = SlateTool.create(spec, {
  name: 'Delete Code Monitor',
  key: 'delete_code_monitor',
  description: `Delete a code monitor from the Sourcegraph instance.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      codeMonitorId: z.string().describe('GraphQL ID of the code monitor to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      instanceUrl: ctx.config.instanceUrl,
      authorizationHeader: ctx.auth.authorizationHeader
    });

    await client.deleteCodeMonitor(ctx.input.codeMonitorId);

    return {
      output: { deleted: true },
      message: `Deleted code monitor **${ctx.input.codeMonitorId}**.`
    };
  })
  .build();
