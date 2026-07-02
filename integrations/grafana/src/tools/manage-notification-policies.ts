import { SlateTool } from 'slates';
import { z } from 'zod';
import { GrafanaClient } from '../lib/client';
import { spec } from '../spec';

export let getNotificationPolicies = SlateTool.create(spec, {
  name: 'Get Notification Policies',
  key: 'get_notification_policies',
  description: `Retrieve the notification policy tree that controls how alerts are routed to contact points. Shows the hierarchy of routing rules including matchers, grouping, and timing settings.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      receiver: z
        .string()
        .optional()
        .describe('Default receiver (contact point) for unmatched alerts'),
      groupBy: z.array(z.string()).optional().describe('Labels used to group alerts'),
      groupWait: z
        .string()
        .optional()
        .describe('Time to wait before sending the first notification for a new group'),
      groupInterval: z
        .string()
        .optional()
        .describe('Minimum time between notifications for a group'),
      repeatInterval: z
        .string()
        .optional()
        .describe('Minimum time before re-sending a notification'),
      routes: z
        .array(z.any())
        .optional()
        .describe('Child routing rules with matchers and overrides')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GrafanaClient({
      instanceUrl: ctx.config.instanceUrl,
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    let result = await client.getNotificationPolicyTree();

    return {
      output: {
        receiver: result.receiver,
        groupBy: result.group_by,
        groupWait: result.group_wait,
        groupInterval: result.group_interval,
        repeatInterval: result.repeat_interval,
        routes: result.routes
      },
      message: `Retrieved notification policy tree. Default receiver: **${result.receiver || 'none'}**, ${(result.routes || []).length} child route(s).`
    };
  })
  .build();

export let updateNotificationPolicies = SlateTool.create(spec, {
  name: 'Update Notification Policies',
  key: 'update_notification_policies',
  description: `Update the notification policy tree. This replaces the entire routing configuration. Controls how alerts are routed to contact points based on label matchers.`,
  instructions: [
    'This replaces the entire policy tree. Retrieve the current tree first, modify it, then submit the updated version.',
    'Each route can have matchers, a receiver, group settings, and child routes.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      receiver: z
        .string()
        .describe('Default receiver (contact point name) for unmatched alerts'),
      groupBy: z.array(z.string()).optional().describe('Labels used to group alerts'),
      groupWait: z
        .string()
        .optional()
        .describe('Time to wait before first notification (e.g. "30s", "1m")'),
      groupInterval: z
        .string()
        .optional()
        .describe('Minimum time between notifications for a group (e.g. "5m")'),
      repeatInterval: z
        .string()
        .optional()
        .describe('Minimum time before re-sending (e.g. "4h")'),
      routes: z
        .array(z.any())
        .optional()
        .describe('Child routing rules with matchers, receivers, and nested routes')
    })
  )
  .output(
    z.object({
      message: z.string().describe('Confirmation message')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GrafanaClient({
      instanceUrl: ctx.config.instanceUrl,
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    let body: Record<string, any> = {
      receiver: ctx.input.receiver
    };
    if (ctx.input.groupBy) body.group_by = ctx.input.groupBy;
    if (ctx.input.groupWait) body.group_wait = ctx.input.groupWait;
    if (ctx.input.groupInterval) body.group_interval = ctx.input.groupInterval;
    if (ctx.input.repeatInterval) body.repeat_interval = ctx.input.repeatInterval;
    if (ctx.input.routes) body.routes = ctx.input.routes;

    await client.updateNotificationPolicyTree(body);

    return {
      output: {
        message: 'Notification policies updated.'
      },
      message: `Notification policies updated. Default receiver: **${ctx.input.receiver}**.`
    };
  })
  .build();
