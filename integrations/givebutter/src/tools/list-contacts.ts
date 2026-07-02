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
      scope: z.string().optional().describe('Scope filter')
    })
  )
  .output(
    z.object({
      contacts: z.array(contactSummarySchema).describe('List of contacts'),
      totalCount: z.number().describe('Total number of contacts'),
      currentPage: z.number().describe('Current page number'),
      lastPage: z.number().describe('Last page number')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listContacts({
      page: ctx.input.page,
      scope: ctx.input.scope
    });

    let contacts = result.data.map((c: any) => ({
      contactId: c.id,
      firstName: c.first_name ?? null,
      middleName: c.middle_name ?? null,
      lastName: c.last_name ?? null,
      company: c.company ?? null,
      primaryEmail: c.primary_email ?? null,
      primaryPhone: c.primary_phone ?? null,
      totalContributions: c.stats?.total_contributions ?? null,
      recurringContributions: c.stats?.recurring_contributions ?? null,
      tags: c.tags ?? [],
      archivedAt: c.archived_at ?? null,
      createdAt: c.created_at ?? null,
      updatedAt: c.updated_at ?? null
    }));

    return {
      output: {
        contacts,
        totalCount: result.meta.total,
        currentPage: result.meta.current_page,
        lastPage: result.meta.last_page
      },
      message: `Found **${result.meta.total}** contacts (page ${result.meta.current_page} of ${result.meta.last_page}).`
    };
  })
  .build();
