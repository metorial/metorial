import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageContactList = SlateTool.create(spec, {
  name: 'Manage Contact List',
  key: 'manage_contact_list',
  description: `Create, update, or delete a contact list. When creating, provide a name and optional description. When updating, provide the list ID and the fields to change.`
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete']).describe('Action to perform'),
      listId: z
        .string()
        .optional()
        .describe('ID of the list (required for update and delete)'),
      name: z.string().optional().describe('List name (required for create)'),
      description: z.string().optional().describe('List description')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the action was successful'),
      listId: z.string().optional().describe('ID of the created or updated list')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { action, listId } = ctx.input;
    let success = false;
    let resultListId: string | undefined;
    let message = '';

    switch (action) {
      case 'create': {
        if (!ctx.input.name) throw new Error('name is required when creating a contact list');
        let data: Record<string, any> = { Name: ctx.input.name };
        if (ctx.input.description) data.Description = ctx.input.description;
        let result = await client.createContactList(data);
        success = result?.Status === 1;
        resultListId = String(result?.Data ?? '');
        message = success
          ? `Created contact list **"${ctx.input.name}"** with ID \`${resultListId}\`.`
          : `Failed to create contact list.`;
        break;
      }
      case 'update': {
        if (!listId) throw new Error('listId is required when updating a contact list');
        let data: Record<string, any> = {};
        if (ctx.input.name) data.Name = ctx.input.name;
        if (ctx.input.description) data.Description = ctx.input.description;
        let result = await client.updateContactList(listId, data);
        success = result?.Status === 1;
        resultListId = listId;
        message = success
          ? `Updated contact list \`${listId}\`.`
          : `Failed to update contact list \`${listId}\`.`;
        break;
      }
      case 'delete': {
        if (!listId) throw new Error('listId is required when deleting a contact list');
        let result = await client.deleteContactList(listId);
        success = result?.Status === 1;
        message = success
          ? `Deleted contact list \`${listId}\`.`
          : `Failed to delete contact list \`${listId}\`.`;
        break;
      }
    }

    return {
      output: { success, listId: resultListId },
      message
    };
  })
  .build();
