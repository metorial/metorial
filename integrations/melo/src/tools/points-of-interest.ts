import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let facilityEnum = z.enum(['kindergarten', 'school', 'restaurant', 'hospital', 'parking']);

export let getPointsOfInterest = SlateTool.create(spec, {
  name: 'Points of Interest',
  key: 'points_of_interest',
  description: `Get nearby points of interest (schools, hospitals, restaurants, parking, kindergartens) for a given location. Specify coordinates and a radius to search within.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      latitude: z.number().describe('Center latitude'),
      longitude: z.number().describe('Center longitude'),
      radius: z.number().describe('Search radius in km'),
      facilities: z.array(facilityEnum).describe('Types of facilities to search for')
    })
  )
  .output(
    z.object({
      totalItems: z.number().describe('Total number of POIs found'),
      pointsOfInterest: z
        .array(
          z.object({
            name: z.string().describe('Name of the point of interest'),
            facilityType: z.string().describe('Type of facility'),
            latitude: z.number().describe('Latitude'),
            longitude: z.number().describe('Longitude'),
            attributes: z.record(z.string(), z.unknown()).describe('Additional attributes')
          })
        )
        .describe('List of points of interest')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      environment: ctx.config.environment
    });

    let params: Record<string, unknown> = {
      lat: ctx.input.latitude,
      lon: ctx.input.longitude,
      radius: ctx.input.radius,
      'facilities[]': ctx.input.facilities
    };

    let result = await client.getPointsOfInterest(params);
    let pointsOfInterest = (result['hydra:member'] ?? []).map((poi: any) => ({
      name: poi.name ?? '',
      facilityType: poi.type ?? '',
      latitude: poi.lat,
      longitude: poi.lon,
      attributes: poi.attributes ?? {}
    }));

    return {
      output: {
        totalItems: result['hydra:totalItems'],
        pointsOfInterest
      },
      message: `Found **${result['hydra:totalItems']}** points of interest within ${ctx.input.radius}km.`
    };
  })
  .build();
