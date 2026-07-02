import { SlateTool } from 'slates';
import { z } from 'zod';
import { AffinityClient } from '../lib/client';
import { spec } from '../spec';

let listSchema = z.object({
  listId: z.number().describe('Unique identifier of the list'),
  name: z.string().describe('Name of the list'),
  type: z
    .number()
    .describe('Type of entities in this list (0=person, 1=organization, 8=opportunity)'),
  public: z.boolean().describe('Whether the list is publicly visible to all team members'),
  ownerId: z.number().nullable().describe('ID of the list owner'),
  creatorId: z.number().nullable().describe('ID of the user who created the list'),
  listSize: z.number().nullable().describe('Number of entries in the list')
});

export let getLists = SlateTool.create(spec, {
  name: 'Get Lists',
  key: 'get_lists',
  description: `Retrieve all lists in Affinity. Lists function as customizable spreadsheets for organizing people, organizations, or opportunities. Use this to discover available lists and their IDs for use with other tools.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      lists: z.array(listSchema).describe('All available lists')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AffinityClient(ctx.auth.token);

    let result = await client.getLists();
    let lists = (Array.isArray(result) ? result : []).map((l: any) => ({
      listId: l.id,
      name: l.name,
      type: l.type,
      public: l.public ?? false,
      ownerId: l.owner_id ?? null,
      creatorId: l.creator_id ?? null,
      listSize: l.list_size ?? null
    }));

    return {
      output: { lists },
      message: `Retrieved **${lists.length}** list(s).`
    };
  })
  .build();
