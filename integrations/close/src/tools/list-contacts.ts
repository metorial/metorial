import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { mapContact } from '../lib/models';
import { spec } from '../spec';

export let listContacts = SlateTool.create(spec, {
  name: 'List Contacts',
  key: 'list_contacts',
  description: `List contacts in Close CRM, optionally filtered by lead.
Returns paginated results with contact details including name, title, emails, and phones.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      leadId: z.string().optional().describe('Filter contacts by lead ID'),
      limit: z
        .number()
        .optional()
        .describe('Maximum number of contacts to return (default: 100)'),
      skip: z.number().optional().describe('Number of contacts to skip for pagination')
    })
  )
  .output(
    z.object({
      nextSkip: z.number().optional().describe('Offset for the next page, when available.'),
      contacts: z.array(
        z.object({
          contactId: z.string().describe('Unique contact ID'),
          leadId: z.string().optional().describe('Associated lead ID'),
          name: z.string().nullable().describe('Full name of the contact'),
          title: z.string().nullable().describe('Job title of the contact'),
          emails: z
            .array(
              z.object({
                email: z.string().describe('Email address'),
                type: z.string().describe('Email type')
              })
            )
            .optional()
            .describe('Email addresses, when provided'),
          phones: z
            .array(
              z.object({
                phone: z.string().describe('Phone number'),
                type: z.string().describe('Phone type')
              })
            )
            .optional()
            .describe('Phone numbers, when provided'),
          dateCreated: z.string().describe('Creation timestamp')
        })
      ),
      totalResults: z
        .number()
        .optional()
        .describe('Total number of contacts matching the query'),
      hasMore: z
        .boolean()
        .describe('Whether more results are available beyond the current page')
    })
  )
  .handleInvocation(async ctx => {
    const result = await new Client(ctx.auth).listContacts(ctx.input);
    const contacts = result.data.map(mapContact);
    return {
      output: {
        contacts,
        totalResults: result.total_results ?? undefined,
        hasMore: result.has_more,
        nextSkip: result.has_more ? (ctx.input.skip ?? 0) + contacts.length : undefined
      },
      message: `Returned ${contacts.length} contact(s)${result.has_more ? '; more available' : ''}.`
    };
  })
  .build();
