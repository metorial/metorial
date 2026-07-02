import { SlateTool } from 'slates';
import { z } from 'zod';
import { UptimeClient } from '../lib/client';
import { spec } from '../spec';

let onCallSchema = z.object({
  calendarId: z.string().describe('On-call calendar ID'),
  name: z.string().nullable().describe('Calendar name'),
  defaultCalendar: z.boolean().nullable().describe('Whether this is the default calendar'),
  onCallNow: z
    .array(z.record(z.string(), z.any()))
    .nullable()
    .describe('Currently on-call members'),
  createdAt: z.string().nullable().describe('Creation timestamp'),
  updatedAt: z.string().nullable().describe('Last update timestamp')
});

let escalationPolicySchema = z.object({
  policyId: z.string().describe('Escalation policy ID'),
  name: z.string().nullable().describe('Policy name'),
  repeatCount: z.number().nullable().describe('Number of times to repeat escalation'),
  repeatDelay: z.number().nullable().describe('Delay between repeats in seconds'),
  steps: z.array(z.record(z.string(), z.any())).nullable().describe('Escalation steps'),
  createdAt: z.string().nullable().describe('Creation timestamp')
});

export let manageOnCall = SlateTool.create(spec, {
  name: 'Manage On-Call',
  key: 'manage_on_call',
  description: `Manage on-call calendars and escalation policies. List, create, update, or delete on-call calendars and escalation policies. On-call calendars define who is on call, while escalation policies define how alerts are routed.`,
  instructions: [
    'Use resource "calendar" for on-call calendar operations.',
    'Use resource "policy" for escalation policy operations.',
    'For calendars: list, get, create, update, or delete.',
    'For policies: list, get, create, update, or delete.'
  ]
})
  .input(
    z.object({
      resource: z.enum(['calendar', 'policy']).describe('Resource type to manage'),
      action: z
        .enum(['list', 'get', 'create', 'update', 'delete'])
        .describe('Action to perform'),
      resourceId: z
        .string()
        .optional()
        .describe('Calendar or policy ID (required for get, update, delete)'),
      name: z.string().optional().describe('Name for the calendar or policy'),
      repeatCount: z
        .number()
        .optional()
        .describe('Number of escalation repeats (for policy create/update)'),
      repeatDelay: z
        .number()
        .optional()
        .describe('Delay between repeats in seconds (for policy create/update)'),
      steps: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Escalation steps configuration (for policy create/update)'),
      page: z.number().optional().describe('Page number for list action'),
      perPage: z.number().optional().describe('Results per page for list action')
    })
  )
  .output(
    z.object({
      calendars: z.array(onCallSchema).optional().describe('List of on-call calendars'),
      calendar: onCallSchema.optional().describe('Single on-call calendar'),
      policies: z
        .array(escalationPolicySchema)
        .optional()
        .describe('List of escalation policies'),
      policy: escalationPolicySchema.optional().describe('Single escalation policy'),
      hasMore: z.boolean().optional().describe('Whether more results are available'),
      deleted: z.boolean().optional().describe('Whether the resource was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new UptimeClient({
      token: ctx.auth.token,
      teamName: ctx.config.teamName
    });

    let { resource, action, resourceId } = ctx.input;

    let mapCalendar = (item: any) => {
      let attrs = item.attributes || item;
      return {
        calendarId: String(item.id),
        name: attrs.name || null,
        defaultCalendar: attrs.default_calendar ?? null,
        onCallNow: attrs.on_call_now || null,
        createdAt: attrs.created_at || null,
        updatedAt: attrs.updated_at || null
      };
    };

    let mapPolicy = (item: any) => {
      let attrs = item.attributes || item;
      return {
        policyId: String(item.id),
        name: attrs.name || null,
        repeatCount: attrs.repeat_count ?? null,
        repeatDelay: attrs.repeat_delay ?? null,
        steps: attrs.steps || null,
        createdAt: attrs.created_at || null
      };
    };

    if (resource === 'calendar') {
      if (action === 'list') {
        let result = await client.listOnCallCalendars({
          page: ctx.input.page,
          perPage: ctx.input.perPage
        });
        let calendars = (result.data || []).map(mapCalendar);
        return {
          output: { calendars, hasMore: !!result.pagination?.next },
          message: `Found **${calendars.length}** on-call calendar(s).`
        };
      }

      if (action === 'get') {
        if (!resourceId) throw new Error('resourceId is required');
        let result = await client.getOnCallCalendar(resourceId);
        return {
          output: { calendar: mapCalendar(result.data || result) },
          message: `On-call calendar retrieved.`
        };
      }

      if (action === 'delete') {
        if (!resourceId) throw new Error('resourceId is required');
        await client.deleteOnCallCalendar(resourceId);
        return {
          output: { deleted: true },
          message: `On-call calendar **${resourceId}** deleted.`
        };
      }

      let body: Record<string, any> = {};
      if (ctx.input.name) body.name = ctx.input.name;

      let result: any;
      if (action === 'create') {
        result = await client.createOnCallCalendar(body);
      } else {
        if (!resourceId) throw new Error('resourceId is required');
        result = await client.updateOnCallCalendar(resourceId, body);
      }
      return {
        output: { calendar: mapCalendar(result.data || result) },
        message: `On-call calendar ${action === 'create' ? 'created' : 'updated'}.`
      };
    }

    // Escalation Policies
    if (action === 'list') {
      let result = await client.listEscalationPolicies({
        page: ctx.input.page,
        perPage: ctx.input.perPage
      });
      let policies = (result.data || []).map(mapPolicy);
      return {
        output: { policies, hasMore: !!result.pagination?.next },
        message: `Found **${policies.length}** escalation policy(ies).`
      };
    }

    if (action === 'get') {
      if (!resourceId) throw new Error('resourceId is required');
      let result = await client.getEscalationPolicy(resourceId);
      return {
        output: { policy: mapPolicy(result.data || result) },
        message: `Escalation policy retrieved.`
      };
    }

    if (action === 'delete') {
      if (!resourceId) throw new Error('resourceId is required');
      await client.deleteEscalationPolicy(resourceId);
      return {
        output: { deleted: true },
        message: `Escalation policy **${resourceId}** deleted.`
      };
    }

    let body: Record<string, any> = {};
    if (ctx.input.name) body.name = ctx.input.name;
    if (ctx.input.repeatCount !== undefined) body.repeat_count = ctx.input.repeatCount;
    if (ctx.input.repeatDelay !== undefined) body.repeat_delay = ctx.input.repeatDelay;
    if (ctx.input.steps) body.steps = ctx.input.steps;

    let result: any;
    if (action === 'create') {
      result = await client.createEscalationPolicy(body);
    } else {
      if (!resourceId) throw new Error('resourceId is required');
      result = await client.updateEscalationPolicy(resourceId, body);
    }
    return {
      output: { policy: mapPolicy(result.data || result) },
      message: `Escalation policy ${action === 'create' ? 'created' : 'updated'}.`
    };
  })
  .build();
