import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { HelloLeadsClient, readHelloLeadsString } from '../lib/client';
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

    let lists = result.map(list => {
      let listKey = readHelloLeadsString(list.list_key ?? list.key ?? list.id);
      if (!listKey?.trim()) {
        throw createApiServiceError('HelloLeads returned a list without an identifier.', {
          reason: 'helloleads_invalid_response'
        });
      }

      return {
        listKey,
        name: readHelloLeadsString(list.name) ?? ''
      };
    });

    return {
      output: {
        lists,
        count: lists.length
      },
      message: `Retrieved **${lists.length}** list(s) from HelloLeads.`
    };
  })
  .build();
