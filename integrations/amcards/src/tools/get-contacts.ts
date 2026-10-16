import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getContacts = SlateTool.create(spec, {
  name: 'Search Contacts',
  key: 'search_contacts',
  description: `Search and retrieve contacts from your AMcards account. Filter by email, first name, or last name, with pagination support. Returns contact details including names, email, and timestamps.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      email: z.string().optional().describe('Filter contacts by email address.'),
      firstName: z.string().optional().describe('Filter contacts by first name.'),
      lastName: z.string().optional().describe('Filter contacts by last name.'),
      limit: z
        .number()
        .optional()
        .describe('Maximum number of contacts in this page. Defaults to 25.'),
      skip: z.number().optional().describe('Number of contacts to skip for pagination.')
    })
  )
  .output(
    z.object({
      contacts: z
        .array(
          z.object({
            contactId: z.string().optional().describe('AMcards contact ID.'),
            firstName: z.string().optional().describe('Contact first name.'),
            lastName: z.string().optional().describe('Contact last name.'),
            email: z.string().optional().describe('Contact email address.'),
            createdAt: z.string().optional().describe('Contact creation timestamp.'),
            updatedAt: z.string().optional().describe('Contact last updated timestamp.')
          })
        )
        .describe('List of matching contacts.'),
      totalCount: z.number().optional().describe('Number of contacts returned in this page.'),
      providerTotalCount: z
        .number()
        .optional()
        .describe('Total matching contacts reported by AMcards.'),
      nextSkip: z.number().optional().describe('Offset for the next page, when available.'),
      rawResponse: z.any().optional().describe('Full response from the AMcards API.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let results = await client.getContacts({
      email: ctx.input.email,
      firstName: ctx.input.firstName,
      lastName: ctx.input.lastName,
      limit: ctx.input.limit,
      skip: ctx.input.skip
    });

    let contacts = results.items.map(c => ({
      contactId: c.id != null ? String(c.id) : undefined,
      firstName: c.first_name ?? undefined,
      lastName: c.last_name ?? undefined,
      email: c.email_address ?? c.email ?? undefined,
      createdAt: c.added ?? c.created_at ?? undefined,
      updatedAt: c.updated ?? c.updated_at ?? undefined
    }));

    return {
      output: {
        contacts,
        totalCount: contacts.length,
        providerTotalCount: results.providerTotalCount,
        nextSkip: results.nextSkip,
        rawResponse: results.rawResponse
      },
      message: `Found **${contacts.length}** contact(s)${ctx.input.email ? ` matching email "${ctx.input.email}"` : ''}${ctx.input.firstName ? ` with first name "${ctx.input.firstName}"` : ''}${ctx.input.lastName ? ` with last name "${ctx.input.lastName}"` : ''}.`
    };
  })
  .build();
