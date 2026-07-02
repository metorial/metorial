import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let wildfireRecordSchema = z
  .object({
    lat: z.number().optional().describe('Fire latitude'),
    lon: z.number().optional().describe('Fire longitude'),
    confidence: z.string().optional().describe('Detection confidence'),
    frp: z.number().optional().describe('Fire radiative power (MW)'),
    daynight: z.string().optional().describe('Day or night detection'),
    detection_time: z.string().optional().describe('Detection timestamp'),
    distance: z.number().optional().describe('Distance from queried location')
  })
  .passthrough();

export let getWildfire = SlateTool.create(spec, {
  name: 'Get Wildfire Activity',
  key: 'get_wildfire',
  description: `Retrieve real-time wildfire activity data within the last 7 days. Returns fire locations, intensity (radiative power), detection confidence, and distance. Supports lookup by coordinates or place name.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      lat: z.number().min(-90).max(90).optional().describe('Latitude (-90 to 90)'),
      lng: z.number().min(-180).max(180).optional().describe('Longitude (-180 to 180)'),
      place: z.string().optional().describe('Place name to query')
    })
  )
  .output(
    z
      .object({
        message: z.string().optional(),
        fires: z.array(wildfireRecordSchema).describe('Active fire detections')
      })
      .passthrough()
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      language: ctx.config.language
    });

    let result: any;

    if (ctx.input.place) {
      result = await client.getWildfireByPlace(ctx.input.place);
    } else if (ctx.input.lat !== undefined && ctx.input.lng !== undefined) {
      result = await client.getWildfireByLatLng(ctx.input.lat, ctx.input.lng);
    } else {
      throw new Error('Provide lat/lng coordinates or a place name.');
    }

    let fires = result.data || [];

    return {
      output: {
        message: result.message,
        fires
      },
      message:
        fires.length > 0
          ? `Found **${fires.length}** active fire(s) near the specified location.`
          : 'No active fires detected near the specified location.'
    };
  })
  .build();
