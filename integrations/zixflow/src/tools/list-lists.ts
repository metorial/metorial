import { SlateTool } from 'slates';
import { z } from 'zod';
import { ZixflowClient } from '../lib/client';
import { providerRecords, providerString } from '../lib/response';
import { spec } from '../spec';

export let listLists = SlateTool.create(spec, {
  name: 'List Lists',
  key: 'list_lists',
  description: `Retrieve all lists in the workspace or get details for a specific list. Lists are organizational structures for grouping CRM records with additional attributes. Returns each list's ID, name, emoji, parent collection, and duplication settings.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      listId: z
        .string()
        .optional()
        .describe('Specific list ID to retrieve details for. If omitted, returns all lists.')
    })
  )
  .output(
    z.object({
      raw: z.unknown().optional().describe('Complete response returned by Zixflow'),
      lists: z
        .array(
          z.object({
            listId: z.string().describe('List ID'),
            name: z.string().describe('List name'),
            slug: z.string().describe('List slug'),
            emoji: z.string().optional().describe('List emoji'),
            collectionId: z.string().optional().describe('Parent collection ID'),
            collectionName: z.string().optional().describe('Parent collection name'),
            duplicationAllowed: z
              .boolean()
              .optional()
              .describe('Whether duplicate records are allowed')
          })
        )
        .describe('List of lists')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ZixflowClient({ token: ctx.auth.token });

    let result = ctx.input.listId
      ? await client.getList(ctx.input.listId)
      : await client.getLists();
    let data = ctx.input.listId
      ? result.data === null
        ? []
        : providerRecords([result.data])
      : providerRecords(result.data);
    let lists = data.map(list => ({
      listId: providerString(list._id, 'list ID'),
      name: providerString(list.name, 'list name'),
      slug: providerString(list.slug, 'list slug'),
      emoji: typeof list.emoji === 'string' ? list.emoji : undefined,
      collectionId: typeof list.collectionId === 'string' ? list.collectionId : undefined,
      collectionName:
        typeof list.collection?.name === 'string' ? list.collection.name : undefined,
      duplicationAllowed:
        typeof list.duplicationAllowed === 'boolean' ? list.duplicationAllowed : undefined
    }));
    return {
      output: { lists, raw: result },
      message: `Retrieved ${lists.length} list(s).`
    };
  })
  .build();
