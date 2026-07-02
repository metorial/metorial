import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listContacts = SlateTool.create(spec, {
  name: 'List Contacts',
  key: 'list_contacts',
  description: `Retrieve a paginated list of contacts, or get a specific contact by ID. Contacts are end users who have interacted with AI agents.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      contactId: z.string().optional().describe('Specific contact ID to retrieve'),
      page: z.number().optional().describe('Page number (default 1)'),
      size: z.number().optional().describe('Items per page (default 50, max 100)')
    })
  )
  .output(
    z.object({
      contacts: z
        .array(
          z.object({
            contactId: z.string(),
            firstName: z.string().optional(),
            lastName: z.string().optional(),
            email: z.string().optional(),
            phone: z.string().optional()
          })
        )
        .optional(),
      contact: z
        .object({
          contactId: z.string(),
          firstName: z.string().optional(),
          lastName: z.string().optional(),
          email: z.string().optional(),
          phone: z.string().optional()
        })
        .optional(),
      totalCount: z.number().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.contactId) {
      let result = await client.getContact(ctx.input.contactId);
      let data = result.data || result;
      return {
        output: {
          contact: {
            contactId: data.id,
            firstName: data.first_name,
            lastName: data.last_name,
            email: data.email,
            phone: data.phone
          }
        },
        message: `Retrieved contact **${data.first_name || ''} ${data.last_name || ''}**.`
      };
    }

    let result = await client.listContacts({ page: ctx.input.page, size: ctx.input.size });
    let items = result.data || result.items || result;
    let list = Array.isArray(items) ? items : [];
    return {
      output: {
        contacts: list.map((c: any) => ({
          contactId: c.id,
          firstName: c.first_name,
          lastName: c.last_name,
          email: c.email,
          phone: c.phone
        })),
        totalCount: result.total || list.length
      },
      message: `Found **${list.length}** contact(s).`
    };
  })
  .build();
