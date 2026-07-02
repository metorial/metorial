import { SlateTool } from 'slates';
import { z } from 'zod';
import { ApaleoClient } from '../lib/client';
import { spec } from '../spec';

export let listUnitGroups = SlateTool.create(spec, {
  name: 'List Room Types',
  key: 'list_unit_groups',
  description: `List room types (unit groups) for a property. Returns room type names, descriptions, max occupancy, and associated rate plans. Useful for understanding the room inventory structure.`,
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      propertyId: z
        .string()
        .optional()
        .describe('Property ID (uses default from config if not set)'),
      pageNumber: z.number().optional(),
      pageSize: z.number().optional()
    })
  )
  .output(
    z.object({
      unitGroups: z
        .array(
          z
            .object({
              unitGroupId: z.string().describe('Room type ID'),
              name: z.string().optional().describe('Room type name'),
              description: z.string().optional(),
              memberCount: z.number().optional().describe('Number of rooms of this type'),
              maxPersons: z.number().optional().describe('Maximum persons'),
              rank: z.number().optional(),
              type: z.string().optional(),
              property: z
                .object({
                  propertyId: z.string().optional(),
                  name: z.string().optional()
                })
                .optional()
            })
            .passthrough()
        )
        .describe('List of room types'),
      count: z.number().describe('Total count')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ApaleoClient(ctx.auth.token);

    let result = await client.listUnitGroups({
      propertyId: ctx.input.propertyId || ctx.config.propertyId,
      pageNumber: ctx.input.pageNumber,
      pageSize: ctx.input.pageSize
    });

    let unitGroups = (result.unitGroups || []).map((ug: any) => ({
      unitGroupId: ug.id,
      name: ug.name,
      description: ug.description,
      memberCount: ug.memberCount,
      maxPersons: ug.maxPersons,
      rank: ug.rank,
      type: ug.type,
      property: ug.property
        ? { propertyId: ug.property.id, name: ug.property.name }
        : undefined
    }));

    return {
      output: {
        unitGroups,
        count: result.count || unitGroups.length
      },
      message: `Found **${result.count || unitGroups.length}** room types.`
    };
  })
  .build();
