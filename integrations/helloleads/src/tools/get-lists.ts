import { SlateTool } from 'slates';
import { z } from 'zod';
import { HelloLeadsClient } from '../lib/client';
import { spec } from '../spec';

let listSchema = z.object({
  listKey: z.string().describe('Unique key identifier for the list'),
  name: z.string().describe('Display name of the list')
});

export let getLists = SlateTool.create(spec, {
  name: 'Get Lists',
  key: 'get_lists',
  description: `Retrieve all lead lists from HelloLeads CRM. Lists are logical collections used to categorize leads by source, geography, timelines, or other criteria. Use the returned list keys when creating leads to assign them to a specific list.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      lists: z.array(listSchema).describe('Available lead lists'),
      count: z.number().describe('Number of lists returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HelloLeadsClient({
      token: ctx.auth.token,
      email: ctx.auth.email
    });

    let result = await client.listLists();

    let rawLists = Array.isArray(result) ? result : (result?.data ?? result?.lists ?? []);

    let lists = (rawLists as any[]).map((list: any) => ({
      listKey: String(list.list_key ?? list.key ?? list.id ?? ''),
      name: String(list.name ?? '')
    }));

    return {
      output: {
        lists,
        count: lists.length
      },
      message: `Retrieved **${lists.length}** list(s) from HelloLeads.`
    };
  })
  .build();
