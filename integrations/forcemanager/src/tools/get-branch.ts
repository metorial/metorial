import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getBranch = SlateTool.create(spec, {
  name: 'Get Branch',
  key: 'get_branch',
  description:
    'Retrieve a branch by ID or discover available branches and their names. Use branch IDs when creating accounts, opportunities, or sales orders.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      branchId: z
        .number()
        .int()
        .positive()
        .optional()
        .describe('Branch ID to retrieve. Omit to list branches.'),
      query: z
        .string()
        .optional()
        .describe('ForceManager query language filter for the branch list'),
      page: z.number().int().nonnegative().optional().describe('Page number (0-indexed)')
    })
  )
  .output(
    z.object({
      branches: z.array(z.any()).describe('Branch records with IDs and localized names'),
      totalCount: z.number().describe('Number of records returned'),
      nextPage: z
        .number()
        .nullable()
        .describe('Request this page until an empty page returns null')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);
    if (ctx.input.branchId !== undefined) {
      let branch = await client.getById('branches', ctx.input.branchId);
      return {
        output: { branches: [branch], totalCount: 1, nextPage: null },
        message: `Retrieved branch ID **${ctx.input.branchId}**`
      };
    }
    let result = await client.list('branches', { q: ctx.input.query }, ctx.input.page);
    return {
      output: {
        branches: result.records,
        totalCount: result.entityCount,
        nextPage: result.nextPage
      },
      message: `Retrieved **${result.entityCount}** branch(es)`
    };
  })
  .build();
