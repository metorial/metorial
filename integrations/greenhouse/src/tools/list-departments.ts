import { SlateTool } from 'slates';
import { z } from 'zod';
import { GreenhouseClient } from '../lib/client';
import { mapDepartment } from '../lib/mappers';
import { spec } from '../spec';

export let listDepartmentsTool = SlateTool.create(spec, {
  name: 'List Departments',
  key: 'list_departments',
  description: `List all departments in Greenhouse. Returns department names, hierarchy (parent/child relationships), and external IDs.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number for pagination (starts at 1)'),
      perPage: z
        .number()
        .optional()
        .describe('Number of results per page (max 500, default 50)')
    })
  )
  .output(
    z.object({
      departments: z.array(
        z.object({
          departmentId: z.string(),
          name: z.string(),
          parentDepartmentId: z.string().nullable(),
          childDepartmentIds: z.array(z.string()),
          externalId: z.string().nullable()
        })
      ),
      hasMore: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new GreenhouseClient({
      token: ctx.auth.token,
      onBehalfOf: ctx.config.onBehalfOf
    });
    let perPage = ctx.input.perPage || 50;

    let results = await client.listDepartments({
      page: ctx.input.page,
      perPage
    });

    let departments = results.map(mapDepartment);

    return {
      output: {
        departments,
        hasMore: results.length >= perPage
      },
      message: `Found ${departments.length} department(s).`
    };
  })
  .build();
