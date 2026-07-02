import { SlateTool } from 'slates';
import { z } from 'zod';
import { MailsoftlyClient } from '../lib/client';
import { spec } from '../spec';

export let getContacts = SlateTool.create(spec, {
  name: 'Get Contacts',
  key: 'get_contacts',
  description: `Retrieves contacts from Mailsoftly. Fetch all contacts for the firm, or fetch a single contact by ID with optional detailed view.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      contactId: z
        .string()
        .optional()
        .describe('ID of a specific contact to retrieve. Omit to list all contacts.'),
      detailed: z
        .boolean()
        .optional()
        .describe(
          'If true and contactId is provided, returns detailed contact information including custom fields.'
        )
    })
  )
  .output(
    z.object({
      contacts: z
        .array(z.any())
        .optional()
        .describe('List of contacts (when no contactId provided).'),
      contact: z.any().optional().describe('Single contact record (when contactId provided).')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MailsoftlyClient({ token: ctx.auth.token });

    if (ctx.input.contactId) {
      let type = ctx.input.detailed ? 'detailed' : undefined;
      let contact = await client.getContact(ctx.input.contactId, type);
      return {
        output: { contact },
        message: `Retrieved contact **${ctx.input.contactId}**.`
      };
    }

    let contacts = await client.getContacts();
    return {
      output: { contacts },
      message: `Retrieved **${contacts.length}** contact(s).`
    };
  })
  .build();
