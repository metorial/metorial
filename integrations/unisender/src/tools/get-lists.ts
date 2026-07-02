import { SlateTool } from 'slates';
import { z } from 'zod';
import { UnisenderClient } from '../lib/client';
import { spec } from '../spec';

export let getLists = SlateTool.create(spec, {
  name: 'Get Contact Lists',
  key: 'get_lists',
  description: `Retrieve all subscription/contact lists in the account. Returns list IDs and titles, useful for identifying which lists to target for campaigns or subscriptions.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      lists: z
        .array(
          z.object({
            listId: z.number().describe('Unique ID of the list'),
            title: z.string().describe('Title/name of the list')
          })
        )
        .describe('All contact lists in the account')
    })
  )
  .handleInvocation(async ctx => {
    let client = new UnisenderClient({
      token: ctx.auth.token,
      locale: ctx.config.locale
    });

    let lists = await client.getLists();

    return {
      output: {
        lists: lists.map(l => ({
          listId: l.id,
          title: l.title
        }))
      },
      message: `Found **${lists.length}** contact list(s)`
    };
  })
  .build();
