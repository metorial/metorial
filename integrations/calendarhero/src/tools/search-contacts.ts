import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let searchContacts = SlateTool.create(spec, {
  name: 'Search Contacts',
  key: 'search_contacts',
  description: `Search for contacts in CalendarHero by email, domain, or name. Supports filtering and sorting to find the right contacts quickly.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      search: z.string().optional().describe('Search query (email, domain, or name)'),
      filter: z.enum(['A-Z', 'popular', 'recent']).optional().describe('Sort/filter mode'),
      all: z.boolean().optional().describe('Return all contacts (no pagination)'),
      includeTeams: z.boolean().optional().describe('Include team contacts in results')
    })
  )
  .output(
    z.object({
      contacts: z
        .array(
          z.object({
            contactId: z.string().optional().describe('Contact ID'),
            name: z.string().optional().describe('Contact name'),
            email: z.string().optional().describe('Primary email address'),
            title: z.string().optional().describe('Job title'),
            organization: z.string().optional().describe('Organization name'),
            raw: z.any().optional()
          })
        )
        .describe('Matching contacts'),
      totalCount: z.number().optional().describe('Total number of matching contacts')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let data = await client.searchContacts({
      search: ctx.input.search,
      filter: ctx.input.filter,
      all: ctx.input.all,
      includeTeams: ctx.input.includeTeams
    });

    let contacts = Array.isArray(data) ? data : data?.contacts || data?.results || [];
    let mapped = contacts.map((c: any) => ({
      contactId: c._id || c.id,
      name: c.name || c.displayName,
      email: Array.isArray(c.email) ? c.email[0] : c.email,
      title: c.title,
      organization: c.organization || c.company,
      raw: c
    }));

    return {
      output: {
        contacts: mapped,
        totalCount: data?.total || data?.count || mapped.length
      },
      message: `Found **${mapped.length}** contact(s)${ctx.input.search ? ` matching "${ctx.input.search}"` : ''}.`
    };
  })
  .build();
