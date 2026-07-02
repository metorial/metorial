import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let dimensionSchema = z.object({
  areaCeiling: z.number().nullable().optional(),
  areaFloor: z.number().nullable().optional(),
  areaFloorIndoor: z.number().nullable().optional(),
  areaWall: z.number().nullable().optional(),
  volume: z.number().nullable().optional(),
  depth: z.number().nullable().optional(),
  height: z.number().nullable().optional(),
  width: z.number().nullable().optional(),
  units: z.string().nullable().optional()
});

export let getDimensions = SlateTool.create(spec, {
  name: 'Get Dimensions',
  key: 'get_dimensions',
  description: `Retrieve dimensional data (area, volume, height, width, depth) for a Matterport model, broken down by overall model, individual floors, and individual rooms. Useful for spatial intelligence and property analysis.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      modelId: z.string().describe('The unique ID of the Matterport model'),
      units: z
        .enum(['metric', 'imperial'])
        .optional()
        .describe('Measurement unit system for floor dimensions')
    })
  )
  .output(
    z.object({
      modelName: z.string().nullable().describe('Name of the model'),
      modelDescription: z.string().nullable().describe('Description of the model'),
      overallDimensions: dimensionSchema.nullable().describe('Overall model dimensions'),
      floors: z
        .array(
          z.object({
            floorId: z.string().describe('Floor identifier'),
            floorLabel: z.string().nullable().optional().describe('Floor label'),
            dimensions: dimensionSchema.nullable().describe('Floor dimensions')
          })
        )
        .describe('Per-floor dimensional data'),
      rooms: z
        .array(
          z.object({
            roomId: z.string().describe('Room identifier'),
            roomLabel: z
              .string()
              .nullable()
              .optional()
              .describe('Room label or classification'),
            roomTags: z
              .array(z.string())
              .nullable()
              .optional()
              .describe('Room tags/categories'),
            dimensions: dimensionSchema.nullable().describe('Room dimensions')
          })
        )
        .describe('Per-room dimensional data')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      authType: ctx.auth.authType
    });

    let model = await client.getDimensions(ctx.input.modelId, ctx.input.units);

    let floors = (model.floors || []).map((f: any) => ({
      floorId: f.id,
      floorLabel: f.label || null,
      dimensions: f.dimensions || null
    }));

    let rooms = (model.rooms || []).map((r: any) => ({
      roomId: r.id,
      roomLabel: r.label || null,
      roomTags: r.tags || null,
      dimensions: r.dimensions || null
    }));

    return {
      output: {
        modelName: model.name || null,
        modelDescription: model.description || null,
        overallDimensions: model.dimensions || null,
        floors,
        rooms
      },
      message: `Retrieved dimensions for model **${model.name || ctx.input.modelId}**: ${floors.length} floors, ${rooms.length} rooms.`
    };
  })
  .build();
