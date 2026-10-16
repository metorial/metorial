import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listUsers = SlateTool.create(spec, {
  name: 'List Users',
  key: 'list_users',
  description:
    'List account users with IDs for preparedById and senderId when creating, updating, or sending proposals.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number (defaults to 1)'),
      perPage: z.number().optional().describe('Users per page (defaults to 25)')
    })
  )
  .output(
    z.object({
      users: z.array(z.object({ userId: z.string(), email: z.string(), name: z.string() })),
      currentPage: z.number(),
      totalPages: z.number(),
      totalCount: z.number(),
      nextPage: z.number().nullable(),
      raw: z.record(z.string(), z.unknown()).optional()
    })
  )
  .handleInvocation(async ctx => {
    let result = await new Client(ctx.auth).listUsers(ctx.input.page, ctx.input.perPage);
    return {
      output: { users: result.items, ...result.pagination, raw: result.raw },
      message: `Found **${result.items.length}** users on page ${result.pagination.currentPage}.`
    };
  })
  .build();
