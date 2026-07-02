import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageEscalationPolicy = SlateTool.create(spec, {
  name: 'Manage Escalation Policy',
  key: 'manage_escalation_policy',
  description: `List, get, create, or delete escalation policies. Escalation policies define who is on-call and the multi-step notification paths when incidents are triggered. You can also list policies for a specific team.`,
  instructions: [
    'Each step has a timeout (in seconds) before escalating and one or more entries.',
    'Entry types include "rotationGroup", "user", or "policy" with the corresponding slug.',
    'Use timeout 0 for immediate paging in the first step.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'create', 'delete', 'list_by_team'])
        .describe('Action to perform'),
      policySlug: z.string().optional().describe('Policy slug (required for get and delete)'),
      teamSlug: z
        .string()
        .optional()
        .describe('Team slug (required for list_by_team and create)'),
      name: z.string().optional().describe('Policy name (required for create)'),
      steps: z
        .array(
          z.object({
            timeout: z
              .number()
              .describe('Seconds before escalating to next step (0 = immediate)'),
            entries: z
              .array(
                z.object({
                  type: z
                    .string()
                    .describe('Target type (e.g., "rotationGroup", "user", "policy")'),
                  slug: z.string().describe('Target slug identifier')
                })
              )
              .describe('Targets for this escalation step')
          })
        )
        .optional()
        .describe('Escalation steps (required for create)')
    })
  )
  .output(
    z.object({
      policies: z.array(z.any()).optional().describe('List of escalation policies'),
      policy: z.any().optional().describe('Escalation policy details')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      apiId: ctx.auth.apiId,
      token: ctx.auth.token
    });

    switch (ctx.input.action) {
      case 'list': {
        let data = await client.listEscalationPolicies();
        let policies = data?.policies ?? [];
        return {
          output: { policies },
          message: `Found **${policies.length}** escalation policy(ies).`
        };
      }

      case 'get': {
        let policy = await client.getEscalationPolicy(ctx.input.policySlug ?? '');
        return {
          output: { policy },
          message: `Retrieved escalation policy **${ctx.input.policySlug}**.`
        };
      }

      case 'list_by_team': {
        let data = await client.getTeamEscalationPolicies(ctx.input.teamSlug ?? '');
        let policies = data?.policies ?? [];
        return {
          output: { policies },
          message: `Found **${policies.length}** policy(ies) for team **${ctx.input.teamSlug}**.`
        };
      }

      case 'create': {
        let policy = await client.createEscalationPolicy({
          name: ctx.input.name ?? '',
          teamId: ctx.input.teamSlug ?? '',
          steps: ctx.input.steps ?? []
        });
        return {
          output: { policy },
          message: `Created escalation policy **${ctx.input.name}**.`
        };
      }

      case 'delete': {
        await client.deleteEscalationPolicy(ctx.input.policySlug ?? '');
        return {
          output: {},
          message: `Deleted escalation policy **${ctx.input.policySlug}**.`
        };
      }
    }
  })
  .build();
