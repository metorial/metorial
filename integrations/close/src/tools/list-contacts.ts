import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
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
      contacts: z.array(
        z.object({
          contactId: z.string().describe('Unique contact ID'),
          leadId: z.string().describe('Associated lead ID'),
          name: z.string().nullable().describe('Full name of the contact'),
          title: z.string().nullable().describe('Job title of the contact'),
          emails: z
            .array(
              z.object({
                email: z.string().describe('Email address'),
                type: z.string().describe('Email type')
              })
            )
            .describe('Email addresses'),
          phones: z
            .array(
              z.object({
                phone: z.string().describe('Phone number'),
                type: z.string().describe('Phone type')
              })
            )
            .describe('Phone numbers'),
          dateCreated: z.string().describe('Creation timestamp')
        })
      ),
      totalResults: z.number().describe('Total number of contacts matching the query'),
      hasMore: z
        .boolean()
        .describe('Whether more results are available beyond the current page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, authType: ctx.auth.authType });
    let result = await client.listContacts({
      leadId: ctx.input.leadId,
      limit: ctx.input.limit ?? 100,
      skip: ctx.input.skip
    });

    let contacts = (result.data ?? []).map((c: any) => ({
      contactId: c.id,
      leadId: c.lead_id,
      name: c.name ?? null,
      title: c.title ?? null,
      emails: (c.emails ?? []).map((e: any) => ({
        email: e.email,
        type: e.type
      })),
      phones: (c.phones ?? []).map((p: any) => ({
        phone: p.phone,
        type: p.type
      })),
      dateCreated: c.date_created
    }));

    let totalResults = result.total_results ?? contacts.length;
    let _limit = ctx.input.limit ?? 100;
    let skip = ctx.input.skip ?? 0;
    let hasMore = skip + contacts.length < totalResults;

    return {
      output: { contacts, totalResults, hasMore },
      message: `Found **${totalResults}** contact(s)${ctx.input.leadId ? ` for lead **${ctx.input.leadId}**` : ''}. Returning ${contacts.length} result(s).`
    };
  })
  .build();
