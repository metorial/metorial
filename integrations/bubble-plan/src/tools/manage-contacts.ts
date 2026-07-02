import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listContacts = SlateTool.create(spec, {
  name: 'List Contacts',
  key: 'list_contacts',
  description: `Retrieve contacts from Project Bubble. Contacts can be filtered by client. Contacts represent people associated with clients.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      clientId: z.string().optional().describe('Filter contacts by client ID'),
      limit: z.number().optional().describe('Maximum number of records (max 1000)'),
      offset: z.number().optional().describe('Starting position for pagination')
    })
  )
  .output(
    z.object({
      contacts: z
        .array(
          z.object({
            contactId: z.string().describe('Contact ID'),
            contactName: z.string().describe('Contact name'),
            email: z.string().optional().describe('Email address'),
            tel: z.string().optional().describe('Telephone number'),
            mobile: z.string().optional().describe('Mobile number'),
            role: z.string().optional().describe('Contact role'),
            companyName: z.string().optional().describe('Company name'),
            clientId: z.string().optional().describe('Associated client ID'),
            dateCreated: z.string().optional().describe('Date created')
          })
        )
        .describe('List of contacts')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      domain: ctx.config.domain
    });

    let result = await client.getContacts({
      clientId: ctx.input.clientId,
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let data = Array.isArray(result?.data) ? result.data : result?.data ? [result.data] : [];

    let contacts = data.map((c: any) => ({
      contactId: String(c.contact_id),
      contactName: c.contact_name || '',
      email: c.email || undefined,
      tel: c.tel || undefined,
      mobile: c.mobile || undefined,
      role: c.role || undefined,
      companyName: c.company_name || undefined,
      clientId: c.client_id ? String(c.client_id) : undefined,
      dateCreated: c.date_created || undefined
    }));

    return {
      output: { contacts },
      message: `Found **${contacts.length}** contact(s).`
    };
  })
  .build();
