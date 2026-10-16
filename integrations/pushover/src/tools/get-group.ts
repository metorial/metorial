import { SlateTool } from 'slates';
import { z } from 'zod';
import { PushoverClient } from '../lib/client';
import { groupKeySchema, groupMemberSchema } from '../lib/schemas';
import { spec } from '../spec';

export let getGroup = SlateTool.create(spec, {
  name: 'Get Group',
  key: 'get_group',
  description:
    'Read a delivery group and its members, device restrictions, memos, and disabled state. Call list_groups first to discover owned group keys. The application token must belong to the account or team owning the group.',
  tags: { readOnly: true, destructive: false }
})
  .input(z.object({ groupKey: groupKeySchema }))
  .output(
    z.object({
      groupKey: z.string(),
      groupName: z.string(),
      members: z.array(groupMemberSchema),
      requestId: z.string()
    })
  )
  .handleInvocation(async ctx => {
    let client = new PushoverClient(ctx.auth);
    let result = await client.getGroup(ctx.input.groupKey);
    return {
      output: {
        groupKey: ctx.input.groupKey,
        groupName: result.name,
        members: result.users.map(user => ({
          userKey: user.user,
          device: user.device ?? '',
          memo: user.memo ?? '',
          disabled: user.disabled,
          name: user.name,
          email: user.email
        })),
        requestId: result.request
      },
      message: `Group "${result.name}" has ${result.users.length} member(s).`
    };
  })
  .build();
