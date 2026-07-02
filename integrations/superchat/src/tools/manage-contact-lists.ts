import { SlateTool } from 'slates';
import { z } from 'zod';
import { SuperchatClient } from '../lib/client';
import { spec } from '../spec';

let contactListSchema = z.object({
  contactListId: z.string().describe('Unique contact list identifier'),
  contactListUrl: z.string().optional().describe('Resource URL'),
  name: z.string().optional().describe('Contact list name'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  updatedAt: z.string().optional().describe('Last update timestamp')
});

let mapContactList = (list: any) => ({
  contactListId: list.id,
  contactListUrl: list.url,
  name: list.name,
  createdAt: list.created_at,
  updatedAt: list.updated_at
});

export let listContactLists = SlateTool.create(spec, {
  name: 'List Contact Lists',
  key: 'list_contact_lists',
  description: `List all contact lists in the workspace. Contact lists organize contacts into groups.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z.number().optional().describe('Maximum number of contact lists to return'),
      after: z.string().optional().describe('Cursor for forward pagination'),
      before: z.string().optional().describe('Cursor for backward pagination')
    })
  )
  .output(
    z.object({
      contactLists: z.array(contactListSchema).describe('List of contact lists'),
      pagination: z
        .object({
          next: z.string().optional().nullable().describe('Next page cursor'),
          previous: z.string().optional().nullable().describe('Previous page cursor')
        })
        .optional()
        .describe('Pagination cursors')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SuperchatClient({ token: ctx.auth.token });

    let result = await client.listContactLists({
      limit: ctx.input.limit,
      after: ctx.input.after,
      before: ctx.input.before
    });

    let contactLists = (result.results || []).map(mapContactList);

    return {
      output: {
        contactLists,
        pagination: result.pagination
      },
      message: `Retrieved **${contactLists.length}** contact list(s).`
    };
  })
  .build();

export let addContactToList = SlateTool.create(spec, {
  name: 'Add Contact to List',
  key: 'add_contact_to_list',
  description: `Add a contact to a contact list. Useful for organizing contacts into groups.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      contactId: z.string().describe('ID of the contact to add'),
      contactListId: z.string().describe('ID of the contact list to add the contact to')
    })
  )
  .output(
    z.object({
      contactId: z.string().describe('ID of the added contact'),
      contactListId: z.string().describe('ID of the contact list')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SuperchatClient({ token: ctx.auth.token });
    await client.addContactToList(ctx.input.contactId, ctx.input.contactListId);

    return {
      output: {
        contactId: ctx.input.contactId,
        contactListId: ctx.input.contactListId
      },
      message: `Contact \`${ctx.input.contactId}\` added to list \`${ctx.input.contactListId}\`.`
    };
  })
  .build();

export let removeContactFromList = SlateTool.create(spec, {
  name: 'Remove Contact from List',
  key: 'remove_contact_from_list',
  description: `Remove a contact from a contact list.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      contactId: z.string().describe('ID of the contact to remove'),
      contactListId: z.string().describe('ID of the contact list to remove the contact from')
    })
  )
  .output(
    z.object({
      contactId: z.string().describe('ID of the removed contact'),
      contactListId: z.string().describe('ID of the contact list')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SuperchatClient({ token: ctx.auth.token });
    await client.removeContactFromList(ctx.input.contactId, ctx.input.contactListId);

    return {
      output: {
        contactId: ctx.input.contactId,
        contactListId: ctx.input.contactListId
      },
      message: `Contact \`${ctx.input.contactId}\` removed from list \`${ctx.input.contactListId}\`.`
    };
  })
  .build();
