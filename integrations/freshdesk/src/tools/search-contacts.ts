import { SlateTool } from 'slates';
import { z } from 'zod';
import { FreshdeskClient } from '../lib/client';
import { spec } from '../spec';

export let searchContacts = SlateTool.create(spec, {
  name: 'Search Contacts',
  key: 'search_contacts',
  description: `Searches contacts using Freshdesk's filter query language. Supports filtering by name, email, phone, company, and custom fields.
Example queries: \`"email:'john@example.com'"\`, \`"company_id:42 AND active:true"\`.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().describe('Freshdesk filter query string'),
      page: z.number().optional().describe('Page number for pagination')
    })
  )
  .output(
    z.object({
      total: z.number().describe('Total number of matching contacts'),
      contacts: z
        .array(
          z.object({
            contactId: z.number().describe('Contact ID'),
            name: z.string().describe('Full name'),
            email: z.string().nullable().describe('Email address'),
            phone: z.string().nullable().describe('Phone number'),
            companyId: z.number().nullable().describe('Company ID'),
            createdAt: z.string().describe('Creation timestamp'),
            updatedAt: z.string().describe('Last update timestamp')
          })
        )
        .describe('Matching contacts')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FreshdeskClient({
      subdomain: ctx.config.subdomain,
      token: ctx.auth.token
    });

    let result = await client.searchContacts(ctx.input.query, ctx.input.page);

    let contacts = (result.results ?? []).map((c: any) => ({
      contactId: c.id,
      name: c.name,
      email: c.email ?? null,
      phone: c.phone ?? null,
      companyId: c.company_id ?? null,
      createdAt: c.created_at,
      updatedAt: c.updated_at
    }));

    return {
      output: {
        total: result.total ?? contacts.length,
        contacts
      },
      message: `Found **${result.total ?? contacts.length}** contacts matching the query`
    };
  })
  .build();
