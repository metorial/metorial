import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listTeamMembers = SlateTool.create(spec, {
  name: 'List Team Members',
  key: 'list_team_members',
  description:
    'List the people in your Bonsai account with their member IDs, user IDs, email addresses, and membership status.',
  instructions: [
    'Use a member email as assigneeEmail in create_task or ownerEmail in create_deal. Clients are not team members.'
  ],
  tags: { destructive: false, readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      members: z.array(
        z.object({
          memberId: z.string().describe('Member ID used by assignment endpoints'),
          userId: z.string().optional().describe('User ID used by task assignee filters'),
          name: z.string().optional(),
          email: z.string().optional(),
          role: z.string().optional().describe('Job title; does not determine permissions'),
          permissionProfile: z.string().optional(),
          status: z.string().describe('active, invited, declined, or deactivated')
        })
      ),
      totalCount: z.number()
    })
  )
  .handleInvocation(async ctx => {
    let members = await new Client(ctx.auth).listTeamMembers();
    return {
      output: { members, totalCount: members.length },
      message: `Found **${members.length}** team members.`
    };
  })
  .build();
