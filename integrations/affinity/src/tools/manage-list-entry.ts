import { SlateTool } from 'slates';
import { z } from 'zod';
import { AffinityClient } from '../lib/client';
import { spec } from '../spec';

export let addListEntry = SlateTool.create(spec, {
  name: 'Add List Entry',
  key: 'add_list_entry',
  description: `Add an entity (person, organization, or opportunity) to an Affinity list. This creates a new list entry linking the entity to the list.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      listId: z.number().describe('ID of the list to add the entity to'),
      entityId: z
        .number()
        .describe('ID of the entity (person, organization, or opportunity) to add'),
      creatorId: z.number().optional().describe('ID of the user to attribute this addition to')
    })
  )
  .output(
    z.object({
      listEntryId: z.number().describe('ID of the created list entry'),
      listId: z.number().describe('ID of the list'),
      entityId: z.number().describe('ID of the entity'),
      entityType: z.number().describe('Type of entity'),
      createdAt: z.string().nullable().describe('When the entry was created')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AffinityClient(ctx.auth.token);

    let e = await client.createListEntry(ctx.input.listId, {
      entityId: ctx.input.entityId,
      creator_id: ctx.input.creatorId
    });

    return {
      output: {
        listEntryId: e.id,
        listId: e.list_id,
        entityId: e.entity_id,
        entityType: e.entity_type,
        createdAt: e.created_at ?? null
      },
      message: `Added entity ${ctx.input.entityId} to list ${ctx.input.listId} (entry ID: ${e.id}).`
    };
  })
  .build();

export let removeListEntry = SlateTool.create(spec, {
  name: 'Remove List Entry',
  key: 'remove_list_entry',
  description: `Remove an entity from an Affinity list by deleting its list entry. This does not delete the entity itself.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      listId: z.number().describe('ID of the list to remove the entry from'),
      listEntryId: z.number().describe('ID of the list entry to remove')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the removal was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AffinityClient(ctx.auth.token);

    await client.deleteListEntry(ctx.input.listId, ctx.input.listEntryId);

    return {
      output: {
        success: true
      },
      message: `Removed list entry **${ctx.input.listEntryId}** from list ${ctx.input.listId}.`
    };
  })
  .build();
