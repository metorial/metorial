import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let listMembersTool = SlateTool.create(spec, {
  name: 'List Members',
  key: 'list_members',
  description: `List members of the Sentry organization. Optionally search by name or email.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().optional().describe('Search by name or email'),
      cursor: z.string().optional().describe('Pagination cursor')
    })
  )
  .output(
    z.object({
      members: z.array(
        z.object({
          memberId: z.string(),
          email: z.string(),
          name: z.string().optional(),
          role: z.string().optional(),
          roleName: z.string().optional(),
          pending: z.boolean().optional(),
          expired: z.boolean().optional(),
          dateCreated: z.string().optional(),
          inviteStatus: z.string().optional(),
          teams: z.array(z.string()).optional().describe('Team slugs the member belongs to')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let members = await client.listMembers({
      query: ctx.input.query,
      cursor: ctx.input.cursor
    });

    let mapped = (members || []).map((m: any) => ({
      memberId: String(m.id),
      email: m.email || '',
      name: m.name,
      role: m.role,
      roleName: m.roleName,
      pending: m.pending,
      expired: m.expired,
      dateCreated: m.dateCreated,
      inviteStatus: m.inviteStatus,
      teams: (m.teams || []).map((t: any) => (typeof t === 'string' ? t : t.slug))
    }));

    return {
      output: { members: mapped },
      message: `Found **${mapped.length}** members${ctx.input.query ? ` matching "${ctx.input.query}"` : ''}.`
    };
  })
  .build();
