import { SlateTool } from 'slates';
import { z } from 'zod';
import { FindymailClient } from '../lib/client';
import { spec } from '../spec';

export let getContactLists = SlateTool.create(spec, {
  name: 'Get Contact Lists',
  key: 'get_contact_lists',
  description: `Retrieve all saved contact lists from your Findymail account. Useful for managing and organizing your enriched contacts and leads.`,
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
            listId: z.string().optional().describe('Unique identifier for the list.'),
            name: z.string().optional().describe('Name of the contact list.'),
            contactCount: z.number().optional().describe('Number of contacts in the list.'),
            createdAt: z.string().optional().describe('When the list was created.')
          })
        )
        .describe('All contact lists in the account.'),
      totalLists: z.number().describe('Total number of contact lists.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FindymailClient({ token: ctx.auth.token });

    let result = await client.getContactLists();

    let lists = result?.lists ?? (Array.isArray(result) ? result : []);
    let mapped = lists.map((l: any) => ({
      listId: l?.id?.toString() ?? l?.list_id?.toString() ?? undefined,
      name: l?.name ?? undefined,
      contactCount: l?.contact_count ?? l?.contactCount ?? l?.count ?? undefined,
      createdAt: l?.created_at ?? l?.createdAt ?? undefined
    }));

    return {
      output: {
        lists: mapped,
        totalLists: mapped.length
      },
      message:
        mapped.length > 0
          ? `Found **${mapped.length}** contact list(s).`
          : `No contact lists found.`
    };
  })
  .build();
