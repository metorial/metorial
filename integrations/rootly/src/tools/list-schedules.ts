import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, flattenResources, type JsonApiResource } from '../lib/client';
import { spec } from '../spec';

export let listSchedules = SlateTool.create(spec, {
  name: 'List Schedules',
  key: 'list_schedules',
  description: `List on-call schedules. Search by name or keyword to find specific schedules.
Returns schedule configuration details including rotation settings and coverage information.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      search: z.string().optional().describe('Search schedules by keyword'),
      name: z.string().optional().describe('Filter by exact schedule name'),
      include: z
        .string()
        .optional()
        .describe('Include related resources like "schedule_rotations"'),
      pageNumber: z.number().optional().describe('Page number'),
      pageSize: z.number().optional().describe('Results per page')
    })
  )
  .output(
    z.object({
      schedules: z.array(z.record(z.string(), z.any())).describe('List of schedules'),
      totalCount: z.number().optional().describe('Total count')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listSchedules({
      search: ctx.input.search,
      name: ctx.input.name,
      include: ctx.input.include,
      pageNumber: ctx.input.pageNumber,
      pageSize: ctx.input.pageSize
    });

    let schedules = flattenResources(result.data as JsonApiResource[]);

    return {
      output: {
        schedules,
        totalCount: result.meta?.total_count
      },
      message: `Found **${schedules.length}** schedules.`
    };
  })
  .build();
