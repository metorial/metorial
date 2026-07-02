import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageRoutingKeys = SlateTool.create(spec, {
  name: 'Manage Routing Keys',
  key: 'manage_routing_keys',
  description: `List all routing keys with their associated teams, or create a new routing key with escalation policy mappings. Routing keys connect incoming alerts to the appropriate escalation policies and teams.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['list', 'create']).describe('Action to perform'),
      routingKey: z
        .string()
        .optional()
        .describe('Name of the routing key (required for create)'),
      targets: z
        .array(
          z.object({
            policySlug: z.string().describe('Escalation policy slug to route to')
          })
        )
        .optional()
        .describe('Policy targets for the routing key (required for create)')
    })
  )
  .output(
    z.object({
      routingKeys: z
        .array(z.any())
        .optional()
        .describe('List of routing keys with their team associations'),
      routingKeyCreated: z.any().optional().describe('Details of the created routing key')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      apiId: ctx.auth.apiId,
      token: ctx.auth.token
    });

    switch (ctx.input.action) {
      case 'list': {
        let data = await client.listRoutingKeys();
        let routingKeys = data?.routingKeys ?? [];
        return {
          output: { routingKeys },
          message: `Found **${routingKeys.length}** routing key(s).`
        };
      }

      case 'create': {
        let targets = (ctx.input.targets ?? []).map(t => ({
          policySlug: t.policySlug,
          _type: 'policyRouting'
        }));
        let result = await client.createRoutingKey({
          routingKey: ctx.input.routingKey ?? '',
          targets
        });
        return {
          output: { routingKeyCreated: result },
          message: `Created routing key **${ctx.input.routingKey}**.`
        };
      }
    }
  })
  .build();
