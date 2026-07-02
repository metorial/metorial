import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageContactLists = SlateTool.create(spec, {
  name: 'Manage Contact Lists',
  key: 'manage_contact_lists',
  description: `Adds or removes a contact from a Spoki list. Lists are used to organize contacts into groups for campaigns and automations.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      contactId: z.string().describe('ID of the contact'),
      action: z
        .enum(['add', 'remove'])
        .describe('Whether to add or remove the contact from the list'),
      listId: z.string().describe('ID of the list')
    })
  )
  .output(
    z.object({
      contactId: z.string().describe('ID of the contact'),
      listId: z.string().describe('ID of the list'),
      action: z.string().describe('The action performed'),
      raw: z.any().optional().describe('Full API response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result: any;
    if (ctx.input.action === 'add') {
      ctx.info(`Adding contact ${ctx.input.contactId} to list ${ctx.input.listId}`);
      result = await client.addContactToList(ctx.input.contactId, ctx.input.listId);
    } else {
      ctx.info(`Removing contact ${ctx.input.contactId} from list ${ctx.input.listId}`);
      result = await client.removeContactFromList(ctx.input.contactId, ctx.input.listId);
    }

    return {
      output: {
        contactId: ctx.input.contactId,
        listId: ctx.input.listId,
        action: ctx.input.action,
        raw: result
      },
      message:
        ctx.input.action === 'add'
          ? `Added contact ${ctx.input.contactId} to list **${ctx.input.listId}**`
          : `Removed contact ${ctx.input.contactId} from list **${ctx.input.listId}**`
    };
  })
  .build();
