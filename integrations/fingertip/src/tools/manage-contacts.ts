import { SlateTool } from 'slates';
import { z } from 'zod';
import { FingertipClient } from '../lib/client';
import { spec } from '../spec';

let contactOutputSchema = z.object({
  contactId: z.string(),
  siteId: z.string(),
  email: z.string(),
  name: z.string().nullable(),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  phone: z.string().nullable(),
  businessName: z.string().nullable(),
  jobTitle: z.string().nullable(),
  marketingStatus: z.string(),
  source: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string()
});

export let listContacts = SlateTool.create(spec, {
  name: 'List Contacts',
  key: 'list_contacts',
  description: `List site contacts (customers/clients) with filtering and search capabilities. Contacts represent people who interact with your business through the site.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      siteId: z.string().describe('ID of the site to list contacts for'),
      search: z.string().optional().describe('Search term to filter contacts'),
      marketingStatuses: z
        .array(
          z.enum([
            'SUBSCRIBED',
            'UNSUBSCRIBED',
            'CLEANED',
            'PENDING',
            'TRANSACTIONAL',
            'ARCHIVED'
          ])
        )
        .optional()
        .describe('Filter by marketing statuses'),
      createdAfter: z
        .string()
        .optional()
        .describe('Filter contacts created after this date (ISO 8601)'),
      cursor: z.string().optional().describe('Pagination cursor'),
      pageSize: z
        .number()
        .optional()
        .describe('Number of items per page (default: 10, max: 25)')
    })
  )
  .output(
    z.object({
      contacts: z.array(
        contactOutputSchema.extend({
          rating: z.number().nullable(),
          formResponsesCount: z.number(),
          appointmentsCount: z.number(),
          ordersCount: z.number(),
          invoicesCount: z.number()
        })
      ),
      total: z.number(),
      hasNextPage: z.boolean(),
      endCursor: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new FingertipClient(ctx.auth.token);
    let result = await client.listSiteContacts({
      siteId: ctx.input.siteId,
      search: ctx.input.search,
      marketingStatuses: ctx.input.marketingStatuses,
      createdAfter: ctx.input.createdAfter,
      cursor: ctx.input.cursor,
      pageSize: ctx.input.pageSize
    });

    let contacts = result.items.map(item => ({
      contactId: item.siteContact.id,
      siteId: item.siteContact.siteId,
      email: item.siteContact.email,
      name: item.siteContact.name,
      firstName: item.siteContact.firstName,
      lastName: item.siteContact.lastName,
      phone: item.siteContact.phone,
      businessName: item.siteContact.businessName,
      jobTitle: item.siteContact.jobTitle,
      marketingStatus: item.siteContact.marketingStatus,
      source: item.siteContact.source,
      createdAt: item.siteContact.createdAt,
      updatedAt: item.siteContact.updatedAt,
      rating: item.rating,
      formResponsesCount: item.formResponsesCount,
      appointmentsCount: item.appointmentsCount,
      ordersCount: item.ordersCount,
      invoicesCount: item.invoicesCount
    }));

    return {
      output: {
        contacts,
        total: result.total,
        hasNextPage: result.pageInfo.hasNextPage,
        endCursor: result.pageInfo.endCursor
      },
      message: `Found **${result.total}** contact(s). Returned ${contacts.length} on this page.`
    };
  })
  .build();

export let createContact = SlateTool.create(spec, {
  name: 'Create Contact',
  key: 'create_contact',
  description: `Create a new site contact (customer/client) associated with a site. Contacts track people who interact with your business.`
})
  .input(
    z.object({
      siteId: z.string().describe('ID of the site to add the contact to'),
      email: z.string().describe('Email address of the contact'),
      firstName: z.string().optional().describe('First name'),
      lastName: z.string().optional().describe('Last name'),
      phone: z.string().optional().describe('Phone number'),
      notes: z.string().optional().describe('Additional notes about the contact'),
      marketingStatus: z
        .enum([
          'SUBSCRIBED',
          'UNSUBSCRIBED',
          'CLEANED',
          'PENDING',
          'TRANSACTIONAL',
          'ARCHIVED'
        ])
        .optional()
        .describe('Marketing communication status')
    })
  )
  .output(contactOutputSchema)
  .handleInvocation(async ctx => {
    let client = new FingertipClient(ctx.auth.token);
    let contact = await client.createSiteContact({
      siteId: ctx.input.siteId,
      email: ctx.input.email,
      firstName: ctx.input.firstName,
      lastName: ctx.input.lastName,
      phone: ctx.input.phone,
      notes: ctx.input.notes,
      marketingStatus: ctx.input.marketingStatus
    });

    return {
      output: {
        contactId: contact.id,
        siteId: contact.siteId,
        email: contact.email,
        name: contact.name,
        firstName: contact.firstName,
        lastName: contact.lastName,
        phone: contact.phone,
        businessName: contact.businessName,
        jobTitle: contact.jobTitle,
        marketingStatus: contact.marketingStatus,
        source: contact.source,
        createdAt: contact.createdAt,
        updatedAt: contact.updatedAt
      },
      message: `Created contact **${contact.email}**.`
    };
  })
  .build();
