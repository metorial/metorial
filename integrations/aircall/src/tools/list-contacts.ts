import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
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
                label: z.string(),
                value: z.string()
              })
            )
            .describe('Phone numbers'),
          emails: z
            .array(
              z.object({
                emailId: z.number(),
                label: z.string(),
                value: z.string()
              })
            )
            .describe('Email addresses'),
          createdAt: z.string().describe('Creation date as ISO string'),
          updatedAt: z.string().nullable().describe('Last update date as ISO string')
        })
      ),
      totalCount: z.number().describe('Total number of matching contacts'),
      currentPage: z.number().describe('Current page number')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);

    let hasSearchFilters = ctx.input.phoneNumber || ctx.input.email;

    let result: any;
    if (hasSearchFilters) {
      result = await client.searchContacts({
        phoneNumber: ctx.input.phoneNumber,
        email: ctx.input.email,
        order: ctx.input.order,
        page: ctx.input.page,
        perPage: ctx.input.perPage
      });
    } else {
      result = await client.listContacts({
        from: ctx.input.from,
        to: ctx.input.to,
        order: ctx.input.order,
        page: ctx.input.page,
        perPage: ctx.input.perPage
      });
    }

    let contacts = result.items.map((contact: any) => ({
      contactId: contact.id,
      firstName: contact.first_name ?? null,
      lastName: contact.last_name ?? null,
      fullName: contact.name ?? null,
      companyName: contact.company_name ?? null,
      information: contact.information ?? null,
      phoneNumbers: (contact.phone_numbers || []).map((p: any) => ({
        phoneNumberId: p.id,
        label: p.label,
        value: p.value
      })),
      emails: (contact.emails || []).map((e: any) => ({
        emailId: e.id,
        label: e.label,
        value: e.value
      })),
      createdAt: contact.created_at
        ? new Date(contact.created_at * 1000).toISOString()
        : new Date().toISOString(),
      updatedAt: contact.updated_at ? new Date(contact.updated_at * 1000).toISOString() : null
    }));

    return {
      output: {
        contacts,
        totalCount: result.meta.total,
        currentPage: result.meta.currentPage
      },
      message: `Found **${result.meta.total}** contacts (showing page ${result.meta.currentPage}, ${contacts.length} results).`
    };
  })
  .build();
