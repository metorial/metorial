import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listOperators = SlateTool.create(spec, {
  name: 'List Operators',
  key: 'list_operators',
  description: `List all operators (team members) of the Crisp workspace. Returns operator details including user ID, email, role, and availability. Useful for finding operator IDs to assign conversations.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      operators: z
        .array(
          z.object({
            userId: z.string().optional().describe('Operator user ID'),
            type: z
              .enum(['operator', 'invite', 'sandbox'])
              .optional()
              .describe('Operator membership type'),
            email: z.string().optional().describe('Operator email'),
            nickname: z.string().optional().describe('Operator display name'),
            avatar: z.string().optional().describe('Operator avatar URL'),
            role: z
              .string()
              .optional()
              .describe('Operator role (owner, admin, member, viewer)'),
            availability: z.string().optional().describe('Operator availability status')
          })
        )
        .describe('List of workspace operators')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      websiteId: ctx.config.websiteId,
      tier: ctx.auth.tier
    });
    let [results, availabilities] = await Promise.all([
      client.listOperators(),
      client.listOperatorAvailabilities()
    ]);
    let availabilityByUserId = new Map(
      (availabilities || []).map((availability: any) => [
        availability.user_id,
        availability.type
      ])
    );

    let operators = (results || []).map((o: any) => ({
      userId: o.details?.user_id,
      type: o.type,
      email: o.details?.email,
      nickname:
        [o.details?.first_name, o.details?.last_name].filter(Boolean).join(' ') ||
        o.details?.email,
      avatar: o.details?.avatar,
      role: o.details?.role,
      availability: o.details?.user_id
        ? availabilityByUserId.get(o.details.user_id)
        : undefined
    }));

    return {
      output: { operators },
      message: `Found **${operators.length}** operators in the workspace.`
    };
  })
  .build();
