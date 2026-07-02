import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { memberSchema } from '../lib/types';
import { spec } from '../spec';

export let manageMemberPlan = SlateTool.create(spec, {
  name: 'Manage Member Plan',
  key: 'manage_member_plan',
  description: `Add or remove a free plan from a member. Use this to assign new free plans or revoke existing free plan connections for a given member.`,
  constraints: [
    'Only free plans can be added or removed via the Admin API. Paid plan subscriptions must be managed through Stripe checkout flows.'
  ]
})
  .input(
    z.object({
      memberId: z.string().describe('The member ID (e.g. mem_abc123)'),
      planId: z.string().describe('The plan ID (e.g. pln_abc123) to add or remove'),
      action: z.enum(['add', 'remove']).describe('Whether to add or remove the plan')
    })
  )
  .output(memberSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let member: Awaited<ReturnType<typeof client.addPlanToMember>>;

    if (ctx.input.action === 'add') {
      member = await client.addPlanToMember(ctx.input.memberId, ctx.input.planId);
    } else {
      member = await client.removePlanFromMember(ctx.input.memberId, ctx.input.planId);
    }

    return {
      output: member,
      message: `${ctx.input.action === 'add' ? 'Added' : 'Removed'} plan **${ctx.input.planId}** ${ctx.input.action === 'add' ? 'to' : 'from'} member **${member.memberId}**`
    };
  })
  .build();
