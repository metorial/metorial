import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listGroups = SlateTool.create(spec, {
  name: 'List Groups',
  key: 'list_groups',
  description:
    'List groups where the API-key user has an active membership. Use the group IDs with discussion, poll, and membership tools. Includes parent groups, subgroups, and subscription status.',
  tags: { destructive: false, readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      groups: z.array(
        z.object({
          groupId: z.number(),
          groupKey: z.string(),
          name: z.string(),
          handle: z.string().optional(),
          fullName: z.string().optional(),
          parentId: z.number().optional(),
          enabled: z.boolean().optional(),
          membershipsCount: z.number().optional()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, baseUrl: ctx.config.baseUrl });
    let result = await client.listGroups();
    let groups = result.groups.map(group => ({
      groupId: group.id,
      groupKey: group.key,
      name: group.name,
      handle: group.handle ?? undefined,
      fullName: group.full_name ?? undefined,
      parentId: group.parent_id ?? undefined,
      enabled: group.enabled ?? undefined,
      membershipsCount: group.memberships_count ?? undefined
    }));
    return { output: { groups }, message: `Found ${groups.length} group(s).` };
  })
  .build();
