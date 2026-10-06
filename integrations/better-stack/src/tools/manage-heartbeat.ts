import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import {
  type ApiResource,
  nextUrlSchema,
  notificationBody,
  notificationsSchema,
  pausedState,
  type ResourceResponse,
  requireFields,
  teamNameSchema
} from '../lib/api';
import { UptimeClient } from '../lib/client';
import { spec } from '../spec';

let heartbeatOutputSchema = z.object({
  heartbeatId: z.string().describe('Heartbeat ID'),
  name: z.string().nullable().describe('Heartbeat name'),
  url: z
    .string()
    .nullable()
    .describe('Legacy field; retrieve the secret ping URL from the heartbeat in Better Stack'),
  period: z.number().nullable().describe('Expected period in seconds'),
  grace: z.number().nullable().describe('Grace period in seconds'),
  status: z.string().nullable().describe('Current heartbeat status'),
  paused: z.boolean().nullable().describe('Whether the heartbeat is paused'),
  createdAt: z.string().nullable().describe('Creation timestamp'),
  deleted: z.boolean().optional().describe('Whether the heartbeat was deleted')
});

export let manageHeartbeat = SlateTool.create(spec, {
  name: 'Manage Heartbeat',
  key: 'manage_heartbeat',
  description: `Create, update, list, get, or delete heartbeat monitors for tracking CRON jobs and scheduled tasks. Heartbeats expect periodic pings and create incidents when pings are missed.`,
  tags: { readOnly: false, destructive: true },
  instructions: [
    'Use action "list" to list all heartbeats.',
    'Use action "get" to get details of a specific heartbeat.',
    'Use action "create" to create a new heartbeat with a name, period, and grace period.',
    'Use action "update" to modify an existing heartbeat.',
    'Use action "delete" to remove a heartbeat.'
  ]
})
  .input(
    z.object({
      teamName: teamNameSchema,
      ...notificationsSchema.shape,
      action: z
        .enum(['list', 'get', 'create', 'update', 'delete'])
        .describe('Action to perform'),
      heartbeatId: z
        .string()
        .optional()
        .describe('Heartbeat ID (required for get, update, delete)'),
      name: z.string().optional().describe('Heartbeat name (for create/update)'),
      period: z
        .number()
        .optional()
        .describe('Expected period between pings in seconds, at least 30 (for create/update)'),
      grace: z
        .number()
        .optional()
        .describe('Grace period before alerting in seconds (for create/update)'),
      paused: z.boolean().optional().describe('Whether the heartbeat should be paused'),
      policyId: z.string().optional().describe('Escalation policy ID'),
      nextUrl: nextUrlSchema,
      page: z.number().optional().describe('Page number for list action'),
      perPage: z.number().optional().describe('Results per page for list action')
    })
  )
  .output(
    z.object({
      heartbeats: z
        .array(heartbeatOutputSchema)
        .optional()
        .describe('List of heartbeats (for list action)'),
      heartbeat: heartbeatOutputSchema
        .optional()
        .describe('Single heartbeat (for get/create/update)'),
      nextUrl: z.string().optional().describe('Next-page URL, when available'),
      hasMore: z.boolean().optional().describe('Whether more results are available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new UptimeClient({
      token: ctx.auth.token,
      tokenType: ctx.auth.tokenType,
      teamName: ctx.input.teamName ?? ctx.config.teamName
    });

    let { action, heartbeatId } = ctx.input;

    let mapHeartbeat = (item: ApiResource) => {
      let attrs = item.attributes;
      return {
        heartbeatId: String(item.id),
        name: attrs.name || null,
        url: null,
        period: attrs.period ?? null,
        grace: attrs.grace ?? null,
        status: attrs.status || null,
        paused: pausedState(attrs),
        createdAt: attrs.created_at || null
      };
    };

    if (action === 'list') {
      let result = await client.listHeartbeats({
        nextUrl: ctx.input.nextUrl,
        page: ctx.input.page,
        perPage: ctx.input.perPage
      });
      let heartbeats = (result.data || []).map(mapHeartbeat);
      return {
        output: {
          heartbeats,
          hasMore: !!result.pagination?.next,
          nextUrl: result.pagination?.next ?? undefined
        },
        message: `Found **${heartbeats.length}** heartbeat(s).`
      };
    }

    if (action === 'get') {
      if (!heartbeatId) throw createApiServiceError('heartbeatId is required for get action');
      let result = await client.getHeartbeat(heartbeatId);
      return {
        output: { heartbeat: mapHeartbeat(result.data || result) },
        message: `Heartbeat **${(result.data?.attributes || result.data)?.name || heartbeatId}** retrieved.`
      };
    }

    if (action === 'delete') {
      if (!heartbeatId)
        throw createApiServiceError('heartbeatId is required for delete action');
      await client.deleteHeartbeat(heartbeatId);
      return {
        output: {
          heartbeat: {
            heartbeatId,
            name: null,
            url: null,
            period: null,
            grace: null,
            status: null,
            paused: null,
            createdAt: null,
            deleted: true
          }
        },
        message: `Heartbeat **${heartbeatId}** deleted.`
      };
    }

    // Create or Update
    let body: Record<string, unknown> = notificationBody(ctx.input);
    if (
      ctx.input.period !== undefined &&
      (!Number.isInteger(ctx.input.period) || ctx.input.period < 30)
    )
      throw createApiServiceError('period must be an integer of at least 30 seconds.');
    if (
      ctx.input.grace !== undefined &&
      (!Number.isInteger(ctx.input.grace) || ctx.input.grace < 0)
    )
      throw createApiServiceError('grace must be a nonnegative integer number of seconds.');
    if (ctx.input.name) body.name = ctx.input.name;
    if (ctx.input.period !== undefined) body.period = ctx.input.period;
    if (ctx.input.grace !== undefined) body.grace = ctx.input.grace;
    if (ctx.input.paused !== undefined) body.paused = ctx.input.paused;
    if (ctx.input.policyId) body.policy_id = ctx.input.policyId;

    let result: ResourceResponse;
    if (action === 'create') {
      requireFields(ctx.input.name, ctx.input.period);
      result = await client.createHeartbeat(body);
    } else {
      if (!heartbeatId)
        throw createApiServiceError('heartbeatId is required for update action');
      result = await client.updateHeartbeat(heartbeatId, body);
    }

    let hb = mapHeartbeat(result.data || result);
    return {
      output: { heartbeat: hb },
      message: `Heartbeat **${hb.name || hb.heartbeatId}** ${action === 'create' ? 'created' : 'updated'}.`
    };
  })
  .build();
