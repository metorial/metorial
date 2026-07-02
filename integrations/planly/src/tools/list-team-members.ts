import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let memberSchema = z.object({
  userId: z.string().describe('Unique user identifier'),
  fullName: z.string().describe('Full name of the team member'),
  email: z.string().describe('Email address'),
  picture: z.string().nullable().optional().describe('Profile picture URL'),
  role: z.string().describe('Role in the team')
});

export let listTeamMembers = SlateTool.create(spec, {
  name: 'List Team Members',
  key: 'list_team_members',
  description: `List all members of a team, including their names, emails, and roles. Useful for team management operations like transferring ownership or removing users.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      teamId: z.string().describe('ID of the team to list members for')
    })
  )
  .output(
    z.object({
      members: z.array(memberSchema).describe('List of team members')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listTeamUsers(ctx.input.teamId);
    let users = result.data || result || [];
    let members = users.map((u: any) => ({
      userId: u.id,
      fullName: u.fullname || u.fullName || '',
      email: u.email || '',
      picture: u.picture || null,
      role: u.role || ''
    }));

    return {
      output: { members },
      message: `Found ${members.length} member(s) in the team.`
    };
  });
