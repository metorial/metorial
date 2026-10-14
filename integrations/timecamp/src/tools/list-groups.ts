import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export const listGroups = SlateTool.create(spec, {
  key: 'list_groups',
  name: 'List Groups',
  description: 'List authorized TimeCamp groups with their IDs, names, and parent groups.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      groups: z.array(
        z.object({ groupId: z.string(), name: z.string(), parentId: z.string() })
      ),
      totalGroups: z.number()
    })
  )
  .handleInvocation(async ctx => {
    const records = await new Client({ token: ctx.auth.token }).getGroups();
    const groups = records.map(group => ({
      groupId: String(group.group_id ?? ''),
      name: String(group.name ?? ''),
      parentId: String(group.parent_id ?? 0)
    }));
    return {
      output: { groups, totalGroups: groups.length },
      message: `Retrieved **${groups.length}** groups.`
    };
  })
  .build();
