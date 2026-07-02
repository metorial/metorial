import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let searchContacts = SlateTool.create(spec, {
  name: 'Search Contacts',
  key: 'search_contacts',
  description: `Search for contacts using filters such as cell numbers, tags, and date ranges. Supports pagination. Costs 10 credits per request.`,
  constraints: ['Costs 10 credits per request'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      cells: z.array(z.string()).optional().describe('Filter by cell numbers (MSISDNs)'),
      tagIdsIn: z
        .array(z.string())
        .optional()
        .describe('Filter contacts that have any of these tag IDs'),
      tagIdsAll: z
        .array(z.string())
        .optional()
        .describe('Filter contacts that have all of these tag IDs'),
      updatedAfter: z
        .string()
        .optional()
        .describe('Filter contacts updated on or after this date (ISO 8601)'),
      updatedBefore: z
        .string()
        .optional()
        .describe('Filter contacts updated on or before this date (ISO 8601)'),
      skip: z.number().optional().describe('Number of records to skip for pagination'),
      limit: z.number().optional().describe('Maximum number of contacts to return')
    })
  )
  .output(
    z.object({
      contacts: z.array(z.any()).describe('Array of matching contact records')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let find: Record<string, any> = {};
    if (ctx.input.cells) find.cell = ctx.input.cells;
    if (ctx.input.tagIdsIn || ctx.input.tagIdsAll) {
      find.tag_ids = {};
      if (ctx.input.tagIdsIn) find.tag_ids.$in = ctx.input.tagIdsIn;
      if (ctx.input.tagIdsAll) find.tag_ids.$all = ctx.input.tagIdsAll;
    }
    if (ctx.input.updatedAfter || ctx.input.updatedBefore) {
      find.updatedAt = {};
      if (ctx.input.updatedAfter) find.updatedAt.$gte = ctx.input.updatedAfter;
      if (ctx.input.updatedBefore) find.updatedAt.$lte = ctx.input.updatedBefore;
    }

    let options: Record<string, number> = {};
    if (ctx.input.skip !== undefined) options.skip = ctx.input.skip;
    if (ctx.input.limit !== undefined) options.limit = ctx.input.limit;

    let result = await client.searchContacts({
      find: Object.keys(find).length > 0 ? find : undefined,
      options: Object.keys(options).length > 0 ? options : undefined
    });

    let contacts = result.data?.contacts ?? [];
    return {
      output: { contacts },
      message: `Found **${contacts.length}** contact(s).`
    };
  })
  .build();
