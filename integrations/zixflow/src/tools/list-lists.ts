import { SlateTool } from 'slates';
import { z } from 'zod';
import { ZixflowClient } from '../lib/client';
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

    if (ctx.input.listId) {
      let result = await client.getList(ctx.input.listId);
      let list = result.data;
      return {
        output: {
          lists: list
            ? [
                {
                  listId: list._id,
                  name: list.name,
                  slug: list.slug,
                  emoji: list.emoji,
                  collectionId: list.collectionId,
                  collectionName: list.collection?.name,
                  duplicationAllowed: list.duplicationAllowed
                }
              ]
            : []
        },
        message: list ? `Retrieved list: **${list.name}**.` : 'List not found.'
      };
    }

    let result = await client.getLists();
    let lists = (Array.isArray(result.data) ? result.data : []).map((list: any) => ({
      listId: list._id,
      name: list.name,
      slug: list.slug,
      emoji: list.emoji,
      collectionId: list.collectionId,
      collectionName: list.collection?.name,
      duplicationAllowed: list.duplicationAllowed
    }));

    return {
      output: { lists },
      message: `Found ${lists.length} list(s): ${lists.map((l: any) => l.name).join(', ')}.`
    };
  })
  .build();
