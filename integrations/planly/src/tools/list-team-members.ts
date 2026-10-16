import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import {
  nullableString,
  rawSchema,
  requiredScalarString,
  requiredString,
  responseArray,
  responseData,
  responseRecord,
  teamIdSchema
} from '../lib/responses';
import { spec } from '../spec';

let memberSchema = z.object({
  userId: z.string().describe('Unique user identifier'),
  fullName: z.string().describe('Full name of the team member'),
  email: z.string().describe('Email address'),
  picture: z.string().nullable().optional().describe('Profile picture URL'),
  role: z.string().describe('Role in the team'),
  raw: rawSchema
});

export let listTeamMembers = SlateTool.create(spec, {
  name: 'List Team Members',
  key: 'list_team_members',
  description: `List all members of a team, including their names, emails, and roles. Useful for team management operations like transferring ownership or removing users. Call list_teams to discover the team ID.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      teamId: teamIdSchema
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
    let members = responseArray(responseData(result), 'team members').map(value => {
      let member = responseRecord(value, 'team member');
      return {
        userId: requiredString(member.id, 'member ID'),
        fullName: requiredString(member.fullname ?? member.fullName, 'member full name'),
        email: requiredString(member.email, 'member email'),
        picture: nullableString(member.picture),
        role: requiredScalarString(member.role, 'member role'),
        raw: member
      };
    });
    return { output: { members }, message: `Found ${members.length} member(s) in the team.` };
  });
