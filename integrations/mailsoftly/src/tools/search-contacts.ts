import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { MailsoftlyClient } from '../lib/client';
import { spec } from '../spec';

export let searchContacts = SlateTool.create(spec, {
  name: 'Search Contacts',
  key: 'search_contacts',
  description: `Searches contacts in Mailsoftly by exact email, first name, or last name. Returns one page of matches; use hasMore to continue.`,
  instructions: [
    'Search is exact, not partial. Only email, first_name, and last_name are supported search fields.'
  ],
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
          'Page number. Pass 1 to start paginating; omit page and perPage for the legacy listing.'
        ),
      perPage: z
        .number()
        .int()
        .min(1)
        .max(500)
        .optional()
        .describe('Matches per page when paginating. Provider default 50; maximum 500.'),
      email: z.string().optional().describe('Filter by email address.'),
      firstName: z.string().optional().describe('Filter by first name.'),
      lastName: z.string().optional().describe('Filter by last name.'),
      customCriteria: z
        .record(z.string(), z.string())
        .optional()
        .describe(
          'Additional exact criteria using email, first_name, or last_name. Custom field search is not supported by the API.'
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
      contacts: z.array(z.any()).describe('List of contacts matching the search criteria.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MailsoftlyClient({ token: ctx.auth.token });

    let criteria: Record<string, string> = {};
    if (ctx.input.email) criteria.email = ctx.input.email;
    if (ctx.input.firstName) criteria.first_name = ctx.input.firstName;
    if (ctx.input.lastName) criteria.last_name = ctx.input.lastName;
    if (ctx.input.customCriteria) {
      for (let [field, value] of Object.entries(ctx.input.customCriteria)) {
        if (!['email', 'first_name', 'last_name'].includes(field)) {
          throw createApiServiceError(
            `Mailsoftly does not support searching by ${field}. Use email, first_name, or last_name.`
          );
        }
        if (criteria[field] !== undefined && criteria[field] !== value) {
          throw createApiServiceError(`Provide one value for search field ${field}.`);
        }
        criteria[field] = value;
      }
    }

    if (!Object.values(criteria).some(value => value.trim().length > 0)) {
      throw createApiServiceError(
        'Provide at least one non-empty email, first name, or last name to search.'
      );
    }
    let { items: contacts, ...pagination } = await client.searchContacts(criteria, ctx.input);

    return {
      output: { contacts, ...pagination },
      message: `Found **${contacts.length}** contact(s) matching the search criteria.`
    };
  })
  .build();
