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
      limit: z.number().optional().default(25).describe('Maximum number of results (max 300)'),
      offset: z.number().optional().default(0).describe('Number of results to skip'),
      sort: z.string().optional().describe('Sort field with + or - prefix'),
      fields: z.string().optional().describe('Comma-separated fields to return')
    })
  )
  .output(
    z.object({
      subrentals: z.array(subrentalSchema),
      itemCount: z.number(),
      limit: z.number(),
      offset: z.number()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.list('subrentals', {
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      sort: ctx.input.sort,
      fields: ctx.input.fields
    });

    let subrentals = result.data.map((s: any) => ({
      subrentalId: s.id,
      name: s.name,
      supplier: s.supplier,
      project: s.project,
      status: s.status,
      planningFrom: s.planperiod_start,
      planningTo: s.planperiod_end,
      memo: s.memo,
      createdAt: s.created,
      updatedAt: s.modified
    }));

    return {
      output: {
        subrentals,
        itemCount: result.itemCount,
        limit: result.limit,
        offset: result.offset
      },
      message: `Found **${result.itemCount}** subrentals. Returned ${subrentals.length} subrentals (offset: ${result.offset}).`
    };
  })
  .build();
