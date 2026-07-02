import { SlateTool } from 'slates';
import { z } from 'zod';
import { AffinityClient } from '../lib/client';
import { spec } from '../spec';

let listEntrySchema = z.object({
  listEntryId: z.number().describe('Unique identifier of the list entry'),
  listId: z.number().describe('ID of the list'),
  entityId: z.number().describe('ID of the entity (person, organization, or opportunity)'),
  entityType: z.number().describe('Type of entity (0=person, 1=organization, 8=opportunity)'),
  creatorId: z.number().nullable().describe('ID of the user who added this entry'),
  createdAt: z.string().nullable().describe('When the entry was created')
});

export let getListEntries = SlateTool.create(spec, {
  name: 'Get List Entries',
  key: 'get_list_entries',
  description: `Retrieve entries from a specific Affinity list. Each entry represents a person, organization, or opportunity added to the list. Use this to see what entities belong to a given list.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      listId: z.number().describe('ID of the list to retrieve entries from'),
      pageSize: z.number().optional().describe('Number of results per page'),
      pageToken: z.string().optional().describe('Token for fetching the next page')
    })
  )
  .output(
    z.object({
      entries: z.array(listEntrySchema).describe('List entries'),
      nextPageToken: z
        .string()
        .nullable()
        .describe('Token for the next page, null if no more results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AffinityClient(ctx.auth.token);

    let result = await client.getListEntries(ctx.input.listId, {
      pageSize: ctx.input.pageSize,
      pageToken: ctx.input.pageToken
    });

    let entries = (result.list_entries ?? result ?? []).map((e: any) => ({
      listEntryId: e.id,
      listId: e.list_id,
      entityId: e.entity_id,
      entityType: e.entity_type,
      creatorId: e.creator_id ?? null,
      createdAt: e.created_at ?? null
    }));

    return {
      output: {
        entries,
        nextPageToken: result.next_page_token ?? null
      },
      message: `Retrieved **${entries.length}** list entries from list ${ctx.input.listId}.`
    };
  })
  .build();
