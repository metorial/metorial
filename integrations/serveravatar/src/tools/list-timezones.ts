import { SlateTool } from 'slates';
import { z } from 'zod';
import { ServerAvatarClient } from '../lib/client';
import { spec } from '../spec';

export let listTimezones = SlateTool.create(spec, {
  name: 'List Timezones',
  key: 'list_timezones',
  description:
    'List timezone identifiers and their display labels for server settings and application creation.',
  tags: { destructive: false, readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      timezones: z
        .record(z.string(), z.string())
        .describe('Timezone identifiers mapped to display labels')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ServerAvatarClient({ token: ctx.auth.token });
    let timezones = await client.listTimezones();
    return {
      output: { timezones },
      message: `Found **${Object.keys(timezones).length}** timezone(s).`
    };
  })
  .build();
