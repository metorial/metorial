import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listResourceAllocations = SlateTool.create(spec, {
  name: 'List Resource Allocations',
  key: 'list_resource_allocations',
  description: `Retrieves resource allocation data from Rocketlane. Provides visibility into team workload and capacity planning across projects. Can be filtered by project or user.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: z.number().optional().describe('Filter allocations by project ID'),
      userId: z.number().optional().describe('Filter allocations by user ID'),
      offset: z.number().optional().describe('Pagination offset'),
      limit: z.number().optional().describe('Maximum number of allocations to return')
    })
  )
  .output(
    z.object({
      allocations: z
        .array(
          z.object({
            allocationId: z.number().optional().describe('Allocation ID'),
            projectId: z.number().optional().describe('Project ID'),
            userId: z.number().optional().describe('User ID'),
            hours: z.number().optional().describe('Allocated hours'),
            startDate: z.string().nullable().optional().describe('Allocation start date'),
            endDate: z.string().nullable().optional().describe('Allocation end date')
          })
        )
        .describe('List of resource allocations')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listResourceAllocations({
      projectId: ctx.input.projectId,
      userId: ctx.input.userId,
      offset: ctx.input.offset,
      limit: ctx.input.limit
    });

    let allocations = Array.isArray(result)
      ? result
      : (result.allocations ?? result.data ?? []);

    return {
      output: { allocations },
      message: `Found **${allocations.length}** resource allocation(s).`
    };
  })
  .build();
