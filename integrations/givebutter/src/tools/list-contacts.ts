import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let contactSummarySchema = z.object({
  contactId: z.number().describe('Unique identifier of the contact'),
  firstName: z.string().nullable().describe('First name'),
  middleName: z.string().nullable().describe('Middle name'),
  lastName: z.string().nullable().describe('Last name'),
  company: z.string().nullable().describe('Company name'),
  primaryEmail: z.string().nullable().describe('Primary email address'),
  primaryPhone: z.string().nullable().describe('Primary phone number'),
  totalContributions: z.number().nullable().describe('Total contribution count'),
  recurringContributions: z.number().nullable().describe('Recurring contribution count'),
  tags: z.array(z.string()).describe('Contact tags'),
  archivedAt: z.string().nullable().describe('When archived, if applicable'),
  createdAt: z.string().nullable().describe('When the contact was created'),
  updatedAt: z.string().nullable().describe('When the contact was last updated')
});

let listContactsOutputSchema = z.object({
  contacts: z.array(contactSummarySchema).describe('List of contacts'),
  totalCount: z.number().describe('Total number of contacts'),
  currentPage: z.number().describe('Current page number'),
  lastPage: z.number().describe('Last page number')
});

export let listContacts = SlateTool.create(spec, {
  name: 'List Contacts',
  key: 'list_contacts',
  description: `Retrieve a paginated list of donor/supporter contacts with their basic profile information and contribution statistics.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number for pagination (default: 1)'),
      perPage: z.number().optional().describe('Items per page, from 1 to 100'),
      scope: z
        .string()
        .optional()
        .describe('Legacy scope filter passed through to Givebutter'),
      email: z.string().optional().describe('Filter by contact email'),
      firstName: z.string().optional().describe('Filter by first name'),
      lastName: z.string().optional().describe('Filter by last name'),
      tags: z.string().optional().describe('Provider tag filter'),
      updatedAfter: z
        .string()
        .optional()
        .describe('Return contacts updated after this ISO 8601 timestamp')
    })
  )
  .output(listContactsOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listContacts({
      page: ctx.input.page,
      per_page: ctx.input.perPage,
      scope: ctx.input.scope,
      email: ctx.input.email,
      firstName: ctx.input.firstName,
      lastName: ctx.input.lastName,
      tags: ctx.input.tags,
      updatedAfter: ctx.input.updatedAfter
    });

    let contacts = result.data.map((c: any) => ({
      contactId: c.id,
      firstName: c.first_name,
      middleName: c.middle_name,
      lastName: c.last_name,
      company: c.company,
      primaryEmail: c.primary_email,
      primaryPhone: c.primary_phone,
      totalContributions: c.stats?.total_contributions,
      recurringContributions: c.stats?.recurring_contributions,
      tags: c.tags,
      archivedAt: c.archived_at,
      createdAt: c.created_at,
      updatedAt: c.updated_at
    }));

    return {
      output: client.output(listContactsOutputSchema, {
        contacts,
        totalCount: result.meta.total,
        currentPage: result.meta.current_page,
        lastPage: result.meta.last_page
      }),
      message: client.publicData(
        `Found **${result.meta.total}** contacts (page ${result.meta.current_page} of ${result.meta.last_page}).`
      )
    };
  })
  .build();
