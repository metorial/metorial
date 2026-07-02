import { SlateTool } from 'slates';
import { z } from 'zod';
import { TombaClient } from '../lib/client';
import { spec } from '../spec';

let leadListSchema = z.object({
  listId: z.string().nullable().optional().describe('Lead list ID'),
  name: z.string().nullable().optional().describe('List name'),
  favorite: z.boolean().nullable().optional().describe('Whether this list is favorited'),
  size: z.number().nullable().optional().describe('Number of leads in the list'),
  createdAt: z.string().nullable().optional().describe('Creation timestamp'),
  updatedAt: z.string().nullable().optional().describe('Last update timestamp')
});

let mapList = (l: any) => ({
  listId: l.id?.toString(),
  name: l.name,
  favorite: l.favorite,
  size: l.size,
  createdAt: l.created_at,
  updatedAt: l.updated_at
});

export let listLeadLists = SlateTool.create(spec, {
  name: 'List Lead Lists',
  key: 'list_lead_lists',
  description: `Retrieve all lead lists. Each list contains a collection of leads for campaign targeting.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      lists: z.array(leadListSchema).describe('All lead lists')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TombaClient({
      apiKey: ctx.auth.apiKey,
      apiSecret: ctx.auth.apiSecret
    });

    let result = await client.listLeadLists();
    let data = result.data || result;
    let lists = Array.isArray(data) ? data : data.leads_lists || data.lists || [];

    return {
      output: {
        lists: lists.map(mapList)
      },
      message: `Retrieved **${lists.length}** lead lists.`
    };
  })
  .build();

export let createLeadList = SlateTool.create(spec, {
  name: 'Create Lead List',
  key: 'create_lead_list',
  description: `Create a new lead list for organizing leads into groups for campaign targeting. List names must be unique.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Name for the new lead list')
    })
  )
  .output(leadListSchema)
  .handleInvocation(async ctx => {
    let client = new TombaClient({
      apiKey: ctx.auth.apiKey,
      apiSecret: ctx.auth.apiSecret
    });

    let result = await client.createLeadList(ctx.input.name);
    let data = result.data || result;

    return {
      output: mapList(data),
      message: `Created lead list **${ctx.input.name}**.`
    };
  })
  .build();

export let updateLeadList = SlateTool.create(spec, {
  name: 'Update Lead List',
  key: 'update_lead_list',
  description: `Update the name of an existing lead list.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      listId: z.string().describe('The lead list ID to update'),
      name: z.string().describe('New name for the lead list')
    })
  )
  .output(leadListSchema)
  .handleInvocation(async ctx => {
    let client = new TombaClient({
      apiKey: ctx.auth.apiKey,
      apiSecret: ctx.auth.apiSecret
    });

    let result = await client.updateLeadList(ctx.input.listId, ctx.input.name);
    let data = result.data || result;

    return {
      output: mapList(data),
      message: `Updated lead list **${ctx.input.listId}** to name **${ctx.input.name}**.`
    };
  })
  .build();

export let deleteLeadList = SlateTool.create(spec, {
  name: 'Delete Lead List',
  key: 'delete_lead_list',
  description: `Delete a lead list by its ID. **Warning:** This also deletes all leads in the list. This action is permanent.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      listId: z.string().describe('The lead list ID to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TombaClient({
      apiKey: ctx.auth.apiKey,
      apiSecret: ctx.auth.apiSecret
    });

    await client.deleteLeadList(ctx.input.listId);

    return {
      output: {
        success: true
      },
      message: `Deleted lead list **${ctx.input.listId}** and all its leads.`
    };
  })
  .build();
