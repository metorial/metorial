import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listLists = SlateTool.create(spec, {
  name: 'List Calling Lists',
  key: 'list_lists',
  description: `Retrieve all calling lists in the GoDial account. Lists are the primary organizational unit for contacts — every contact belongs to a list. Use this to discover available lists and their IDs before adding contacts or retrieving contacts from a specific list.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      lists: z.array(z.any()).describe('Array of calling lists')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let lists = await client.getLists();

    return {
      output: { lists },
      message: `Retrieved **${Array.isArray(lists) ? lists.length : 0}** calling list(s).`
    };
  })
  .build();
