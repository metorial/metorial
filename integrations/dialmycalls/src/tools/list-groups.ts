import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listGroups = SlateTool.create(spec, {
  name: 'List Groups',
  key: 'list_groups',
  description: `Retrieve all contact groups from your DialMyCalls account. Groups organize contacts for targeted broadcast messaging.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      range: z.string().optional().describe('Pagination range, e.g. "records=201-300"')
    })
  )
  .output(
    z.object({
      groups: z.array(
        z.object({
          groupId: z.string().optional(),
          name: z.string().optional(),
          contactsCount: z.number().optional(),
          createdAt: z.string().optional(),
          updatedAt: z.string().optional()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let rawGroups = await client.listGroups(ctx.input.range);

    let groups = rawGroups.map(g => ({
      groupId: g.id,
      name: g.name,
      contactsCount: g.contacts_count,
      createdAt: g.created_at,
      updatedAt: g.updated_at
    }));

    return {
      output: { groups },
      message: `Retrieved **${groups.length}** group(s).`
    };
  })
  .build();
