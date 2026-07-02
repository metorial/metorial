import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let listSchema = z.object({
  listId: z.string().describe('List ID'),
  name: z.string().describe('List name'),
  contactCount: z.number().describe('Number of contacts in the list')
});

export let getLists = SlateTool.create(spec, {
  name: 'Get Contact Lists',
  key: 'get_lists',
  description: `Retrieve all contact lists in your SendGrid Marketing account with their names and contact counts.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      pageSize: z.number().optional().describe('Number of lists per page (max 1000)'),
      pageToken: z.string().optional().describe('Pagination token for next page')
    })
  )
  .output(
    z.object({
      lists: z.array(listSchema).describe('Contact lists'),
      nextPageToken: z.string().optional().describe('Token for next page, if available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, region: ctx.config.region });
    let result = await client.getLists(ctx.input.pageSize, ctx.input.pageToken);

    let lists = (result.result || []).map((l: any) => ({
      listId: l.id,
      name: l.name,
      contactCount: l.contact_count || 0
    }));

    return {
      output: {
        lists,
        nextPageToken: result._metadata?.next || undefined
      },
      message: `Retrieved **${lists.length}** contact list(s).`
    };
  })
  .build();

export let createList = SlateTool.create(spec, {
  name: 'Create Contact List',
  key: 'create_list',
  description: `Create a new contact list for organizing contacts in SendGrid Marketing.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Name for the new list')
    })
  )
  .output(listSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, region: ctx.config.region });
    let result = await client.createList(ctx.input.name);

    return {
      output: {
        listId: result.id,
        name: result.name,
        contactCount: result.contact_count || 0
      },
      message: `Created list **${result.name}** (ID: ${result.id}).`
    };
  })
  .build();

export let updateList = SlateTool.create(spec, {
  name: 'Update Contact List',
  key: 'update_list',
  description: `Rename an existing contact list.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      listId: z.string().describe('List ID to update'),
      name: z.string().describe('New name for the list')
    })
  )
  .output(listSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, region: ctx.config.region });
    let result = await client.updateList(ctx.input.listId, ctx.input.name);

    return {
      output: {
        listId: result.id,
        name: result.name,
        contactCount: result.contact_count || 0
      },
      message: `Renamed list to **${result.name}** (ID: ${result.id}).`
    };
  })
  .build();

export let deleteList = SlateTool.create(spec, {
  name: 'Delete Contact List',
  key: 'delete_list',
  description: `Delete a contact list. Optionally also delete the contacts that belong to the list.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      listId: z.string().describe('List ID to delete'),
      deleteContacts: z.boolean().optional().describe('Also delete all contacts in the list')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the list was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, region: ctx.config.region });
    await client.deleteList(ctx.input.listId, ctx.input.deleteContacts);

    return {
      output: { success: true },
      message: `Deleted list ${ctx.input.listId}${ctx.input.deleteContacts ? ' and its contacts' : ''}.`
    };
  })
  .build();

export let manageListContacts = SlateTool.create(spec, {
  name: 'Manage List Contacts',
  key: 'manage_list_contacts',
  description: `Add or remove contacts from a contact list. Provide contact IDs to add or remove.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      listId: z.string().describe('List ID to modify'),
      action: z.enum(['add', 'remove']).describe('Whether to add or remove contacts'),
      contactIds: z.array(z.string()).describe('Contact IDs to add or remove')
    })
  )
  .output(
    z.object({
      jobId: z.string().optional().describe('Async job ID for tracking the operation'),
      success: z.boolean().describe('Whether the operation was accepted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, region: ctx.config.region });

    if (ctx.input.action === 'add') {
      let result = await client.addContactsToList(ctx.input.listId, ctx.input.contactIds);
      return {
        output: { jobId: result.job_id || undefined, success: true },
        message: `Added **${ctx.input.contactIds.length}** contact(s) to list ${ctx.input.listId}.`
      };
    } else {
      await client.removeContactsFromList(ctx.input.listId, ctx.input.contactIds);
      return {
        output: { success: true },
        message: `Removed **${ctx.input.contactIds.length}** contact(s) from list ${ctx.input.listId}.`
      };
    }
  })
  .build();
