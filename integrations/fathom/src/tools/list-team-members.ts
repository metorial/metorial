import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listTeamMembers = SlateTool.create(spec, {
  key: 'list_team_members',
  name: 'List Team Members',
  description:
    'List a page of accessible team members, optionally filtered by a team name from list_teams. Omit team to discover recorder email addresses across accessible teams.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      team: z.string().optional().describe('Team name returned by list_teams'),
      cursor: z.string().optional().describe('Cursor from the previous page')
    })
  )
  .output(
    z.object({
      members: z.array(
        z.object({
          name: z.string().describe('Team member name'),
          email: z
            .string()
            .describe('Team member email, usable as a recordedBy filter in list_meetings'),
          createdAt: z.string().describe('Creation time in ISO 8601 format'),
          raw: z.unknown().optional().describe('Original team member')
        })
      ),
      nextCursor: z.string().nullable().describe('Next page cursor, or null at the end')
    })
  )
  .handleInvocation(async ctx => {
    let page = await new Client(ctx.auth).listTeamMembers(ctx.input.team, ctx.input.cursor);
    return {
      output: {
        members: page.items.map(member => ({
          name: member.name,
          email: member.email,
          createdAt: member.created_at,
          raw: member
        })),
        nextCursor: page.next_cursor
      },
      message: `Found **${page.items.length}** team member(s).${page.next_cursor === null ? '' : ' More results are available.'}`
    };
  })
  .build();
