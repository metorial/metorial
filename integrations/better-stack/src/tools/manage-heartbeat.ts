import { SlateTool } from 'slates';
import { z } from 'zod';
import { UptimeClient } from '../lib/client';
import { spec } from '../spec';

let heartbeatOutputSchema = z.object({
  heartbeatId: z.string().describe('Heartbeat ID'),
  name: z.string().nullable().describe('Heartbeat name'),
  url: z.string().nullable().describe('Ping URL for the heartbeat'),
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
        .describe('Expected period between pings in seconds (for create/update)'),
      grace: z
        .number()
        .optional()
        .describe('Grace period before alerting in seconds (for create/update)'),
      paused: z.boolean().optional().describe('Whether the heartbeat should be paused'),
      policyId: z.string().optional().describe('Escalation policy ID'),
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
      hasMore: z.boolean().optional().describe('Whether more results are available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new UptimeClient({
      token: ctx.auth.token,
      teamName: ctx.config.teamName
    });

    let { action, heartbeatId } = ctx.input;

    let mapHeartbeat = (item: any) => {
      let attrs = item.attributes || item;
      return {
        heartbeatId: String(item.id),
        name: attrs.name || null,
        url: attrs.url || null,
        period: attrs.period ?? null,
        grace: attrs.grace ?? null,
        status: attrs.status || null,
        paused: attrs.paused ?? null,
        createdAt: attrs.created_at || null
      };
    };

    if (action === 'list') {
      let result = await client.listHeartbeats({
        page: ctx.input.page,
        perPage: ctx.input.perPage
      });
      let heartbeats = (result.data || []).map(mapHeartbeat);
      return {
        output: { heartbeats, hasMore: !!result.pagination?.next },
        message: `Found **${heartbeats.length}** heartbeat(s).`
      };
    }

    if (action === 'get') {
      if (!heartbeatId) throw new Error('heartbeatId is required for get action');
      let result = await client.getHeartbeat(heartbeatId);
      return {
        output: { heartbeat: mapHeartbeat(result.data || result) },
        message: `Heartbeat **${(result.data?.attributes || result.data)?.name || heartbeatId}** retrieved.`
      };
    }

    if (action === 'delete') {
      if (!heartbeatId) throw new Error('heartbeatId is required for delete action');
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
    let body: Record<string, any> = {};
    if (ctx.input.name) body.name = ctx.input.name;
    if (ctx.input.period) body.period = ctx.input.period;
    if (ctx.input.grace) body.grace = ctx.input.grace;
    if (ctx.input.paused !== undefined) body.paused = ctx.input.paused;
    if (ctx.input.policyId) body.policy_id = ctx.input.policyId;

    let result: any;
    if (action === 'create') {
      result = await client.createHeartbeat(body);
    } else {
      if (!heartbeatId) throw new Error('heartbeatId is required for update action');
      result = await client.updateHeartbeat(heartbeatId, body);
    }

    let hb = mapHeartbeat(result.data || result);
    return {
      output: { heartbeat: hb },
      message: `Heartbeat **${hb.name || hb.heartbeatId}** ${action === 'create' ? 'created' : 'updated'}.`
    };
  })
  .build();
