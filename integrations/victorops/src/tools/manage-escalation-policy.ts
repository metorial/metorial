import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageEscalationPolicy = SlateTool.create(spec, {
  name: 'Manage Escalation Policy',
  key: 'manage_escalation_policy',
  description: `List, get, create, update, or delete escalation policies. Policies define the notification paths when incidents are triggered. You can also list policies for a specific team.`,
  instructions: [
    'Legacy timeout values are seconds and must be divisible by 60; use timeoutUnit="minutes" for whole minutes. Each step waits its timeout before executing its entries.',
    'Entry types include rotationGroup, user, policy, email, webhook, rotation_group_next and rotation_group_previous. The slug is the corresponding identifier, username or email address.',
    'Use timeout 0 for immediate paging in the first step.',
    'Deleting a policy also deletes routing keys that target only that policy. Updating steps replaces every existing step.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'create', 'update', 'delete', 'list_by_team'])
        .describe('Action to perform'),
      timeoutUnit: z
        .enum(['seconds', 'minutes'])
        .optional()
        .describe(
          'Default seconds preserves the original unit; the provider uses whole minutes'
        ),
      ignoreCustomPagingPolicies: z
        .boolean()
        .optional()
        .describe(
          'Ignore user custom paging rules; steps-only updates preserve the current setting'
        ),
      policySlug: z
        .string()
        .optional()
        .describe('Policy slug (required for get, update and delete)'),
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
              .describe(
                'Delay before executing this step, in timeoutUnit (default seconds; 0 = immediate)'
              ),
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
        .describe('Complete escalation steps (required for create and update)')
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
        let policies = data.policies;
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
        let policies = data.policies;
        return {
          output: { policies },
          message: `Found **${policies.length}** policy(ies) for team **${ctx.input.teamSlug}**.`
        };
      }

      case 'create': {
        let policy = await client.createEscalationPolicy({
          name: ctx.input.name ?? '',
          teamId: ctx.input.teamSlug ?? '',
          steps: ctx.input.steps ?? [],
          timeoutUnit: ctx.input.timeoutUnit,
          ignoreCustomPagingPolicies: ctx.input.ignoreCustomPagingPolicies
        });
        return {
          output: { policy },
          message: `Created escalation policy **${ctx.input.name}**.`
        };
      }

      case 'update': {
        const policy = await client.updateEscalationPolicy(ctx.input.policySlug ?? '', {
          steps: ctx.input.steps ?? [],
          timeoutUnit: ctx.input.timeoutUnit,
          ignoreCustomPagingPolicies: ctx.input.ignoreCustomPagingPolicies
        });
        return { output: { policy }, message: 'Replaced escalation policy steps.' };
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
