import { SlateTool } from 'slates';
import { z } from 'zod';
import { AdminClient } from '../lib/admin-client';
import { spec } from '../spec';

export let getTeamMembers = SlateTool.create(spec, {
  name: 'Get Team Members',
  key: 'get_team_members',
  description:
    'DEPRECATED — use `list_team_members` instead. Retrieve team members using the legacy numeric-ID contract. Current Cursor responses use encoded user IDs.',
  instructions: ['Use list_team_members for current encoded member IDs.'],
  tags: {
    deprecated: true,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      members: z.array(
        z.object({
          memberId: z.number().describe('Numeric team member ID'),
          email: z.string().describe('Member email address'),
          name: z.string().describe('Member display name'),
          role: z.string().describe('Member role: owner or member'),
          isRemoved: z.boolean().describe('Whether the member has been removed from the team')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new AdminClient({ token: ctx.auth.token });
    let result = await client.getTeamMembers();

    let members = result.teamMembers.map(m => ({
      memberId: m.id,
      email: m.email,
      name: m.name,
      role: m.role,
      isRemoved: m.isRemoved
    }));

    let activeCount = members.filter(m => !m.isRemoved).length;

    return {
      output: { members },
      message: `Found **${activeCount}** active team member(s) (${members.length} total including removed).`
    };
  })
  .build();
