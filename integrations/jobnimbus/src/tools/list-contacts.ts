import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listContacts = SlateTool.create(spec, {
  name: 'List Contacts',
  key: 'list_contacts',
  description: `Search and list contacts in JobNimbus. Supports filtering by name, email, status, workflow type, tags, and more using Elasticsearch-style query filters. Returns paginated results.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().optional().describe('Search term to filter contacts by name or email'),
      statusName: z
        .string()
        .optional()
        .describe('Filter by workflow status name (e.g. "Lead", "Active", "Closed")'),
      recordTypeName: z
        .string()
        .optional()
        .describe('Filter by workflow type name (e.g. "customer")'),
      tag: z.string().optional().describe('Filter by tag'),
      from: z.number().optional().describe('Pagination offset (0-based). Defaults to 0.'),
      size: z
        .number()
        .optional()
        .describe('Number of results per page. Defaults to 25. Max 200.')
    })
  )
  .output(
    z.object({
      totalCount: z.number().describe('Total number of matching contacts'),
      contacts: z
        .array(
          z.object({
            contactId: z.string().describe('Unique JobNimbus ID of the contact'),
            firstName: z.string().optional().describe('First name'),
            lastName: z.string().optional().describe('Last name'),
            displayName: z.string().optional().describe('Display name'),
            company: z.string().optional().describe('Company name'),
            email: z.string().optional().describe('Email address'),
            homePhone: z.string().optional().describe('Home phone number'),
            mobilePhone: z.string().optional().describe('Mobile phone number'),
            workPhone: z.string().optional().describe('Work phone number'),
            addressLine1: z.string().optional().describe('Street address'),
            city: z.string().optional().describe('City'),
            state: z.string().optional().describe('State'),
            zip: z.string().optional().describe('Zip code'),
            statusName: z.string().optional().describe('Current workflow status'),
            recordTypeName: z.string().optional().describe('Workflow type name'),
            sourceName: z.string().optional().describe('Lead source'),
            tags: z.array(z.string()).optional().describe('Tags'),
            salesRepName: z.string().optional().describe('Sales rep name'),
            dateCreated: z.number().optional().describe('Unix timestamp of creation'),
            dateUpdated: z.number().optional().describe('Unix timestamp of last update')
          })
        )
        .describe('List of contacts')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let mustClauses: any[] = [];

    if (ctx.input.statusName) {
      mustClauses.push({ term: { status_name: ctx.input.statusName } });
    }
    if (ctx.input.recordTypeName) {
      mustClauses.push({ term: { record_type_name: ctx.input.recordTypeName } });
    }
    if (ctx.input.tag) {
      mustClauses.push({ term: { tags: ctx.input.tag } });
    }
    if (ctx.input.query) {
      mustClauses.push({ query_string: { query: `*${ctx.input.query}*` } });
    }

    let filter = mustClauses.length > 0 ? { must: mustClauses } : undefined;

    let result = await client.listContacts({
      from: ctx.input.from,
      size: ctx.input.size,
      filter
    });

    let contacts = (result.results || []).map((c: any) => ({
      contactId: c.jnid,
      firstName: c.first_name ?? undefined,
      lastName: c.last_name ?? undefined,
      displayName: c.display_name ?? undefined,
      company: c.company ?? undefined,
      email: c.email ?? undefined,
      homePhone: c.home_phone ?? undefined,
      mobilePhone: c.mobile_phone ?? undefined,
      workPhone: c.work_phone ?? undefined,
      addressLine1: c.address_line1 ?? undefined,
      city: c.city ?? undefined,
      state: c.state_text ?? undefined,
      zip: c.zip ?? undefined,
      statusName: c.status_name ?? undefined,
      recordTypeName: c.record_type_name ?? undefined,
      sourceName: c.source_name ?? undefined,
      tags: c.tags ?? undefined,
      salesRepName: c.sales_rep_name ?? undefined,
      dateCreated: c.date_created ?? undefined,
      dateUpdated: c.date_updated ?? undefined
    }));

    return {
      output: {
        totalCount: result.count || 0,
        contacts
      },
      message: `Found **${result.count || 0}** contacts. Returned ${contacts.length} results.`
    };
  })
  .build();
