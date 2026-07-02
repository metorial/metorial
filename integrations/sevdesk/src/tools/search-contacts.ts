import { SlateTool } from 'slates';
import { z } from 'zod';
import { SevdeskClient } from '../lib/client';
import { spec } from '../spec';

export let searchContacts = SlateTool.create(spec, {
  name: 'Search Contacts',
  key: 'search_contacts',
  description: `Search and list contacts in sevDesk. Filter by name, customer number, or category. Supports pagination for large result sets.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      name: z.string().optional().describe('Filter by name (partial match)'),
      customerNumber: z.string().optional().describe('Filter by customer number'),
      depth: z.number().optional().describe('Depth of nested objects (0=flat, 1=with nested)'),
      limit: z.number().optional().describe('Max number of results (default: 100, max: 1000)'),
      offset: z.number().optional().describe('Result offset for pagination')
    })
  )
  .output(
    z.object({
      contacts: z.array(
        z.object({
          contactId: z.string().describe('Contact ID'),
          name: z.string().optional().describe('Display name'),
          familyName: z.string().optional(),
          firstName: z.string().optional(),
          customerNumber: z.string().optional(),
          description: z.string().optional(),
          categoryId: z.string().optional(),
          createdAt: z.string().optional(),
          updatedAt: z.string().optional()
        })
      ),
      totalCount: z.number().describe('Number of contacts returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SevdeskClient({ token: ctx.auth.token });

    let results = await client.listContacts({
      name: ctx.input.name,
      customerNumber: ctx.input.customerNumber,
      depth: ctx.input.depth,
      limit: ctx.input.limit ?? 100,
      offset: ctx.input.offset
    });

    let contacts = (results ?? []).map((c: any) => ({
      contactId: String(c.id),
      name: c.name || [c.surename, c.familyname].filter(Boolean).join(' ') || undefined,
      familyName: c.familyname ?? undefined,
      firstName: c.surename ?? undefined,
      customerNumber: c.customerNumber ?? undefined,
      description: c.description ?? undefined,
      categoryId: c.category?.id ? String(c.category.id) : undefined,
      createdAt: c.create ?? undefined,
      updatedAt: c.update ?? undefined
    }));

    return {
      output: {
        contacts,
        totalCount: contacts.length
      },
      message: `Found **${contacts.length}** contact(s).`
    };
  })
  .build();
