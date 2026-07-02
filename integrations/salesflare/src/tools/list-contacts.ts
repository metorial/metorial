import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listContacts = SlateTool.create(spec, {
  name: 'List Contacts',
  key: 'list_contacts',
  description: `Search and list contacts in Salesflare. Supports filtering by name, email, phone number, domain, account, tags, role, address, creation/modification dates, and more. Supports incremental syncing via **modificationAfter**.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      search: z.string().optional().describe('Full-text search across contact fields'),
      name: z.string().optional().describe('Filter by contact name'),
      email: z.string().optional().describe('Filter by email address'),
      phoneNumber: z.string().optional().describe('Filter by phone number'),
      domain: z.string().optional().describe('Filter by email domain'),
      accountId: z.number().optional().describe('Filter by account ID'),
      tagName: z.array(z.string()).optional().describe('Filter by tag name(s)'),
      role: z.array(z.string()).optional().describe('Filter by position role'),
      modificationAfter: z
        .string()
        .optional()
        .describe(
          'Only return contacts modified after this date (ISO 8601). Useful for incremental sync.'
        ),
      modificationBefore: z
        .string()
        .optional()
        .describe('Only return contacts modified before this date (ISO 8601)'),
      creationAfter: z
        .string()
        .optional()
        .describe('Only return contacts created after this date (ISO 8601)'),
      creationBefore: z
        .string()
        .optional()
        .describe('Only return contacts created before this date (ISO 8601)'),
      includeArchived: z.boolean().optional().describe('Include archived contacts'),
      limit: z.number().optional().default(20).describe('Max results to return (default 20)'),
      offset: z
        .number()
        .optional()
        .default(0)
        .describe('Number of results to skip for pagination'),
      orderBy: z.array(z.string()).optional().describe('Sort order, e.g. ["name asc"]')
    })
  )
  .output(
    z.object({
      contacts: z.array(z.record(z.string(), z.any())).describe('List of contact objects'),
      count: z.number().describe('Number of contacts returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let params: Record<string, any> = {
      limit: ctx.input.limit,
      offset: ctx.input.offset
    };
    if (ctx.input.search) params.search = ctx.input.search;
    if (ctx.input.name) params.name = ctx.input.name;
    if (ctx.input.email) params.email = ctx.input.email;
    if (ctx.input.phoneNumber) params.phone_number = ctx.input.phoneNumber;
    if (ctx.input.domain) params.domain = ctx.input.domain;
    if (ctx.input.accountId) params.account = ctx.input.accountId;
    if (ctx.input.tagName) params['tag.name'] = ctx.input.tagName;
    if (ctx.input.role) params['position.role'] = ctx.input.role;
    if (ctx.input.modificationAfter) params.modification_after = ctx.input.modificationAfter;
    if (ctx.input.modificationBefore)
      params.modification_before = ctx.input.modificationBefore;
    if (ctx.input.creationAfter) params.creation_after = ctx.input.creationAfter;
    if (ctx.input.creationBefore) params.creation_before = ctx.input.creationBefore;
    if (ctx.input.includeArchived !== undefined)
      params.includeArchived = ctx.input.includeArchived;
    if (ctx.input.orderBy) params.order_by = ctx.input.orderBy;

    let contacts = await client.listContacts(params);
    let list = Array.isArray(contacts) ? contacts : [];

    return {
      output: {
        contacts: list,
        count: list.length
      },
      message: `Found **${list.length}** contact(s).`
    };
  })
  .build();
