import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listContacts = SlateTool.create(spec, {
  name: 'List Contacts',
  key: 'list_contacts',
  description:
    'Find client contacts and their UUIDs for manage_contact. Optionally select a client from list_clients and filter by companyUuid.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      companyUuid: z
        .uuid()
        .optional()
        .describe('Client UUID from list_clients. Omit to list contacts across clients.'),
      filter: z
        .string()
        .optional()
        .describe('Optional OData-style filter; combined with the company filter using and')
    })
  )
  .output(
    z.object({
      contacts: z.array(
        z.object({
          contactUuid: z.string(),
          companyUuid: z.string().optional(),
          firstName: z.string().optional(),
          lastName: z.string().optional(),
          email: z.string().optional(),
          phone: z.string().optional(),
          mobile: z.string().optional(),
          type: z.string().optional(),
          isPrimary: z.string().optional(),
          active: z.number().optional()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let filter = [
      ctx.input.companyUuid ? `company_uuid eq '${ctx.input.companyUuid}'` : undefined,
      ctx.input.filter
    ]
      .filter(Boolean)
      .join(' and ');
    let contacts = await new Client(ctx.auth).listCompanyContacts({
      filter: filter || undefined
    });
    return {
      output: {
        contacts: contacts.map(contact => ({
          contactUuid: contact.uuid,
          companyUuid: contact.company_uuid,
          firstName: contact.first,
          lastName: contact.last,
          email: contact.email,
          phone: contact.phone,
          mobile: contact.mobile,
          type: contact.type,
          isPrimary: contact.is_primary_contact,
          active: contact.active
        }))
      },
      message: `Found **${contacts.length}** client contact(s).`
    };
  })
  .build();
