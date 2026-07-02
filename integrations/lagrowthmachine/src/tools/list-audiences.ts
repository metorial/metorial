import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listAudiences = SlateTool.create(spec, {
  name: 'List Audiences',
  key: 'list_audiences',
  description: `List all audiences in your La Growth Machine account. Returns audience details including ID, name, description, size, type, and source URL.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      audiences: z.array(z.any()).describe('List of audience records')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listAudiences();

    let audiences = Array.isArray(result) ? result : (result?.audiences ?? [result]);

    return {
      output: { audiences },
      message: `Retrieved **${audiences.length}** audience(s).`
    };
  })
  .build();
