import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let subrentalSchema = z.object({
  subrentalId: z.number().describe('Unique subrental ID'),
  name: z.string().optional().describe('Subrental name'),
  supplier: z.string().optional().describe('Supplier contact reference'),
  project: z.string().optional().describe('Parent project reference'),
  status: z.string().optional().describe('Subrental status'),
  planningFrom: z.string().optional(),
  planningTo: z.string().optional(),
  memo: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional()
});

export let listSubrentals = SlateTool.create(spec, {
  name: 'List Subrentals',
  key: 'list_subrentals',
  description: `Retrieve a list of subrental jobs from Rentman. Subrentals represent equipment rented from external suppliers to fill shortages.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      limit: z
        .number()
        .optional()
        .default(25)
        .describe('Maximum number of results (max 1500)'),
      offset: z.number().optional().default(0).describe('Number of results to skip'),
      sort: z.string().optional().describe('Sort field with + or - prefix'),
      fields: z.string().optional().describe('Comma-separated fields to return'),
      cursor: z
        .string()
        .optional()
        .describe(
          'Opaque cursor token from a previous nextPageUrl. Pass it unchanged and repeat the original filters, resource IDs, sort, and fields.'
        )
    })
  )
  .output(
    z.object({
      subrentals: z.array(subrentalSchema),
      itemCount: z.number(),
      limit: z.number(),
      offset: z.number(),
      nextPageUrl: z.string().nullable().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.list('subrentals', {
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      sort: ctx.input.sort,
      fields: ctx.input.fields,
      cursor: ctx.input.cursor
    });

    let subrentals = result.data.map((s: any) => ({
      subrentalId: s.id,
      name: s.name,
      supplier: s.supplier ?? undefined,
      project: s.project,
      status: s.status,
      planningFrom: s.planperiod_start ?? undefined,
      planningTo: s.planperiod_end ?? undefined,
      memo: s.remark ?? s.memo,
      createdAt: s.created ?? undefined,
      updatedAt: s.modified ?? undefined
    }));

    return {
      output: {
        subrentals,
        itemCount: result.itemCount,
        limit: result.limit,
        offset: result.offset,
        nextPageUrl: result.next_page_url
      },
      message: `Found **${result.itemCount}** subrentals. Returned ${subrentals.length} subrentals (offset: ${result.offset}).`
    };
  })
  .build();
