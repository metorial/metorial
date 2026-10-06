import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export const listSquads = SlateTool.create(spec, {
  name: 'List Squads',
  key: 'list_squads',
  description:
    'Discover squads and their assistant members before managing squads or creating calls.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      limit: z
        .number()
        .int()
        .min(0)
        .max(1000)
        .optional()
        .describe('Maximum results; defaults to 100'),
      createdAfter: z.string().optional().describe('Exclusive ISO timestamp lower bound'),
      createdBefore: z.string().optional().describe('Exclusive ISO timestamp upper bound')
    })
  )
  .output(
    z.object({
      squads: z.array(
        z.object({
          squadId: z.string(),
          name: z.string().optional(),
          members: z.unknown().optional(),
          createdAt: z.string().optional(),
          updatedAt: z.string().optional()
        })
      ),
      count: z.number()
    })
  )
  .handleInvocation(async ctx => {
    let squads = await new Client(ctx.auth.token, ctx.auth.region).listSquads({
      limit: ctx.input.limit,
      createdAtGt: ctx.input.createdAfter,
      createdAtLt: ctx.input.createdBefore
    });
    return {
      output: {
        squads: squads.map(squad => ({
          squadId: squad.id,
          name: squad.name,
          members: squad.members,
          createdAt: squad.createdAt,
          updatedAt: squad.updatedAt
        })),
        count: squads.length
      },
      message: `Found ${squads.length} squad(s).`
    };
  })
  .build();
