import { SlateTool } from 'slates';
import { z } from 'zod';
import { FreshdeskClient } from '../lib/client';
import { spec } from '../spec';

export let listContacts = SlateTool.create(spec, {
  name: 'List Contacts',
  key: 'list_contacts',
  description: `Lists contacts from Freshdesk with optional filtering by email, phone, company, or state. Returns paginated results.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      email: z.string().optional().describe('Filter by exact email address'),
      phone: z.string().optional().describe('Filter by phone number'),
      mobile: z.string().optional().describe('Filter by mobile number'),
      companyId: z.number().optional().describe('Filter by company ID'),
      state: z
        .enum(['blocked', 'deleted', 'unverified', 'verified'])
        .optional()
        .describe('Filter by contact state'),
      updatedSince: z
        .string()
        .optional()
        .describe('Return contacts updated after this ISO 8601 timestamp'),
      page: z.number().optional().describe('Page number for pagination')
    })
  )
  .output(
    z.object({
      contacts: z
        .array(
          z.object({
            contactId: z.number().describe('Contact ID'),
            name: z.string().describe('Full name'),
            email: z.string().nullable().describe('Primary email'),
            phone: z.string().nullable().describe('Phone number'),
            companyId: z.number().nullable().describe('Associated company ID'),
            active: z.boolean().describe('Whether the contact is active'),
            createdAt: z.string().describe('Creation timestamp'),
            updatedAt: z.string().describe('Last update timestamp')
          })
        )
        .describe('List of contacts')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FreshdeskClient({
      subdomain: ctx.config.subdomain,
      token: ctx.auth.token
    });

    let contacts = await client.listContacts({
      email: ctx.input.email,
      phone: ctx.input.phone,
      mobile: ctx.input.mobile,
      companyId: ctx.input.companyId,
      state: ctx.input.state,
      updatedSince: ctx.input.updatedSince,
      page: ctx.input.page
    });

    let mapped = contacts.map((c: any) => ({
      contactId: c.id,
      name: c.name,
      email: c.email ?? null,
      phone: c.phone ?? null,
      companyId: c.company_id ?? null,
      active: c.active ?? true,
      createdAt: c.created_at,
      updatedAt: c.updated_at
    }));

    return {
      output: { contacts: mapped },
      message: `Retrieved **${mapped.length}** contacts`
    };
  })
  .build();
