import { SlateTool } from 'slates';
import { z } from 'zod';
import { ConnecteamClient } from '../lib/client';
import { spec } from '../spec';

export let manageOnboarding = SlateTool.create(spec, {
  name: 'Manage Onboarding',
  key: 'manage_onboarding',
  description: `Manage onboarding packs: list available packs, view pack assignments, and assign users to onboarding packs. Part of the HR integration flow for employee onboarding.`,
  constraints: ['Up to 500 users per assignment request'],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['list_packs', 'get_assignments', 'assign_users'])
        .describe('Onboarding action to perform'),
      packId: z
        .number()
        .optional()
        .describe('Onboarding pack ID (for get_assignments, assign_users)'),
      userIds: z
        .array(z.number())
        .optional()
        .describe('User IDs to assign (for assign_users)'),
      limit: z.number().optional().describe('Results per page'),
      offset: z.number().optional().describe('Pagination offset')
    })
  )
  .output(
    z.object({
      result: z.any().describe('API response data')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ConnecteamClient({
      baseUrl: ctx.config.baseUrl,
      token: ctx.auth.token
    });

    let { action } = ctx.input;

    if (action === 'list_packs') {
      let result = await client.getOnboardingPacks({
        limit: ctx.input.limit,
        offset: ctx.input.offset
      });
      return {
        output: { result },
        message: `Retrieved onboarding packs.`
      };
    }

    if (action === 'get_assignments') {
      if (!ctx.input.packId) throw new Error('packId is required.');
      let result = await client.getPackAssignments(ctx.input.packId, {
        limit: ctx.input.limit,
        offset: ctx.input.offset
      });
      return {
        output: { result },
        message: `Retrieved assignments for pack **${ctx.input.packId}**.`
      };
    }

    if (action === 'assign_users') {
      if (!ctx.input.packId) throw new Error('packId is required.');
      if (!ctx.input.userIds) throw new Error('userIds is required.');
      let result = await client.assignUsersToPack(ctx.input.packId, {
        userIds: ctx.input.userIds
      });
      return {
        output: { result },
        message: `Assigned **${ctx.input.userIds.length}** user(s) to onboarding pack **${ctx.input.packId}**.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
