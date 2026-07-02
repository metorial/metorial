import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let listMembersTool = SlateTool.create(spec, {
  name: 'List Project Members',
  key: 'list_members',
  description: `List members of a Crowdin project with their roles and permissions. Useful for finding user IDs for task assignments.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: z.number().describe('The project ID'),
      search: z.string().optional().describe('Search by name or email'),
      role: z.string().optional().describe('Filter by role'),
      limit: z.number().optional(),
      offset: z.number().optional()
    })
  )
  .output(
    z.object({
      members: z.array(
        z.object({
          memberId: z.number().describe('Member ID within the project'),
          userId: z.number().optional().describe('User ID'),
          username: z.string().optional().describe('Username'),
          fullName: z.string().optional().describe('Full name'),
          avatarUrl: z.string().optional().describe('Avatar URL'),
          role: z.string().optional().describe('Role in the project'),
          joinedAt: z.string().optional().describe('When the member joined')
        })
      ),
      pagination: z.object({
        offset: z.number(),
        limit: z.number()
      })
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let result = await client.listProjectMembers(ctx.input.projectId, {
      search: ctx.input.search,
      role: ctx.input.role,
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let members = result.data.map((item: any) => ({
      memberId: item.data.id,
      userId: item.data.userId || undefined,
      username: item.data.username || undefined,
      fullName: item.data.fullName || undefined,
      avatarUrl: item.data.avatarUrl || undefined,
      role: item.data.role || undefined,
      joinedAt: item.data.joinedAt || item.data.addedAt || undefined
    }));

    return {
      output: { members, pagination: result.pagination },
      message: `Found **${members.length}** project members.`
    };
  })
  .build();
