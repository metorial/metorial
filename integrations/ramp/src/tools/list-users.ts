import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listUsers = SlateTool.create(spec, {
  name: 'List Users',
  key: 'list_users',
  description: `Retrieve a paginated list of Ramp users. Supports filtering by department, location, and entity.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      cursor: z.string().optional().describe('Pagination cursor from a previous response'),
      pageSize: z
        .number()
        .min(2)
        .max(100)
        .optional()
        .describe('Number of results per page (2-100)'),
      departmentId: z.string().optional().describe('Filter by department ID'),
      locationId: z.string().optional().describe('Filter by location ID'),
      entityId: z.string().optional().describe('Filter by business entity ID')
    })
  )
  .output(
    z.object({
      users: z.array(z.any()).describe('List of user objects'),
      nextCursor: z.string().optional().describe('Cursor for fetching the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      environment: ctx.config.environment
    });

    let result = await client.listUsers({
      start: ctx.input.cursor,
      pageSize: ctx.input.pageSize,
      departmentId: ctx.input.departmentId,
      locationId: ctx.input.locationId,
      entityId: ctx.input.entityId
    });

    return {
      output: {
        users: result.data,
        nextCursor: result.page?.next
      },
      message: `Retrieved **${result.data.length}** users${result.page?.next ? ' (more pages available)' : ''}.`
    };
  })
  .build();
