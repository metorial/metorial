import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listMembers = SlateTool.create(spec, {
  name: 'List Members',
  key: 'list_members',
  description: `List all members of the PlanetScale organization. Returns member names, emails, roles, and join dates.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number for pagination'),
      perPage: z.number().optional().describe('Number of results per page')
    })
  )
  .output(
    z.object({
      members: z.array(
        z.object({
          memberId: z.string(),
          name: z.string().optional(),
          email: z.string().optional(),
          role: z.string().optional(),
          avatarUrl: z.string().optional(),
          createdAt: z.string().optional()
        })
      ),
      currentPage: z.number(),
      nextPage: z.number().nullable()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      authType: ctx.auth.authType,
      organization: ctx.config.organization
    });

    let result = await client.listMembers({
      page: ctx.input.page,
      perPage: ctx.input.perPage
    });

    let members = result.data.map((m: any) => ({
      memberId: m.id,
      name: m.display_name || m.name,
      email: m.email,
      role: m.role,
      avatarUrl: m.avatar_url,
      createdAt: m.created_at
    }));

    return {
      output: {
        members,
        currentPage: result.currentPage,
        nextPage: result.nextPage
      },
      message: `Found **${members.length}** member(s) in the organization.`
    };
  });
