import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageContactList = SlateTool.create(spec, {
  name: 'Manage Contact List',
  key: 'manage_contact_list',
  description: `Create, update, delete, or list contact lists used for organizing and segmenting contacts in your Reply.io workspace.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'create', 'update', 'delete'])
        .describe('Action to perform'),
      listId: z.number().optional().describe('List ID (required for get/update/delete)'),
      name: z
        .string()
        .optional()
        .describe('List name (required for create, optional for update)')
    })
  )
  .output(
    z.object({
      contactList: z.record(z.string(), z.any()).optional().describe('Contact list details'),
      contactLists: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('All contact lists'),
      deleted: z.boolean().optional().describe('Whether the list was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { action, listId, name } = ctx.input;

    if (action === 'list') {
      let result = await client.listContactLists();
      let contactLists = Array.isArray(result) ? result : (result?.items ?? []);
      return {
        output: { contactLists },
        message: `Found **${contactLists.length}** contact list(s).`
      };
    }

    if (action === 'get') {
      if (!listId) throw new Error('listId is required');
      let contactList = await client.getContactList(listId);
      return {
        output: { contactList },
        message: `Retrieved contact list **${contactList.name ?? listId}**.`
      };
    }

    if (action === 'create') {
      if (!name) throw new Error('name is required to create a contact list');
      let contactList = await client.createContactList(name);
      return {
        output: { contactList },
        message: `Created contact list **${contactList.name}** (ID: ${contactList.id}).`
      };
    }

    if (action === 'update') {
      if (!listId) throw new Error('listId is required');
      if (!name) throw new Error('name is required to update a contact list');
      let contactList = await client.updateContactList(listId, name);
      return {
        output: { contactList },
        message: `Updated contact list **${listId}**.`
      };
    }

    // delete
    if (!listId) throw new Error('listId is required');
    await client.deleteContactList(listId);
    return {
      output: { deleted: true },
      message: `Deleted contact list **${listId}**.`
    };
  })
  .build();
