import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listLists = SlateTool.create(spec, {
  name: 'List Lists',
  key: 'list_lists',
  description: `Retrieve all contact lists in your Campayn account. Returns each list's name, tags, and contact count.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      lists: z.array(
        z.object({
          listId: z.string().describe('Unique identifier for the list'),
          listName: z.string().describe('Name of the list'),
          tags: z.string().describe('Tags associated with the list'),
          contactCount: z.number().describe('Number of contacts in the list')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let lists = await client.getLists();

    let mapped = lists.map(l => ({
      listId: l.id,
      listName: l.list_name,
      tags: l.tags,
      contactCount: l.contact_count
    }));

    return {
      output: { lists: mapped },
      message: `Found **${mapped.length}** contact list(s).`
    };
  })
  .build();
