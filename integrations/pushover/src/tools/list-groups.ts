import { SlateTool } from 'slates';
import { z } from 'zod';
import { PushoverClient } from '../lib/client';
import { spec } from '../spec';

export let listGroups = SlateTool.create(spec, {
  name: 'List Groups',
  key: 'list_groups',
  description:
    'List delivery groups owned by the account or team that owns the application token. Use a returned groupKey with get_group, manage_group_members, or send_notification.',
  tags: { readOnly: true, destructive: false }
})
  .input(z.object({}))
  .output(
    z.object({
      groups: z.array(z.object({ groupKey: z.string(), name: z.string() })),
      requestId: z.string()
    })
  )
  .handleInvocation(async ctx => {
    let client = new PushoverClient(ctx.auth);
    let result = await client.listGroups();
    return {
      output: {
        groups: result.groups.map(group => ({ groupKey: group.group, name: group.name })),
        requestId: result.request
      },
      message: `Found ${result.groups.length} delivery group(s).`
    };
  })
  .build();
