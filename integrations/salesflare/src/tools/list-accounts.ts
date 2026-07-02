import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listAccounts = SlateTool.create(spec, {
  name: 'List Accounts',
  key: 'list_accounts',
  description: `Search and list accounts (companies) in Salesflare. Supports filtering by name, domain, creation date, tags, address, hotness level, and more. Returns paginated results with account details.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      search: z.string().optional().describe('Full-text search across account fields'),
      name: z.string().optional().describe('Filter by account name'),
      domain: z.array(z.string()).optional().describe('Filter by domain(s)'),
      tagName: z.array(z.string()).optional().describe('Filter by tag name(s)'),
      creationAfter: z
        .string()
        .optional()
        .describe('Filter accounts created after this date (ISO 8601)'),
      creationBefore: z
        .string()
        .optional()
        .describe('Filter accounts created before this date (ISO 8601)'),
      addressCountry: z.array(z.string()).optional().describe('Filter by country'),
      addressCity: z.array(z.string()).optional().describe('Filter by city'),
      hotness: z
        .number()
        .optional()
        .describe('Filter by hotness: 1=Room temp, 2=Hot, 3=On fire'),
      limit: z.number().optional().default(20).describe('Max results to return (default 20)'),
      offset: z
        .number()
        .optional()
        .default(0)
        .describe('Number of results to skip for pagination'),
      orderBy: z
        .array(z.string())
        .optional()
        .describe('Sort order, e.g. ["name asc", "creation_date desc"]')
    })
  )
  .output(
    z.object({
      accounts: z.array(z.record(z.string(), z.any())).describe('List of account objects'),
      count: z.number().describe('Number of accounts returned')
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
    if (ctx.input.domain) params.domain = ctx.input.domain;
    if (ctx.input.tagName) params['tag.name'] = ctx.input.tagName;
    if (ctx.input.creationAfter) params.creation_after = ctx.input.creationAfter;
    if (ctx.input.creationBefore) params.creation_before = ctx.input.creationBefore;
    if (ctx.input.addressCountry) params['address.country'] = ctx.input.addressCountry;
    if (ctx.input.addressCity) params['address.city'] = ctx.input.addressCity;
    if (ctx.input.hotness !== undefined) params.hotness = ctx.input.hotness;
    if (ctx.input.orderBy) params.order_by = ctx.input.orderBy;

    let accounts = await client.listAccounts(params);
    let list = Array.isArray(accounts) ? accounts : [];

    return {
      output: {
        accounts: list,
        count: list.length
      },
      message: `Found **${list.length}** account(s).`
    };
  })
  .build();
