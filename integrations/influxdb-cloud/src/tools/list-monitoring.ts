import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let checkSchema = z
  .object({
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
  description: `List all monitoring checks in the organization. Checks query data and assign a status level (ok, info, warn, crit) based on specific conditions.
Supports threshold checks and deadman checks.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z.number().optional().describe('Maximum number of checks to return'),
      offset: z.number().optional().describe('Number of checks to skip for pagination')
    })
  )
  .output(
    z.object({
      checks: z.array(checkSchema).describe('List of checks')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let result = await client.listChecks({
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let checks = (result.checks || []).map((c: any) => ({
      checkId: c.id,
      name: c.name,
      type: c.type,
      status: c.status,
      description: c.description,
      orgId: c.orgID,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt
    }));

    return {
      output: { checks },
      message: `Found **${checks.length}** check(s).`
    };
  })
  .build();

export let listNotificationEndpoints = SlateTool.create(spec, {
  name: 'List Notification Endpoints',
  key: 'list_notification_endpoints',
  description: `List all notification endpoints in the organization. Notification endpoints define where alert messages are sent (HTTP, Slack, PagerDuty).`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z.number().optional().describe('Maximum number of endpoints to return'),
      offset: z.number().optional().describe('Number of endpoints to skip for pagination')
    })
  )
  .output(
    z.object({
      endpoints: z.array(notificationEndpointSchema).describe('List of notification endpoints')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let result = await client.listNotificationEndpoints({
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let endpoints = (result.notificationEndpoints || []).map((e: any) => ({
      endpointId: e.id,
      name: e.name,
      type: e.type,
      status: e.status,
      description: e.description,
      orgId: e.orgID,
      createdAt: e.createdAt,
      updatedAt: e.updatedAt
    }));

    return {
      output: { endpoints },
      message: `Found **${endpoints.length}** notification endpoint(s).`
    };
  })
  .build();

export let listNotificationRules = SlateTool.create(spec, {
  name: 'List Notification Rules',
  key: 'list_notification_rules',
  description: `List all notification rules in the organization. Notification rules check data in the statuses measurement and send messages to notification endpoints when conditions are met.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z.number().optional().describe('Maximum number of rules to return'),
      offset: z.number().optional().describe('Number of rules to skip for pagination')
    })
  )
  .output(
    z.object({
      rules: z.array(notificationRuleSchema).describe('List of notification rules')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let result = await client.listNotificationRules({
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let rules = (result.notificationRules || []).map((r: any) => ({
      ruleId: r.id,
      name: r.name,
      type: r.type,
      status: r.status,
      description: r.description,
      endpointId: r.endpointID,
      orgId: r.orgID,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt
    }));

    return {
      output: { rules },
      message: `Found **${rules.length}** notification rule(s).`
    };
  })
  .build();
