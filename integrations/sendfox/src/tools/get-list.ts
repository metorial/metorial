import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getList = SlateTool.create(spec, {
  name: 'Get List',
  key: 'get_list',
  description: `Retrieve a contact list by ID, including subscriber count and engagement metrics (average open and click rates).`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      listId: z.number().describe('ID of the list to retrieve')
    })
  )
  .output(
    z.object({
      listId: z.number().describe('List ID'),
      name: z.string().describe('List name'),
      subscribedContactsCount: z.number().optional().describe('Number of subscribed contacts'),
      averageEmailOpenPercent: z.string().optional().describe('Average email open rate'),
      averageEmailClickPercent: z.string().optional().describe('Average email click rate'),
      createdAt: z.string().describe('Creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let list = await client.getList(ctx.input.listId);

    return {
      output: {
        listId: list.id,
        name: list.name,
        subscribedContactsCount: list.subscribed_contacts_count,
        averageEmailOpenPercent: list.average_email_open_percent,
        averageEmailClickPercent: list.average_email_click_percent,
        createdAt: list.created_at
      },
      message: `Retrieved list **${list.name}** (ID: ${list.id}, ${list.subscribed_contacts_count ?? 0} subscribers).`
    };
  })
  .build();
