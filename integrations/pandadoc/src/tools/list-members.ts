import { SlateTool } from 'slates';
import { z } from 'zod';
import { PandaDocClient } from '../lib/client';
import { spec } from '../spec';

export let listMembers = SlateTool.create(spec, {
  name: 'List Workspace Members',
  key: 'list_members',
  description: `List all members in the current PandaDoc workspace, including their roles and contact info.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      members: z
        .array(
          z.object({
            memberId: z.string().describe('Member/user UUID'),
            email: z.string().describe('Member email'),
            firstName: z.string().optional().describe('First name'),
            lastName: z.string().optional().describe('Last name'),
            membershipId: z.string().optional().describe('Workspace membership ID'),
            isActive: z.boolean().optional().describe('Whether the member is active')
          })
        )
        .describe('List of workspace members')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PandaDocClient({
      token: ctx.auth.token,
      authType: ctx.auth.authType
    });

    let result = await client.listMembers();

    let members = (result.results || result || []).map((m: any) => ({
      memberId: m.user_id || m.id,
      email: m.email,
      firstName: m.first_name,
      lastName: m.last_name,
      membershipId: m.membership_id,
      isActive: m.is_active
    }));

    return {
      output: { members },
      message: `Found **${members.length}** workspace member(s).`
    };
  })
  .build();
