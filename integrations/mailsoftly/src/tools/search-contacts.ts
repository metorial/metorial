import { SlateTool } from 'slates';
import { z } from 'zod';
import { MailsoftlyClient } from '../lib/client';
import { spec } from '../spec';

export let searchContacts = SlateTool.create(spec, {
  name: 'Search Contacts',
  key: 'search_contacts',
  description: `Searches contacts in Mailsoftly based on field criteria such as email, first name, or last name. Provide one or more field-value pairs to filter contacts.`,
  instructions: [
    'Use field names like "email", "first_name", "last_name", or any custom field name as search criteria.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      email: z.string().optional().describe('Filter by email address.'),
      firstName: z.string().optional().describe('Filter by first name.'),
      lastName: z.string().optional().describe('Filter by last name.'),
      customCriteria: z
        .record(z.string(), z.string())
        .optional()
        .describe('Additional search criteria as key-value pairs using field names.')
    })
  )
  .output(
    z.object({
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
      Object.assign(criteria, ctx.input.customCriteria);
    }

    let contacts = await client.searchContacts(criteria);

    return {
      output: { contacts },
      message: `Found **${contacts.length}** contact(s) matching the search criteria.`
    };
  })
  .build();
