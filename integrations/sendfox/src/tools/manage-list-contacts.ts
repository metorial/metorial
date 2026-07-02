import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageListContacts = SlateTool.create(spec, {
  name: 'Manage List Contacts',
  key: 'manage_list_contacts',
  description: `Add or remove a contact from a list. Use the **action** field to specify whether to add or remove the contact.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['add', 'remove'])
        .describe('Whether to add or remove the contact from the list'),
      listId: z.number().describe('ID of the list'),
      contactId: z.number().describe('ID of the contact')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the operation succeeded'),
      action: z.string().describe('Action performed (add or remove)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.action === 'add') {
      await client.addContactToList(ctx.input.listId, ctx.input.contactId);
    } else {
      await client.removeContactFromList(ctx.input.listId, ctx.input.contactId);
    }

    let verb = ctx.input.action === 'add' ? 'added to' : 'removed from';

    return {
      output: {
        success: true,
        action: ctx.input.action
      },
      message: `Contact (ID: ${ctx.input.contactId}) ${verb} list (ID: ${ctx.input.listId}).`
    };
  })
  .build();
