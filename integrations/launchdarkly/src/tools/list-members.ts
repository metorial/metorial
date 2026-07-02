import { SlateTool } from 'slates';
import { z } from 'zod';
import { LaunchDarklyClient } from '../lib/client';
import { spec } from '../spec';

export let listMembers = SlateTool.create(spec, {
  name: 'List Members',
  key: 'list_members',
  description: `List account members in your LaunchDarkly organization. Filter by role or search by name/email. Returns member details including roles and status.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z.number().optional().describe('Maximum number of members to return'),
      offset: z.number().optional().describe('Offset for pagination'),
      filter: z.string().optional().describe('Filter expression (e.g., role filter)'),
      sort: z.string().optional().describe('Sort field')
    })
  )
  .output(
    z.object({
      members: z.array(
        z.object({
          memberId: z.string().describe('Member ID'),
          email: z.string().describe('Member email'),
          firstName: z.string().optional().describe('First name'),
          lastName: z.string().optional().describe('Last name'),
          role: z
            .string()
            .describe('Built-in role (reader, writer, admin, or no_permissions)'),
          customRoles: z.array(z.string()).describe('Custom role keys'),
          pendingInvite: z.boolean().describe('Whether the member has a pending invite'),
          lastSeen: z.string().optional().describe('Last seen timestamp')
        })
      ),
      totalCount: z.number().describe('Total number of members')
    })
  )
  .handleInvocation(async ctx => {
    let client = new LaunchDarklyClient(ctx.auth.token);
    let result = await client.listMembers({
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      filter: ctx.input.filter,
      sort: ctx.input.sort
    });

    let items = result.items ?? [];
    let members = items.map((m: any) => ({
      memberId: m._id,
      email: m.email,
      firstName: m.firstName,
      lastName: m.lastName,
      role: m.role,
      customRoles: (m.customRoles ?? []).map((r: any) => (typeof r === 'string' ? r : r.key)),
      pendingInvite: m.pendingInvite ?? false,
      lastSeen: m.lastSeen ? String(m.lastSeen) : undefined
    }));

    return {
      output: {
        members,
        totalCount: result.totalCount ?? items.length
      },
      message: `Found **${result.totalCount ?? items.length}** account members.`
    };
  })
  .build();
