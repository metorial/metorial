import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listMailingLists = SlateTool.create(spec, {
  name: 'List Mailing Lists',
  key: 'list_mailing_lists',
  description: `Retrieve all mailing lists configured in your Loops account. Returns each list's ID, name, description, and visibility. Useful for discovering list IDs needed when subscribing contacts to lists.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      mailingLists: z
        .array(
          z.object({
            mailingListId: z.string().describe('Unique ID of the mailing list'),
            name: z.string().describe('Name of the mailing list'),
            description: z.string().nullable().describe('Description of the mailing list'),
            isPublic: z.boolean().describe('Whether the list is publicly visible')
          })
        )
        .describe('All mailing lists on the account')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let lists = await client.listMailingLists();

    return {
      output: {
        mailingLists: lists.map(l => ({
          mailingListId: l.id,
          name: l.name,
          description: l.description,
          isPublic: l.isPublic
        }))
      },
      message: `Found **${lists.length}** mailing list(s).`
    };
  })
  .build();
