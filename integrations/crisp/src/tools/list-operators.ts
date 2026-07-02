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
            userId: z.string().describe('Operator user ID'),
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
    let client = new Client({ token: ctx.auth.token, websiteId: ctx.config.websiteId });
    let results = await client.listOperators();

    let operators = (results || []).map((o: any) => ({
      userId: o.user_id,
      email: o.email,
      nickname: o.nickname,
      avatar: o.avatar,
      role: o.role,
      availability: o.availability
    }));

    return {
      output: { operators },
      message: `Found **${operators.length}** operators in the workspace.`
    };
  })
  .build();
