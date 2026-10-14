import { pickDefined, SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let updateUserKpi = SlateTool.create(spec, {
  name: 'Update User KPI Assignment',
  key: 'update_user_kpi',
  description:
    'Update the target override or display order for an existing user KPI assignment. Unspecified fields retain their current values. Use List User KPI Assignments to discover assignments.',
  instructions: [
    'The user target is only used when the KPI has a target. Set userTarget to null to clear the override.'
  ]
})
  .input(
    z.object({
      userId: z.number().describe('User ID from List Users'),
      kpiId: z.number().describe('KPI ID from List User KPI Assignments'),
      userTarget: z
        .number()
        .nullable()
        .optional()
        .describe('User-specific target override; null clears the override'),
      sortOrder: z.number().optional().describe('Display order on the KPI entry screen')
    })
  )
  .output(
    z.object({
      kpiId: z.number().describe('Assigned KPI identifier'),
      userId: z.number().describe('User identifier'),
      userTarget: z.number().nullable().describe('User-specific target override'),
      sortOrder: z.number().describe('Display order')
    })
  )
  .handleInvocation(async ctx => {
    let assignment = await createClient(ctx.config, ctx.auth).updateUserKpi(
      ctx.input.userId,
      ctx.input.kpiId,
      pickDefined({ user_target: ctx.input.userTarget, sort_order: ctx.input.sortOrder })
    );
    return {
      output: {
        kpiId: assignment.id,
        userId: assignment.user_id,
        userTarget: assignment.user_target ?? null,
        sortOrder: assignment.sort_order
      },
      message: `Updated KPI **${assignment.id}** assignment for user **${assignment.user_id}**.`
    };
  })
  .build();
