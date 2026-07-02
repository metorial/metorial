import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let listContacts = SlateTool.create(spec, {
  name: 'List Contacts',
  key: 'list_contacts',
  description: `List contacts from a saved view in Freshsales. Use the **listFilters** tool to get available view IDs. Supports pagination and sorting.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      viewId: z.number().describe('View ID to list contacts from'),
      page: z.number().optional().describe('Page number for pagination (starts at 1)'),
      sort: z
        .string()
        .optional()
        .describe(
          'Field to sort by (e.g. "created_at", "updated_at", "lead_score", "last_contacted")'
        ),
      sortType: z.enum(['asc', 'desc']).optional().describe('Sort direction')
    })
  )
  .output(
    z.object({
      contacts: z.array(
        z.object({
          contactId: z.number(),
          firstName: z.string().nullable().optional(),
          lastName: z.string().nullable().optional(),
          displayName: z.string().nullable().optional(),
          email: z.string().nullable().optional(),
          jobTitle: z.string().nullable().optional(),
          city: z.string().nullable().optional(),
          country: z.string().nullable().optional(),
          leadScore: z.number().nullable().optional(),
          createdAt: z.string().nullable().optional(),
          updatedAt: z.string().nullable().optional()
        })
      ),
      total: z.number().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let result = await client.listContacts(ctx.input.viewId, {
      page: ctx.input.page,
      sort: ctx.input.sort,
      sortType: ctx.input.sortType
    });

    let contacts = result.contacts.map((c: Record<string, any>) => ({
      contactId: c.id,
      firstName: c.first_name,
      lastName: c.last_name,
      displayName: c.display_name,
      email: c.email,
      jobTitle: c.job_title,
      city: c.city,
      country: c.country,
      leadScore: c.lead_score,
      createdAt: c.created_at,
      updatedAt: c.updated_at
    }));

    return {
      output: {
        contacts,
        total: result.meta?.total
      },
      message: `Found **${contacts.length}** contacts (total: ${result.meta?.total ?? 'unknown'}).`
    };
  })
  .build();
