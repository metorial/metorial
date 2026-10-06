import { SlateTool } from 'slates';
import { z } from 'zod';
import { GreenhouseClient } from '../lib/client';
import { departmentOutputSchema, mapDepartment } from '../lib/mappers';
import { spec } from '../spec';
export const listDepartmentsTool = SlateTool.create(spec, {
  key: 'list_departments',
  name: 'List Departments',
  description:
    'List department names, parent IDs and external IDs. Follow nextCursor to retrieve further results.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      cursor: z
        .string()
        .optional()
        .describe(
          'Opaque nextCursor from the preceding response. Pass cursor alone for subsequent pages.'
        ),
      page: z
        .number()
        .optional()
        .describe(
          'Legacy first-page selector. Only page 1 is supported; use cursor for subsequent pages.'
        ),
      perPage: z
        .number()
        .optional()
        .describe('Number of results per page (max 500, default 50)')
    })
  )
  .output(
    z.object({
      departments: z.array(departmentOutputSchema),
      hasMore: z.boolean(),
      nextCursor: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    const page = await new GreenhouseClient(ctx.auth, ctx.config).listDepartments(ctx.input);
    return {
      output: {
        departments: page.items.map(mapDepartment),
        hasMore: page.hasMore,
        nextCursor: page.nextCursor
      },
      message: `Retrieved ${page.items.length} result(s).`
    };
  })
  .build();
