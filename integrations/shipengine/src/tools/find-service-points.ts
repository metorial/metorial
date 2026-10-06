import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/client';
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
            serviceCode: z
              .string()
              .optional()
              .describe('One service code; exclusive with serviceCodes'),
            serviceCodes: z
              .array(z.string())
              .min(1)
              .optional()
              .describe('Service codes to search')
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
      radius: z.number().int().positive().optional().describe('Search radius'),
      radiusUnit: z
        .enum(['km', 'mi'])
        .optional()
        .describe('Use km. Legacy mi is unsupported by the provider.'),
      maxResults: z.number().int().positive().optional().describe('Maximum number of results')
    })
  )
  .output(
    z.object({
      servicePoints: z.array(
        z.object({
          servicePointId: z.string().describe('Service point ID'),
          carrierCode: z.string().describe('Carrier code'),
          serviceCodes: z.array(z.string()).describe('Supported service codes'),
          name: z.string().optional().describe('Provider company name for the service point'),
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
    const coordinates = ctx.input.latitude !== undefined || ctx.input.longitude !== undefined;
    if (
      Number(Boolean(ctx.input.addressQuery)) +
        Number(Boolean(ctx.input.address)) +
        Number(coordinates) !==
        1 ||
      (coordinates && (ctx.input.latitude === undefined || ctx.input.longitude === undefined))
    )
      throw createApiServiceError(
        'Choose exactly one location: addressQuery, address, or both latitude and longitude.'
      );
    if (
      (ctx.input.latitude !== undefined &&
        (ctx.input.latitude < -90 || ctx.input.latitude > 90)) ||
      (ctx.input.longitude !== undefined &&
        (ctx.input.longitude < -180 || ctx.input.longitude > 180))
    )
      throw createApiServiceError('Provide valid latitude and longitude coordinates.');
    if (ctx.input.radiusUnit === 'mi')
      throw createApiServiceError(
        'The provider accepts radius in kilometers. Set radiusUnit to km.'
      );
    if (ctx.input.providers.some(p => p.serviceCode && p.serviceCodes))
      throw createApiServiceError('Choose serviceCode or serviceCodes for each provider.');
    let client = createClient(ctx);

    let result = await client.listServicePoints({
      providers: ctx.input.providers.map(p => ({
        carrier_id: p.carrierId,
        service_code: p.serviceCodes ?? (p.serviceCode ? [p.serviceCode] : undefined)
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
      max_results: ctx.input.maxResults
    });

    let servicePoints = result.service_points.map(sp => ({
      servicePointId: sp.service_point_id,
      carrierCode: sp.carrier_code,
      serviceCodes: sp.service_codes,
      name: sp.company_name,
      addressLine1: sp.address_line1,
      cityLocality: sp.city_locality,
      stateProvince: sp.state_province,
      postalCode: sp.postal_code,
      countryCode: sp.country_code,
      latitude: sp.lat,
      longitude: sp.long,
      distanceKm:
        sp.distance_in_meters === undefined ? undefined : sp.distance_in_meters / 1000,
      distanceMiles:
        sp.distance_in_meters === undefined ? undefined : sp.distance_in_meters / 1609.344,
      features: sp.features
    }));

    return {
      output: { servicePoints },
      message: `Found **${servicePoints.length}** service point(s) nearby.`
    };
  })
  .build();
