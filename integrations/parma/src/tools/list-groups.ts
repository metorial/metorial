import { SlateTool } from 'slates';
import { z } from 'zod';
import { ParmaClient } from '../lib/client';
import { spec } from '../spec';

export let listGroups = SlateTool.create(spec, {
  name: 'List Groups',
  key: 'list_groups',
  description:
    'List Parma relationship groups and their IDs. Call this before create_relationship to choose the required groupIds.',
  tags: { destructive: false, readOnly: true }
})
  .input(z.object({ query: z.string().optional().describe('Filter groups by name') }))
  .output(
    z.object({
      groups: z.array(z.object({ groupId: z.string(), name: z.string() }))
    })
  )
  .handleInvocation(async ctx => {
    let groups = await new ParmaClient(ctx.auth.token).listGroups(ctx.input.query);
    return {
      message: `Retrieved **${groups.length}** group(s).`,
      output: {
        groups: groups.map(group => ({ groupId: String(group.id), name: group.name }))
      }
    };
  })
  .build();
