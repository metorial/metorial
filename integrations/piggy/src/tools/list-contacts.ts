import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let contactSchema = z
  .object({
    contactUuid: z.string().describe('UUID of the contact'),
    email: z.string().optional().describe('Email address'),
    firstName: z.string().optional().describe('First name'),
    lastName: z.string().optional().describe('Last name'),
    creditBalance: z.number().optional().describe('Current credit balance'),
    createdAt: z.string().optional().describe('ISO 8601 creation timestamp')
  })
  .passthrough();

export let listContacts = SlateTool.create(spec, {
  name: 'List Contacts',
  key: 'list_contacts',
  description: `List loyalty program contacts with filtering and pagination. Use this to browse contacts, find recently created contacts, or retrieve a paginated list of all contacts in the system.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe('Number of contacts per page (max 100)'),
      page: z.number().optional().describe('Page number for pagination'),
      sort: z
        .string()
        .optional()
        .describe('Sort field, e.g. "created_at" or "-created_at" for descending'),
      createdAfter: z
        .string()
        .optional()
        .describe('Filter contacts created after this ISO 8601 datetime'),
      createdBefore: z
        .string()
        .optional()
        .describe('Filter contacts created before this ISO 8601 datetime')
    })
  )
  .output(
    z.object({
      contacts: z.array(contactSchema).describe('List of contacts'),
      totalCount: z.number().optional().describe('Total number of contacts'),
      currentPage: z.number().optional().describe('Current page number'),
      lastPage: z.number().optional().describe('Last page number')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listContacts({
      limit: ctx.input.limit,
      page: ctx.input.page,
      sort: ctx.input.sort,
      createdAtGt: ctx.input.createdAfter,
      createdAtLt: ctx.input.createdBefore
    });

    let contacts = (result.data || []).map((c: any) => ({
      contactUuid: c.uuid,
      email: c.email,
      firstName: c.first_name,
      lastName: c.last_name,
      creditBalance: c.credit_balance?.balance,
      createdAt: c.created_at,
      ...c
    }));

    return {
      output: {
        contacts,
        totalCount: result.meta?.total,
        currentPage: result.meta?.page,
        lastPage: result.meta?.last_page
      },
      message: `Retrieved **${contacts.length}** contacts${result.meta?.total ? ` out of ${result.meta.total} total` : ''}.`
    };
  })
  .build();
