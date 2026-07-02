import { SlateTool } from 'slates';
import { z } from 'zod';
import { KommoClient } from '../lib/client';
import { contactOutputSchema, mapContact } from '../lib/schemas';
import { spec } from '../spec';

export let listContactsTool = SlateTool.create(spec, {
  name: 'List Contacts',
  key: 'list_contacts',
  description: `Search and list contacts in Kommo. Supports filtering by search query, responsible user, and contact IDs. Returns contacts with their linked leads, tags, and custom fields.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      query: z.string().optional().describe('Full-text search query'),
      contactIds: z.array(z.number()).optional().describe('Filter by specific contact IDs'),
      responsibleUserIds: z
        .array(z.number())
        .optional()
        .describe('Filter by responsible user IDs'),
      orderBy: z.enum(['created_at', 'updated_at', 'id']).optional().describe('Sort field'),
      orderDir: z.enum(['asc', 'desc']).optional().describe('Sort direction'),
      page: z.number().optional().describe('Page number'),
      limit: z.number().optional().describe('Results per page (max 250)')
    })
  )
  .output(
    z.object({
      contacts: z.array(contactOutputSchema)
    })
  )
  .handleInvocation(async ctx => {
    let client = new KommoClient({
      token: ctx.auth.token,
      subdomain: ctx.config.subdomain
    });

    let contacts = await client.listContacts(
      {
        query: ctx.input.query,
        ids: ctx.input.contactIds,
        responsibleUserIds: ctx.input.responsibleUserIds,
        orderBy: ctx.input.orderBy,
        orderDir: ctx.input.orderDir
      },
      { page: ctx.input.page, limit: ctx.input.limit }
    );

    let mapped = contacts.map(mapContact);

    return {
      output: { contacts: mapped },
      message: `Found **${mapped.length}** contact(s).`
    };
  })
  .build();
