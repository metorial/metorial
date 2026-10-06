import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import {
  type ApiResource,
  nextUrlSchema,
  onCallUsers,
  type ResourceResponse,
  requireFields,
  teamNameSchema
} from '../lib/api';
import { UptimeClient } from '../lib/client';
import { spec } from '../spec';

let onCallSchema = z.object({
  calendarId: z.string().describe('On-call calendar ID'),
  name: z.string().nullable().describe('Calendar name'),
  defaultCalendar: z.boolean().nullable().describe('Whether this is the default calendar'),
  onCallNow: z
    .array(z.record(z.string(), z.unknown()))
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
  steps: z.array(z.record(z.string(), z.unknown())).nullable().describe('Escalation steps'),
  createdAt: z.string().nullable().describe('Creation timestamp')
});

export let manageOnCall = SlateTool.create(spec, {
  name: 'Manage On-Call',
  key: 'manage_on_call',
  description: `Manage on-call calendars and escalation policies. List, create, update, or delete on-call calendars and escalation policies. On-call calendars define who is on call, while escalation policies define how alerts are routed.`,
  tags: { readOnly: false, destructive: true },
  instructions: [
    'Use resource "calendar" for on-call calendar operations.',
    'Use resource "policy" for escalation policy operations.',
    'For calendars: list, get, create, update, or delete.',
    'For policies: list, get, create, update, or delete.'
  ]
})
  .input(
    z.object({
      teamName: teamNameSchema,
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
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('Escalation steps configuration (for policy create/update)'),
      nextUrl: nextUrlSchema,
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
      nextUrl: z.string().optional().describe('Next-page URL, when available'),
      hasMore: z.boolean().optional().describe('Whether more results are available'),
      deleted: z.boolean().optional().describe('Whether the resource was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new UptimeClient({
      token: ctx.auth.token,
      tokenType: ctx.auth.tokenType,
      teamName: ctx.input.teamName ?? ctx.config.teamName
    });

    let { resource, action, resourceId } = ctx.input;

    let mapCalendar = (item: ApiResource) => {
      let attrs = item.attributes;
      return {
        calendarId: String(item.id),
        name: attrs.name || null,
        defaultCalendar: attrs.default_calendar ?? null,
        onCallNow: onCallUsers(item),
        createdAt: attrs.created_at || null,
        updatedAt: attrs.updated_at || null
      };
    };

    let mapPolicy = (item: ApiResource) => {
      let attrs = item.attributes;
      return {
        policyId: String(item.id),
        name: attrs.name || null,
        repeatCount: attrs.repeat_count ?? null,
        repeatDelay: attrs.repeat_delay ?? null,
        steps: item.steps ?? attrs.steps ?? null,
        createdAt: attrs.created_at || null
      };
    };

    if (resource === 'calendar') {
      if (action === 'list') {
        let result = await client.listOnCallCalendars({
          nextUrl: ctx.input.nextUrl,
          page: ctx.input.page,
          perPage: ctx.input.perPage
        });
        let calendars = (result.data || []).map(mapCalendar);
        return {
          output: {
            calendars,
            hasMore: !!result.pagination?.next,
            nextUrl: result.pagination?.next ?? undefined
          },
          message: `Found **${calendars.length}** on-call calendar(s).`
        };
      }

      if (action === 'get') {
        if (!resourceId) throw createApiServiceError('resourceId is required');
        let result = await client.getOnCallCalendar(resourceId);
        return {
          output: { calendar: mapCalendar(result.data || result) },
          message: `On-call calendar retrieved.`
        };
      }

      if (action === 'delete') {
        if (!resourceId) throw createApiServiceError('resourceId is required');
        await client.deleteOnCallCalendar(resourceId);
        return {
          output: { deleted: true },
          message: `On-call calendar **${resourceId}** deleted.`
        };
      }

      let body: Record<string, unknown> = {};
      if (ctx.input.name) body.name = ctx.input.name;

      let result: ResourceResponse;
      if (action === 'create') {
        requireFields(ctx.input.name);
        result = await client.createOnCallCalendar(body);
      } else {
        if (!resourceId) throw createApiServiceError('resourceId is required');
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
        nextUrl: ctx.input.nextUrl,
        page: ctx.input.page,
        perPage: ctx.input.perPage
      });
      let policies = (result.data || []).map(mapPolicy);
      return {
        output: {
          policies,
          hasMore: !!result.pagination?.next,
          nextUrl: result.pagination?.next ?? undefined
        },
        message: `Found **${policies.length}** escalation policy(ies).`
      };
    }

    if (action === 'get') {
      if (!resourceId) throw createApiServiceError('resourceId is required');
      let result = await client.getEscalationPolicy(resourceId);
      return {
        output: { policy: mapPolicy(result.data || result) },
        message: `Escalation policy retrieved.`
      };
    }

    if (action === 'delete') {
      if (!resourceId) throw createApiServiceError('resourceId is required');
      await client.deleteEscalationPolicy(resourceId);
      return {
        output: { deleted: true },
        message: `Escalation policy **${resourceId}** deleted.`
      };
    }

    let body: Record<string, unknown> = {};
    if (ctx.input.name) body.name = ctx.input.name;
    if (ctx.input.repeatCount !== undefined) body.repeat_count = ctx.input.repeatCount;
    if (ctx.input.repeatDelay !== undefined) body.repeat_delay = ctx.input.repeatDelay;
    if (ctx.input.steps) body.steps = ctx.input.steps;

    let result: ResourceResponse;
    if (action === 'create') {
      requireFields(ctx.input.name);
      result = await client.createEscalationPolicy(body);
    } else {
      if (!resourceId) throw createApiServiceError('resourceId is required');
      result = await client.updateEscalationPolicy(resourceId, body);
    }
    return {
      output: { policy: mapPolicy(result.data || result) },
      message: `Escalation policy ${action === 'create' ? 'created' : 'updated'}.`
    };
  })
  .build();
