import { SlateTool } from 'slates';
import { z } from 'zod';
import { MailsoftlyClient } from '../lib/client';
import { spec } from '../spec';

export let manageContactLists = SlateTool.create(spec, {
  name: 'Manage Contact Lists',
  key: 'manage_contact_lists',
  description: `Create, retrieve, or list contact lists in Mailsoftly. Use this to organize contacts into lists for targeting email campaigns.
- Omit all optional fields to list all contact lists.
- Provide a **contactListId** to get details of a specific list.
- Provide a **name** to create a new contact list.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      contactListId: z
        .string()
        .optional()
        .describe('ID of a specific contact list to retrieve.'),
      name: z.string().optional().describe('Name for a new contact list to create.')
    })
  )
  .output(
    z.object({
      contactLists: z
        .array(z.any())
        .optional()
        .describe('List of all contact lists (when listing).'),
      contactList: z
        .any()
        .optional()
        .describe('A single contact list record (when fetching or creating).')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MailsoftlyClient({ token: ctx.auth.token });

    if (ctx.input.name) {
      let contactList = await client.createContactList(ctx.input.name);
      return {
        output: { contactList },
        message: `Created contact list **${ctx.input.name}**.`
      };
    }

    if (ctx.input.contactListId) {
      let contactList = await client.getContactList(ctx.input.contactListId);
      return {
        output: { contactList },
        message: `Retrieved contact list **${ctx.input.contactListId}**.`
      };
    }

    let contactLists = await client.getContactLists();
    return {
      output: { contactLists },
      message: `Retrieved **${contactLists.length}** contact list(s).`
    };
  })
  .build();
