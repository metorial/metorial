import { SlateTool } from 'slates';
import { z } from 'zod';
import { optionalString, requireArray, resource } from '../lib/client';
import { createClient, orgIdInput } from '../lib/helpers';
import { spec } from '../spec';

let checkSchema = z
  .object({
    raw: z.any().optional().describe('Complete provider resource'),
    checkId: z.string().describe('Unique check ID'),
    name: z.string().describe('Check name'),
    type: z.string().optional().describe('Check type (threshold or deadman)'),
    status: z.string().optional().describe('Check status'),
    description: z.string().optional().describe('Check description'),
    orgId: z.string().optional().describe('Organization ID'),
    createdAt: z.string().optional().describe('Creation timestamp'),
    updatedAt: z.string().optional().describe('Last update timestamp')
  })
  .passthrough();

let notificationEndpointSchema = z
  .object({
    raw: z.any().optional().describe('Complete provider resource'),
    endpointId: z.string().describe('Unique endpoint ID'),
    name: z.string().describe('Endpoint name'),
    type: z.string().optional().describe('Endpoint type (http, slack, or pagerduty)'),
    status: z.string().optional().describe('Endpoint status'),
    description: z.string().optional().describe('Endpoint description'),
    orgId: z.string().optional().describe('Organization ID'),
    createdAt: z.string().optional().describe('Creation timestamp'),
    updatedAt: z.string().optional().describe('Last update timestamp')
  })
  .passthrough();

let notificationRuleSchema = z
  .object({
    raw: z.any().optional().describe('Complete provider resource'),
    ruleId: z.string().describe('Unique rule ID'),
    name: z.string().describe('Rule name'),
    type: z.string().optional().describe('Rule type'),
    status: z.string().optional().describe('Rule status'),
    description: z.string().optional().describe('Rule description'),
    endpointId: z.string().optional().describe('Associated notification endpoint ID'),
    orgId: z.string().optional().describe('Organization ID'),
    createdAt: z.string().optional().describe('Creation timestamp'),
    updatedAt: z.string().optional().describe('Last update timestamp')
  })
  .passthrough();

export let listChecks = SlateTool.create(spec, {
  name: 'List Checks',
  key: 'list_checks',
  description: `List a page of monitoring checks in the organization. Checks query data and assign a status level (ok, info, warn, crit) based on specific conditions.
Supports threshold checks and deadman checks.`,
  instructions: ['Call list_organizations to discover orgId.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      orgId: orgIdInput,
      limit: z.number().optional().describe('Maximum number of checks to return'),
      offset: z.number().optional().describe('Number of checks to skip for pagination')
    })
  )
  .output(
    z.object({
      raw: z.any().optional().describe('Complete provider response'),
      checks: z.array(checkSchema).describe('List of checks')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let result = await client.listChecks({
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let checks = requireArray(result, 'checks').map((c: any) => ({
      raw: c,
      checkId: resource(c, ['id', 'name']).id,
      name: c.name,
      type: optionalString(c.type),
      status: optionalString(c.status),
      description: optionalString(c.description),
      orgId: optionalString(c.orgID),
      createdAt: optionalString(c.createdAt),
      updatedAt: optionalString(c.updatedAt)
    }));

    return {
      output: { checks, raw: result },
      message: `Found **${checks.length}** check(s).`
    };
  })
  .build();

export let listNotificationEndpoints = SlateTool.create(spec, {
  name: 'List Notification Endpoints',
  key: 'list_notification_endpoints',
  description: `List a page of notification endpoints in the organization. Notification endpoints define where alert messages are sent (HTTP, Slack, PagerDuty).`,
  instructions: ['Call list_organizations to discover orgId.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      orgId: orgIdInput,
      limit: z.number().optional().describe('Maximum number of endpoints to return'),
      offset: z.number().optional().describe('Number of endpoints to skip for pagination')
    })
  )
  .output(
    z.object({
      raw: z.any().optional().describe('Complete provider response'),
      endpoints: z.array(notificationEndpointSchema).describe('List of notification endpoints')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let result = await client.listNotificationEndpoints({
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let endpoints = requireArray(result, 'notificationEndpoints').map((e: any) => ({
      raw: e,
      endpointId: resource(e, ['id', 'name']).id,
      name: e.name,
      type: optionalString(e.type),
      status: optionalString(e.status),
      description: optionalString(e.description),
      orgId: optionalString(e.orgID),
      createdAt: optionalString(e.createdAt),
      updatedAt: optionalString(e.updatedAt)
    }));

    return {
      output: { endpoints, raw: result },
      message: `Found **${endpoints.length}** notification endpoint(s).`
    };
  })
  .build();

export let listNotificationRules = SlateTool.create(spec, {
  name: 'List Notification Rules',
  key: 'list_notification_rules',
  description: `List a page of notification rules in the organization. Notification rules check data in the statuses measurement and send messages to notification endpoints when conditions are met.`,
  instructions: ['Call list_organizations to discover orgId.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      orgId: orgIdInput,
      limit: z.number().optional().describe('Maximum number of rules to return'),
      offset: z.number().optional().describe('Number of rules to skip for pagination')
    })
  )
  .output(
    z.object({
      raw: z.any().optional().describe('Complete provider response'),
      rules: z.array(notificationRuleSchema).describe('List of notification rules')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let result = await client.listNotificationRules({
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let rules = requireArray(result, 'notificationRules').map((r: any) => ({
      raw: r,
      ruleId: resource(r, ['id', 'name']).id,
      name: r.name,
      type: optionalString(r.type),
      status: optionalString(r.status),
      description: optionalString(r.description),
      endpointId: optionalString(r.endpointID),
      orgId: optionalString(r.orgID),
      createdAt: optionalString(r.createdAt),
      updatedAt: optionalString(r.updatedAt)
    }));

    return {
      output: { rules, raw: result },
      message: `Found **${rules.length}** notification rule(s).`
    };
  })
  .build();
