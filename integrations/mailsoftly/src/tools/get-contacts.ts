import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { MailsoftlyClient } from '../lib/client';
import { spec } from '../spec';

export let getContacts = SlateTool.create(spec, {
  name: 'Get Contacts',
  key: 'get_contacts',
  description: `Retrieves contacts from Mailsoftly. Fetch a page of contacts, or fetch a single contact by ID with optional detailed view. Use hasMore and page to continue listing.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      page: z
        .number()
        .int()
        .min(1)
        .optional()
        .describe(
          'Page number when listing contacts. Pass 1 to start paginating; omit page and perPage for the legacy listing.'
        ),
      perPage: z
        .number()
        .int()
        .min(1)
        .max(500)
        .optional()
        .describe('Contacts per page when paginating. Provider default 50; maximum 500.'),
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
      page: z.number().optional(),
      perPage: z.number().optional(),
      total: z.number().optional(),
      hasMore: z
        .boolean()
        .optional()
        .describe(
          'More records exist. For a legacy listing, start with page 1; otherwise request the next page.'
        ),
      contacts: z
        .array(z.any())
        .optional()
        .describe('List of contacts (when no contactId provided).'),
      contact: z.any().optional().describe('Single contact record (when contactId provided).')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MailsoftlyClient({ token: ctx.auth.token });

    if (
      ctx.input.contactId !== undefined &&
      (ctx.input.page !== undefined || ctx.input.perPage !== undefined)
    ) {
      throw createApiServiceError(
        'Listing filters and pagination cannot be used with contactId.'
      );
    }

    if (ctx.input.contactId !== undefined) {
      let type = ctx.input.detailed ? 'detailed' : undefined;
      let contact = await client.getContact(ctx.input.contactId, type);
      return {
        output: { contact },
        message: `Retrieved contact **${ctx.input.contactId}**.`
      };
    }

    let { items: contacts, ...pagination } = await client.getContacts(ctx.input);
    return {
      output: { contacts, ...pagination },
      message: `Retrieved **${contacts.length}** contact(s).`
    };
  })
  .build();
