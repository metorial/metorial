import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let searchContacts = SlateTool.create(spec, {
  name: 'Search Contacts',
  key: 'search_contacts',
  description: `Searches and lists contacts with optional filters for email, list, tag, and status. Supports pagination and free-text search across contact fields.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      search: z.string().optional().describe('Free-text search query across contact fields'),
      email: z.string().optional().describe('Filter by exact email address'),
      listId: z.string().optional().describe('Filter by list ID'),
      tagId: z.string().optional().describe('Filter by tag ID'),
      status: z
        .number()
        .optional()
        .describe(
          'Filter by status (-1=any, 0=unconfirmed, 1=active, 2=unsubscribed, 3=bounced)'
        ),
      limit: z
        .number()
        .optional()
        .describe('Maximum number of contacts to return (default 20, max 100)'),
      offset: z.number().optional().describe('Number of contacts to skip for pagination')
    })
  )
  .output(
    z.object({
      contacts: z.array(
        z.object({
          contactId: z.string(),
          email: z.string(),
          firstName: z.string().optional(),
          lastName: z.string().optional(),
          phone: z.string().optional(),
          createdAt: z.string().optional(),
          updatedAt: z.string().optional()
        })
      ),
      totalCount: z
        .number()
        .optional()
        .describe('Total number of contacts matching the search')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiUrl: ctx.config.apiUrl
    });

    let params: Record<string, any> = {};
    if (ctx.input.search) params.search = ctx.input.search;
    if (ctx.input.email) params.email = ctx.input.email;
    if (ctx.input.listId) params.listid = ctx.input.listId;
    if (ctx.input.tagId) params.tagid = ctx.input.tagId;
    if (ctx.input.status !== undefined) params.status = ctx.input.status;
    if (ctx.input.limit) params.limit = ctx.input.limit;
    if (ctx.input.offset) params.offset = ctx.input.offset;

    let result = await client.listContacts(params);

    let contacts = (result.contacts || []).map((c: any) => ({
      contactId: c.id,
      email: c.email,
      firstName: c.firstName || undefined,
      lastName: c.lastName || undefined,
      phone: c.phone || undefined,
      createdAt: c.cdate || undefined,
      updatedAt: c.udate || undefined
    }));

    let totalCount = result.meta?.total ? Number(result.meta.total) : undefined;

    return {
      output: { contacts, totalCount },
      message: `Found **${contacts.length}** contacts${totalCount !== undefined ? ` (out of ${totalCount} total)` : ''}.`
    };
  })
  .build();
