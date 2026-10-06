import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { mapContact } from '../lib/contracts';
import { spec } from '../spec';

export let listContacts = SlateTool.create(spec, {
  name: 'List Contacts',
  key: 'list_contacts',
  description: `List and search contacts in Aircall. Optionally filter by phone number or email address. Returns contact details including phone numbers, emails, and company information.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      phoneNumber: z.string().optional().describe('Search by phone number (E.164 format)'),
      email: z.string().optional().describe('Search by email address'),
      from: z.number().optional().describe('Start of time range as UNIX timestamp'),
      to: z.number().optional().describe('End of time range as UNIX timestamp'),
      order: z.enum(['asc', 'desc']).optional().describe('Sort order'),
      page: z.number().optional().describe('Page number (default: 1)'),
      perPage: z.number().optional().describe('Results per page (max: 50, default: 20)')
    })
  )
  .output(
    z.object({
      contacts: z.array(
        z.object({
          contactId: z.number().describe('Unique contact identifier'),
          firstName: z.string().nullable().describe('First name'),
          lastName: z.string().nullable().describe('Last name'),
          fullName: z.string().nullable().describe('Full name'),
          companyName: z.string().nullable().describe('Company name'),
          information: z.string().nullable().describe('Additional information'),
          phoneNumbers: z
            .array(
              z.object({
                phoneNumberId: z.number(),
                label: z.string().optional(),
                value: z.string()
              })
            )
            .describe('Phone numbers'),
          emails: z
            .array(
              z.object({
                emailId: z.number(),
                label: z.string().optional(),
                value: z.string()
              })
            )
            .describe('Email addresses'),
          createdAt: z.string().optional().describe('Creation date as ISO string'),
          updatedAt: z.string().nullable().describe('Last update date as ISO string')
        })
      ),
      perPage: z.number().optional(),
      nextPageLink: z.string().nullable().optional(),
      previousPageLink: z.string().nullable().optional(),
      collectionLimit: z.number().optional(),
      historyWindowMonths: z.number().optional(),
      totalCount: z.number().describe('Total number of matching contacts'),
      currentPage: z.number().describe('Current page number')
    })
  )
  .handleInvocation(async ctx => {
    const client = new Client(ctx.auth);
    const result =
      ctx.input.phoneNumber !== undefined || ctx.input.email !== undefined
        ? await client.searchContacts(ctx.input)
        : await client.listContacts(ctx.input);
    return {
      output: {
        contacts: result.items.map(mapContact),
        totalCount: result.meta.total,
        currentPage: result.meta.currentPage,
        perPage: result.meta.perPage,
        nextPageLink: result.meta.nextPageLink,
        collectionLimit: 10000
      },
      message: `Retrieved ${result.items.length} shared contacts from native page ${result.meta.currentPage}. Narrow the date window to stay below the 10,000-result limit.`
    };
  })
  .build();
