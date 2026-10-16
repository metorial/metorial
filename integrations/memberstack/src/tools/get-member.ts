import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { memberSchema } from '../lib/types';
import { spec } from '../spec';

export let getMember = SlateTool.create(spec, {
  name: 'Get Member',
  key: 'get_member',
  description: `Retrieve a single member's full details by their member ID or email address. Returns all member data including authentication info, custom fields, metadata, JSON data, permissions, and plan connections.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      memberIdOrEmail: z
        .string()
        .describe('The member ID (e.g. mem_abc123) or email address to look up'),
      includeTeams: z
        .boolean()
        .optional()
        .describe(
          'Include team memberships, roles, seat counts, invite tokens, and owner-plan details.'
        )
    })
  )
  .output(memberSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let member = await client.getMember(ctx.input.memberIdOrEmail, ctx.input.includeTeams);

    return {
      output: member,
      message: `Retrieved member **${member.auth.email}** (${member.memberId})`
    };
  })
  .build();
