import { SlateTool } from 'slates';
import { z } from 'zod';
import { ApaleoClient } from '../lib/client';
import { spec } from '../spec';

export let listUnits = SlateTool.create(spec, {
  name: 'List Units',
  key: 'list_units',
  description: `List rooms (units) for a property. Filter by room type, occupancy status, condition (clean/dirty/inspected), or maintenance state. Useful for housekeeping and room management workflows.`,
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      propertyId: z
        .string()
        .optional()
        .describe('Property ID (uses default from config if not set)'),
      unitGroupId: z.string().optional().describe('Filter by room type ID'),
      isOccupied: z.boolean().optional().describe('Filter by occupancy status'),
      condition: z
        .enum(['Clean', 'Dirty', 'CleanToBeInspected'])
        .optional()
        .describe('Filter by room condition'),
      pageNumber: z.number().optional().describe('Page number'),
      pageSize: z.number().optional().describe('Results per page')
    })
  )
  .output(
    z.object({
      units: z
        .array(
          z
            .object({
              unitId: z.string().describe('Unit/room ID'),
              name: z.string().optional().describe('Room name/number'),
              description: z.string().optional(),
              property: z
                .object({
                  propertyId: z.string().optional(),
                  name: z.string().optional()
                })
                .optional(),
              unitGroup: z
                .object({
                  unitGroupId: z.string().optional(),
                  name: z.string().optional()
                })
                .optional(),
              status: z
                .object({
                  isOccupied: z.boolean().optional(),
                  condition: z.string().optional(),
                  maintenance: z
                    .object({
                      maintenanceId: z.string().optional(),
                      type: z.string().optional()
                    })
                    .optional()
                })
                .optional(),
              maxPersons: z.number().optional(),
              created: z.string().optional()
            })
            .passthrough()
        )
        .describe('List of rooms'),
      count: z.number().describe('Total count')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ApaleoClient(ctx.auth.token);

    let result = await client.listUnits({
      propertyId: ctx.input.propertyId || ctx.config.propertyId,
      unitGroupId: ctx.input.unitGroupId,
      isOccupied: ctx.input.isOccupied,
      condition: ctx.input.condition,
      pageNumber: ctx.input.pageNumber,
      pageSize: ctx.input.pageSize
    });

    let units = (result.units || []).map((u: any) => ({
      unitId: u.id,
      name: u.name,
      description: u.description,
      property: u.property ? { propertyId: u.property.id, name: u.property.name } : undefined,
      unitGroup: u.unitGroup
        ? { unitGroupId: u.unitGroup.id, name: u.unitGroup.name }
        : undefined,
      status: u.status
        ? {
            isOccupied: u.status.isOccupied,
            condition: u.status.condition,
            maintenance: u.status.maintenance
              ? {
                  maintenanceId: u.status.maintenance.id,
                  type: u.status.maintenance.type
                }
              : undefined
          }
        : undefined,
      maxPersons: u.maxPersons,
      created: u.created
    }));

    return {
      output: {
        units,
        count: result.count || units.length
      },
      message: `Found **${result.count || units.length}** rooms.`
    };
  })
  .build();
