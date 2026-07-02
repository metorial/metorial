import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { brevoServiceError } from '../lib/errors';
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

export let getContactList = SlateTool.create(spec, {
  name: 'Get Contact List',
  key: 'get_contact_list',
  description: `Retrieve details for a specific Brevo contact list, including folder association and subscriber counts.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      listId: z.number().describe('ID of the contact list to retrieve')
    })
  )
  .output(
    z.object({
      listId: z.number().describe('List ID'),
      name: z.string().describe('List name'),
      totalSubscribers: z.number().describe('Total subscriber count'),
      uniqueSubscribers: z.number().describe('Unique subscriber count'),
      folderId: z.number().describe('Associated folder ID')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      authType: ctx.auth.authType
    });

    let list = await client.getContactList(ctx.input.listId);

    return {
      output: {
        listId: list.id,
        name: list.name,
        totalSubscribers: list.totalSubscribers ?? 0,
        uniqueSubscribers: list.uniqueSubscribers ?? 0,
        folderId: list.folderId
      },
      message: `Retrieved contact list **${list.name}**.`
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

export let updateContactList = SlateTool.create(spec, {
  name: 'Update Contact List',
  key: 'update_contact_list',
  description: `Update a Brevo contact list's name or move it to another folder.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      listId: z.number().describe('ID of the contact list to update'),
      name: z.string().optional().describe('New list name'),
      folderId: z.number().optional().describe('New parent folder ID')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the update completed successfully')
    })
  )
  .handleInvocation(async ctx => {
    if (!ctx.input.name && ctx.input.folderId === undefined) {
      throw brevoServiceError('Provide at least one of name or folderId.');
    }

    let client = new Client({
      token: ctx.auth.token,
      authType: ctx.auth.authType
    });

    await client.updateContactList(ctx.input.listId, {
      name: ctx.input.name,
      folderId: ctx.input.folderId
    });

    return {
      output: { success: true },
      message: `Contact list **${ctx.input.listId}** updated successfully.`
    };
  });

export let deleteContactList = SlateTool.create(spec, {
  name: 'Delete Contact List',
  key: 'delete_contact_list',
  description: `Delete a Brevo contact list. Contacts are not deleted, but the list itself is removed.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      listId: z.number().describe('ID of the contact list to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion completed successfully')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      authType: ctx.auth.authType
    });

    await client.deleteContactList(ctx.input.listId);

    return {
      output: { success: true },
      message: `Contact list **${ctx.input.listId}** deleted successfully.`
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
    if (!ctx.input.emails?.length && !ctx.input.contactIds?.length) {
      throw brevoServiceError('Provide at least one email or contactId to add.');
    }

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
    if (!ctx.input.emails?.length && !ctx.input.contactIds?.length) {
      throw brevoServiceError('Provide at least one email or contactId to remove.');
    }

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
