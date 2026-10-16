import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { researchTaskSchema } from '../lib/schemas';
import { spec } from '../spec';

export let listResearch = SlateTool.create(spec, {
  name: 'List Research',
  key: 'list_research',
  description:
    'List research tasks in the connected organization with IDs, status, inputs, completed outputs, and pagination metadata. Use get_research to check an individual task.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      page: z.number().int().min(1).optional().describe('Page number; default 1'),
      pageSize: z
        .number()
        .int()
        .min(1)
        .max(100)
        .optional()
        .describe('Tasks per page; default 10, maximum 100'),
      sortBy: z.enum(['createdAt', 'updatedAt']).optional(),
      sortDirection: z.enum(['asc', 'desc']).optional().describe('Sort direction; default asc')
    })
  )
  .output(
    z
      .object({
        data: z.array(researchTaskSchema),
        metadata: z
          .object({
            page: z.number(),
            pageSize: z.number(),
            total: z.number(),
            totalPages: z.number()
          })
          .passthrough()
      })
      .passthrough()
  )
  .handleInvocation(async ctx => {
    let result = await new Client({ token: ctx.auth.token }).listResearch(ctx.input);
    return {
      output: result,
      message: `Returned **${result.data.length}** research task(s), page **${result.metadata.page}** of **${result.metadata.totalPages}**.`
    };
  })
  .build();
