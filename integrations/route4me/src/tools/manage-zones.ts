import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let territoryDataSchema = z.object({
  type: z.string().describe('Shape type: circle, poly, or rect'),
  data: z
    .array(z.string())
    .describe(
      'Shape data: for circle ["center_lat,center_lng", "radius_in_meters"], for poly/rect array of "lat,lng" coordinate pairs'
    )
});

export let getAvoidanceZones = SlateTool.create(spec, {
  name: 'Get Avoidance Zones',
  key: 'get_avoidance_zones',
  description: `List all avoidance zones or retrieve a specific one. Avoidance zones are geographic areas that routes should avoid during optimization.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      territoryId: z
        .string()
        .optional()
        .describe('Specific avoidance zone ID. Omit to list all.')
    })
  )
  .output(
    z.object({
      zones: z
        .array(
          z.object({
            territoryId: z.string().describe('Avoidance zone territory ID'),
            territoryName: z.string().optional().describe('Zone name'),
            territoryColor: z.string().optional().describe('Zone display color'),
            territory: z.any().optional().describe('Territory shape data')
          })
        )
        .describe('List of avoidance zones')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.territoryId) {
      let z = await client.getAvoidanceZone(ctx.input.territoryId);
      return {
        output: {
          zones: [
            {
              territoryId: z.territory_id,
              territoryName: z.territory_name,
              territoryColor: z.territory_color,
              territory: z.territory
            }
          ]
        },
        message: `Retrieved avoidance zone **${z.territory_id}** "${z.territory_name || ''}".`
      };
    }

    let result = await client.getAvoidanceZones();
    let items = Array.isArray(result) ? result : [];

    return {
      output: {
        zones: items.map((z: any) => ({
          territoryId: z.territory_id,
          territoryName: z.territory_name,
          territoryColor: z.territory_color,
          territory: z.territory
        }))
      },
      message: `Retrieved ${items.length} avoidance zone(s).`
    };
  })
  .build();

export let createAvoidanceZone = SlateTool.create(spec, {
  name: 'Create Avoidance Zone',
  key: 'create_avoidance_zone',
  description: `Create a new avoidance zone. Routes will avoid this geographic area during optimization. Define the zone as a circle, polygon, or rectangle.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      territoryName: z.string().describe('Name for the avoidance zone'),
      territoryColor: z.string().optional().describe('Display color (hex code)'),
      territory: territoryDataSchema.describe('Shape definition for the zone')
    })
  )
  .output(
    z.object({
      territoryId: z.string().describe('Created avoidance zone ID'),
      territoryName: z.string().optional().describe('Zone name')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let body = {
      territory_name: ctx.input.territoryName,
      territory_color: ctx.input.territoryColor,
      territory: {
        type: ctx.input.territory.type,
        data: ctx.input.territory.data
      }
    };

    let result = await client.createAvoidanceZone(body);

    return {
      output: {
        territoryId: result.territory_id,
        territoryName: result.territory_name
      },
      message: `Created avoidance zone **${result.territory_id}** "${ctx.input.territoryName}".`
    };
  })
  .build();

export let deleteAvoidanceZone = SlateTool.create(spec, {
  name: 'Delete Avoidance Zone',
  key: 'delete_avoidance_zone',
  description: `Delete an avoidance zone. This action is permanent.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      territoryId: z.string().describe('Avoidance zone territory ID to delete')
    })
  )
  .output(
    z.object({
      territoryId: z.string().describe('Deleted zone ID'),
      deleted: z.boolean().describe('Whether deletion succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.deleteAvoidanceZone(ctx.input.territoryId);
    return {
      output: { territoryId: ctx.input.territoryId, deleted: true },
      message: `Deleted avoidance zone **${ctx.input.territoryId}**.`
    };
  })
  .build();

export let getTerritories = SlateTool.create(spec, {
  name: 'Get Territories',
  key: 'get_territories',
  description: `List all territories or retrieve a specific one. Territories define service areas for organizing operations geographically.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      territoryId: z.string().optional().describe('Specific territory ID. Omit to list all.')
    })
  )
  .output(
    z.object({
      territories: z
        .array(
          z.object({
            territoryId: z.string().describe('Territory ID'),
            territoryName: z.string().optional().describe('Territory name'),
            territoryColor: z.string().optional().describe('Display color'),
            territory: z.any().optional().describe('Territory shape data')
          })
        )
        .describe('List of territories')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.territoryId) {
      let t = await client.getTerritory(ctx.input.territoryId);
      return {
        output: {
          territories: [
            {
              territoryId: t.territory_id,
              territoryName: t.territory_name,
              territoryColor: t.territory_color,
              territory: t.territory
            }
          ]
        },
        message: `Retrieved territory **${t.territory_id}** "${t.territory_name || ''}".`
      };
    }

    let result = await client.getTerritories();
    let items = Array.isArray(result) ? result : [];

    return {
      output: {
        territories: items.map((t: any) => ({
          territoryId: t.territory_id,
          territoryName: t.territory_name,
          territoryColor: t.territory_color,
          territory: t.territory
        }))
      },
      message: `Retrieved ${items.length} territory/territories.`
    };
  })
  .build();

export let createTerritory = SlateTool.create(spec, {
  name: 'Create Territory',
  key: 'create_territory',
  description: `Create a new territory for organizing operations geographically. Define the territory as a circle, polygon, or rectangle.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      territoryName: z.string().describe('Name for the territory'),
      territoryColor: z.string().optional().describe('Display color (hex code)'),
      territory: territoryDataSchema.describe('Shape definition for the territory')
    })
  )
  .output(
    z.object({
      territoryId: z.string().describe('Created territory ID'),
      territoryName: z.string().optional().describe('Territory name')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let body = {
      territory_name: ctx.input.territoryName,
      territory_color: ctx.input.territoryColor,
      territory: {
        type: ctx.input.territory.type,
        data: ctx.input.territory.data
      }
    };

    let result = await client.createTerritory(body);

    return {
      output: {
        territoryId: result.territory_id,
        territoryName: result.territory_name
      },
      message: `Created territory **${result.territory_id}** "${ctx.input.territoryName}".`
    };
  })
  .build();

export let deleteTerritory = SlateTool.create(spec, {
  name: 'Delete Territory',
  key: 'delete_territory',
  description: `Delete a territory. This action is permanent.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      territoryId: z.string().describe('Territory ID to delete')
    })
  )
  .output(
    z.object({
      territoryId: z.string().describe('Deleted territory ID'),
      deleted: z.boolean().describe('Whether deletion succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.deleteTerritory(ctx.input.territoryId);
    return {
      output: { territoryId: ctx.input.territoryId, deleted: true },
      message: `Deleted territory **${ctx.input.territoryId}**.`
    };
  })
  .build();
