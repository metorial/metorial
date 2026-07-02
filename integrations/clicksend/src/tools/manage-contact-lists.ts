import { SlateTool } from 'slates';
import { z } from 'zod';
import { ClickSendClient } from '../lib/client';
import { spec } from '../spec';

let contactListSchema = z.object({
  listId: z.number().describe('Contact list ID'),
  listName: z.string().describe('Contact list name'),
  contactCount: z.number().describe('Number of contacts in the list')
});

export let listContactListsTool = SlateTool.create(spec, {
  name: 'List Contact Lists',
  key: 'list_contact_lists',
  description: `Retrieve all contact lists in your ClickSend account. Contact lists are used to organize contacts for campaigns and bulk messaging.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number for pagination'),
      limit: z.number().optional().describe('Number of lists per page')
    })
  )
  .output(
    z.object({
      currentPage: z.number().describe('Current page number'),
      totalPages: z.number().describe('Total number of pages'),
      totalCount: z.number().describe('Total number of contact lists'),
      lists: z.array(contactListSchema).describe('Contact lists')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ClickSendClient({
      username: ctx.auth.username,
      token: ctx.auth.token
    });

    let result = await client.getContactLists({
      page: ctx.input.page,
      limit: ctx.input.limit
    });

    let lists = (result.data?.data || []).map((list: any) => ({
      listId: list.list_id,
      listName: list.list_name || '',
      contactCount: list.contact_count || 0
    }));

    return {
      output: {
        currentPage: result.data?.current_page || 1,
        totalPages: result.data?.last_page || 1,
        totalCount: result.data?.total || 0,
        lists
      },
      message: `Retrieved **${lists.length}** contact list(s).`
    };
  })
  .build();

export let createContactListTool = SlateTool.create(spec, {
  name: 'Create Contact List',
  key: 'create_contact_list',
  description: `Create a new contact list in your ClickSend account. Contact lists group contacts together for SMS, MMS, voice, and post campaigns.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      listName: z.string().describe('Name for the new contact list')
    })
  )
  .output(contactListSchema)
  .handleInvocation(async ctx => {
    let client = new ClickSendClient({
      username: ctx.auth.username,
      token: ctx.auth.token
    });

    let result = await client.createContactList(ctx.input.listName);
    let list = result.data;

    return {
      output: {
        listId: list.list_id,
        listName: list.list_name || '',
        contactCount: list.contact_count || 0
      },
      message: `Created contact list **"${list.list_name}"** with ID ${list.list_id}.`
    };
  })
  .build();

export let deleteContactListTool = SlateTool.create(spec, {
  name: 'Delete Contact List',
  key: 'delete_contact_list',
  description: `Delete a contact list and all contacts within it from your ClickSend account. This action is irreversible.`,
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
      deleted: z.boolean().describe('Whether the list was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ClickSendClient({
      username: ctx.auth.username,
      token: ctx.auth.token
    });

    await client.deleteContactList(ctx.input.listId);

    return {
      output: { deleted: true },
      message: `Deleted contact list **${ctx.input.listId}**.`
    };
  })
  .build();
