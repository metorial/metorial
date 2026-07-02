import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listTimezones = SlateTool.create(spec, {
  name: 'List Timezones',
  key: 'list_timezones',
  description: `Retrieves the full list of IANA timezone strings supported by Databox. Use a value from this list when creating or configuring a data source.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      timezones: z.array(z.string()).describe('List of supported IANA timezone strings')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let timezones = await client.listTimezones();

    return {
      output: {
        timezones
      },
      message: `Found **${timezones.length}** supported timezone(s).`
    };
  })
  .build();
