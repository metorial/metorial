import { SlateTool } from 'slates';
import { z } from 'zod';
import { ApaleoClient } from '../lib/client';
import { spec } from '../spec';

export let listBlocks = SlateTool.create(spec, {
  name: 'List Blocks',
  key: 'list_blocks',
  description: `List room blocks for a property. Blocks reserve a set of rooms for group bookings. Filter by property, group, status, or date range. Returns block details including allocated rooms and pick-up status.`,
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      propertyId: z.string().optional().describe('Property ID'),
      groupId: z.string().optional().describe('Filter by group ID'),
      status: z
        .enum(['Tentative', 'Definite', 'Washed', 'Canceled'])
        .optional()
        .describe('Filter by block status'),
      from: z.string().optional().describe('From date (YYYY-MM-DD)'),
      to: z.string().optional().describe('To date (YYYY-MM-DD)'),
      pageNumber: z.number().optional(),
      pageSize: z.number().optional()
    })
  )
  .output(
    z.object({
      blocks: z
        .array(
          z
            .object({
              blockId: z.string().describe('Block ID'),
              groupId: z.string().optional(),
              status: z.string().optional(),
              property: z
                .object({
                  propertyId: z.string().optional(),
                  name: z.string().optional()
                })
                .optional(),
              from: z.string().optional(),
              to: z.string().optional(),
              blockedUnits: z.number().optional(),
              pickedReservations: z.number().optional(),
              created: z.string().optional(),
              modified: z.string().optional()
            })
            .passthrough()
        )
        .describe('List of blocks'),
      count: z.number().describe('Total count')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ApaleoClient(ctx.auth.token);

    let result = await client.listBlocks({
      propertyId: ctx.input.propertyId || ctx.config.propertyId,
      groupId: ctx.input.groupId,
      status: ctx.input.status,
      from: ctx.input.from,
      to: ctx.input.to,
      pageNumber: ctx.input.pageNumber,
      pageSize: ctx.input.pageSize
    });

    let blocks = (result.blocks || []).map((b: any) => ({
      blockId: b.id,
      groupId: b.group?.id,
      status: b.status,
      property: b.property ? { propertyId: b.property.id, name: b.property.name } : undefined,
      from: b.from,
      to: b.to,
      blockedUnits: b.blockedUnits,
      pickedReservations: b.pickedReservations,
      created: b.created,
      modified: b.modified
    }));

    return {
      output: {
        blocks,
        count: result.count || blocks.length
      },
      message: `Found **${result.count || blocks.length}** blocks.`
    };
  })
  .build();
