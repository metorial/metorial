import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let findServicePoints = SlateTool.create(spec, {
  name: 'Find Service Points',
  key: 'find_service_points',
  description: `Find carrier pick-up/drop-off (PUDO) locations near a given address or coordinates. Service points are physical locations where packages can be dropped off or picked up, such as carrier stores, lockers, or partner locations.`,
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      providers: z
        .array(
          z.object({
            carrierId: z.string().describe('Carrier ID to search'),
            serviceCode: z.string().optional().describe('Specific service code')
          })
        )
        .min(1)
        .describe('Carrier providers to search for service points'),
      addressQuery: z.string().optional().describe('Freeform address text to search near'),
      address: z
        .object({
          addressLine1: z.string().optional().describe('Street address'),
          cityLocality: z.string().optional().describe('City'),
          stateProvince: z.string().optional().describe('State/province'),
          postalCode: z.string().optional().describe('Postal code'),
          countryCode: z.string().describe('Country code')
        })
        .optional()
        .describe('Structured address to search near'),
      latitude: z.number().optional().describe('Latitude coordinate'),
      longitude: z.number().optional().describe('Longitude coordinate'),
      radius: z.number().optional().describe('Search radius'),
      radiusUnit: z.enum(['km', 'mi']).optional().describe('Radius unit'),
      maxResults: z.number().optional().describe('Maximum number of results')
    })
  )
  .output(
    z.object({
      servicePoints: z.array(
        z.object({
          servicePointId: z.string().describe('Service point ID'),
          carrierCode: z.string().describe('Carrier code'),
          serviceCodes: z.array(z.string()).describe('Supported service codes'),
          name: z.string().describe('Service point name'),
          addressLine1: z.string().describe('Street address'),
          cityLocality: z.string().optional().describe('City'),
          stateProvince: z.string().optional().describe('State/province'),
          postalCode: z.string().optional().describe('Postal code'),
          countryCode: z.string().describe('Country code'),
          latitude: z.number().describe('Latitude'),
          longitude: z.number().describe('Longitude'),
          distanceKm: z.number().optional().describe('Distance in kilometers'),
          distanceMiles: z.number().optional().describe('Distance in miles'),
          features: z.array(z.string()).optional().describe('Available features')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let result = await client.listServicePoints({
      providers: ctx.input.providers.map(p => ({
        carrier_id: p.carrierId,
        service_code: p.serviceCode
      })),
      address_query: ctx.input.addressQuery,
      address: ctx.input.address
        ? {
            address_line1: ctx.input.address.addressLine1,
            city_locality: ctx.input.address.cityLocality,
            state_province: ctx.input.address.stateProvince,
            postal_code: ctx.input.address.postalCode,
            country_code: ctx.input.address.countryCode
          }
        : undefined,
      lat: ctx.input.latitude,
      long: ctx.input.longitude,
      radius: ctx.input.radius,
      radius_unit: ctx.input.radiusUnit,
      max_results: ctx.input.maxResults
    });

    let servicePoints = result.service_points.map(sp => ({
      servicePointId: sp.service_point_id,
      carrierCode: sp.carrier_code,
      serviceCodes: sp.service_codes,
      name: sp.name,
      addressLine1: sp.address?.address_line1 ?? '',
      cityLocality: sp.address?.city_locality,
      stateProvince: sp.address?.state_province,
      postalCode: sp.address?.postal_code,
      countryCode: sp.address?.country_code ?? '',
      latitude: sp.lat,
      longitude: sp.long,
      distanceKm: sp.distance_in_km,
      distanceMiles: sp.distance_in_miles,
      features: sp.features
    }));

    return {
      output: { servicePoints },
      message: `Found **${servicePoints.length}** service point(s) nearby.`
    };
  })
  .build();
