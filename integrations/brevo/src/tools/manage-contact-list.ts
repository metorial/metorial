import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listContactLists = SlateTool.create(spec, {
  name: 'List Contact Lists',
  key: 'list_contact_lists',
  description: `Retrieve all contact lists in your Brevo account with subscriber counts and folder associations.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z.number().optional().describe('Number of lists per page (default: 10)'),
      offset: z.number().optional().describe('Index of the first list (default: 0)'),
      sort: z.enum(['asc', 'desc']).optional().describe('Sort order by creation date')
    })
  )
  .output(
    z.object({
      lists: z
        .array(
          z.object({
            listId: z.number().describe('List ID'),
            name: z.string().describe('List name'),
            totalSubscribers: z.number().describe('Total subscriber count'),
            uniqueSubscribers: z.number().describe('Unique subscriber count'),
            folderId: z.number().describe('Associated folder ID')
          })
        )
        .describe('Contact lists'),
      count: z.number().describe('Total number of lists')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      authType: ctx.auth.authType
    });

    let result = await client.listContactLists({
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      sort: ctx.input.sort
    });

    let lists = (result.lists ?? []).map((l: any) => ({
      listId: l.id,
      name: l.name,
      totalSubscribers: l.totalSubscribers ?? 0,
      uniqueSubscribers: l.uniqueSubscribers ?? 0,
      folderId: l.folderId
    }));

    return {
      output: { lists, count: result.count },
      message: `Retrieved **${lists.length}** contact lists (${result.count} total).`
    };
  });

export let createContactList = SlateTool.create(spec, {
  name: 'Create Contact List',
  key: 'create_contact_list',
  description: `Create a new contact list within a specified folder. Lists are used to organize contacts for targeted campaigns and segmentation.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Name of the new list'),
      folderId: z.number().describe('ID of the folder to place the list in')
    })
  )
  .output(
    z.object({
      listId: z.number().describe('ID of the newly created list')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      authType: ctx.auth.authType
    });

    let result = await client.createContactList({
      name: ctx.input.name,
      folderId: ctx.input.folderId
    });

    return {
      output: result,
      message: `Contact list **${ctx.input.name}** created. List ID: **${result.listId}**`
    };
  });

export let addContactsToList = SlateTool.create(spec, {
  name: 'Add Contacts to List',
  key: 'add_contacts_to_list',
  description: `Add one or more contacts to a contact list by email addresses or contact IDs.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      listId: z.number().describe('ID of the target list'),
      emails: z.array(z.string()).optional().describe('Email addresses of contacts to add'),
      contactIds: z.array(z.number()).optional().describe('Contact IDs to add')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the operation completed successfully')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      authType: ctx.auth.authType
    });

    await client.addContactsToList(ctx.input.listId, {
      emails: ctx.input.emails,
      ids: ctx.input.contactIds
    });

    let count = (ctx.input.emails?.length ?? 0) + (ctx.input.contactIds?.length ?? 0);
    return {
      output: { success: true },
      message: `Added **${count}** contact(s) to list **${ctx.input.listId}**.`
    };
  });

export let removeContactsFromList = SlateTool.create(spec, {
  name: 'Remove Contacts from List',
  key: 'remove_contacts_from_list',
  description: `Remove one or more contacts from a contact list by email addresses or contact IDs.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      listId: z.number().describe('ID of the list'),
      emails: z.array(z.string()).optional().describe('Email addresses of contacts to remove'),
      contactIds: z.array(z.number()).optional().describe('Contact IDs to remove')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the operation completed successfully')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      authType: ctx.auth.authType
    });

    await client.removeContactsFromList(ctx.input.listId, {
      emails: ctx.input.emails,
      ids: ctx.input.contactIds
    });

    let count = (ctx.input.emails?.length ?? 0) + (ctx.input.contactIds?.length ?? 0);
    return {
      output: { success: true },
      message: `Removed **${count}** contact(s) from list **${ctx.input.listId}**.`
    };
  });
