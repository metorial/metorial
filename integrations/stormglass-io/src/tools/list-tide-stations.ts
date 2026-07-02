import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listTideStationsTool = SlateTool.create(spec, {
  name: 'List Tide Stations',
  key: 'list_tide_stations',
  description: `Retrieve a list of available tide stations globally or within a specified geographic bounding box. Returns station name, coordinates, and data source for each station.

Use the bounding box filter to find stations in a specific region.`,
  instructions: [
    'Call without a bounding box to list all stations globally.',
    'Provide a bounding box as "topRightLat,topRightLng:bottomLeftLat,bottomLeftLng" to filter by area.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      boundingBox: z
        .string()
        .optional()
        .describe(
          'Geographic bounding box in format "topRightLat,topRightLng:bottomLeftLat,bottomLeftLng" (e.g., "60.0,30.0:50.0,20.0"). If omitted, returns all stations globally.'
        )
    })
  )
  .output(
    z.object({
      stations: z
        .array(
          z.object({
            name: z.string().describe('Station name'),
            lat: z.number().describe('Station latitude'),
            lng: z.number().describe('Station longitude'),
            source: z.string().optional().describe('Data source for this station')
          })
        )
        .describe('List of tide stations')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result: any;
    if (ctx.input.boundingBox) {
      result = await client.getTideStationsArea({ box: ctx.input.boundingBox });
    } else {
      result = await client.getTideStations();
    }

    let stations = result.data ?? result ?? [];

    return {
      output: {
        stations: Array.isArray(stations) ? stations : []
      },
      message: `Found **${Array.isArray(stations) ? stations.length : 0}** tide stations${ctx.input.boundingBox ? ' within the specified bounding box' : ' globally'}.`
    };
  })
  .build();
