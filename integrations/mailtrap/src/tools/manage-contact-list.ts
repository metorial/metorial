import { SlateTool } from 'slates';
import { z } from 'zod';
import { MailtrapClient } from '../lib/client';
import { spec } from '../spec';

export let manageContactList = SlateTool.create(spec, {
  name: 'Manage Contact List',
  key: 'manage_contact_list',
  description: `Create, list, update, or delete contact lists. Contact lists organize contacts into targeted groups for sending campaigns. Use this to manage your email list segmentation.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'create', 'get', 'update', 'delete'])
        .describe('Action to perform'),
      listId: z
        .number()
        .optional()
        .describe('Contact list ID. Required for get, update, and delete.'),
      name: z
        .string()
        .optional()
        .describe('Name of the contact list. Required for create and update.')
    })
  )
  .output(
    z.object({
      lists: z
        .array(
          z.object({
            listId: z.number().describe('List ID'),
            name: z.string().describe('List name')
          })
        )
        .optional()
        .describe('Array of contact lists (for list action)'),
      listId: z.number().optional().describe('ID of the affected list'),
      name: z.string().optional().describe('Name of the affected list'),
      deleted: z.boolean().optional().describe('Whether the list was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MailtrapClient({
      token: ctx.auth.token,
      accountId: ctx.config.accountId
    });

    let { action, listId, name } = ctx.input;

    if (action === 'list') {
      let result = await client.listContactLists();
      let lists = (Array.isArray(result) ? result : []).map((l: any) => ({
        listId: l.id,
        name: l.name
      }));
      return {
        output: { lists },
        message: `Found **${lists.length}** contact list(s).`
      };
    }

    if (action === 'create') {
      if (!name) throw new Error('Name is required for creating a contact list');
      let result = await client.createContactList(name);
      return {
        output: { listId: result.id, name: result.name },
        message: `Contact list **${result.name}** created (ID: ${result.id}).`
      };
    }

    if (action === 'get') {
      if (!listId) throw new Error('listId is required for getting a contact list');
      let result = await client.getContactList(listId);
      return {
        output: { listId: result.id, name: result.name },
        message: `Contact list **${result.name}** (ID: ${result.id}).`
      };
    }

    if (action === 'update') {
      if (!listId) throw new Error('listId is required for updating a contact list');
      if (!name) throw new Error('Name is required for updating a contact list');
      let result = await client.updateContactList(listId, name);
      return {
        output: { listId: result.id, name: result.name },
        message: `Contact list updated to **${result.name}** (ID: ${result.id}).`
      };
    }

    if (action === 'delete') {
      if (!listId) throw new Error('listId is required for deleting a contact list');
      await client.deleteContactList(listId);
      return {
        output: { listId, deleted: true },
        message: `Contact list **${listId}** deleted successfully.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
