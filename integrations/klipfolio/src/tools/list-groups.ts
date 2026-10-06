import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { validateInput } from '../lib/contracts';
import { spec } from '../spec';

export const listGroups = SlateTool.create(spec, {
  key: 'list_groups',
  name: 'List Groups',
  description:
    'Discover account or client groups and their IDs for membership and dashboard sharing operations.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      clientId: z.string().optional().describe('Filter by client account ID'),
      limit: z.number().optional().describe('Page size: an integer from 1 to 100; default 25'),
      offset: z.number().optional().describe('Zero-based page offset; default 0')
    })
  )
  .output(
    z.object({
      groups: z.array(
        z.object({
          groupId: z.string(),
          name: z.string().optional(),
          description: z.string().optional()
        })
      ),
      total: z.number().optional(),
      nextOffset: z.number().optional(),
      hasMore: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    validateInput(ctx.input);
    const result = await new Client({ token: ctx.auth.token }).listGroups(ctx.input);
    const groups = result.data.map((item: any) => ({
      groupId: item.id,
      name: item.name,
      description: item.description
    }));
    const offset = ctx.input.offset ?? 0;
    const hasMore =
      result.data.length > 0 &&
      (typeof result.meta?.total === 'number'
        ? offset + groups.length < result.meta.total
        : groups.length === (ctx.input.limit ?? 25));
    return {
      output: {
        groups,
        total: result.meta?.total,
        hasMore,
        nextOffset: hasMore ? offset + groups.length : undefined
      },
      message: `Found ${groups.length} group(s).`
    };
  })
  .build();
