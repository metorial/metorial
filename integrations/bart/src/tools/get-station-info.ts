import { SlateTool } from 'slates';
import { z } from 'zod';
import { BartClient } from '../lib/client';
import { spec } from '../spec';

let stationSummarySchema = z.object({
  stationName: z.string().describe('Station name'),
  stationAbbr: z.string().describe('Station abbreviation code'),
  latitude: z.string().describe('Station latitude'),
  longitude: z.string().describe('Station longitude'),
  address: z.string().describe('Station street address'),
  city: z.string().describe('City'),
  county: z.string().describe('County'),
  state: z.string().describe('State'),
  zipcode: z.string().describe('ZIP code')
});

let stationDetailSchema = stationSummarySchema.extend({
  northRoutes: z.array(z.string()).describe('Routes serving northbound direction'),
  southRoutes: z.array(z.string()).describe('Routes serving southbound direction'),
  northPlatforms: z.array(z.string()).describe('Northbound platform numbers'),
  southPlatforms: z.array(z.string()).describe('Southbound platform numbers'),
  platformInfo: z.string().describe('Platform layout description'),
  intro: z.string().describe('Station description/introduction'),
  crossStreet: z.string().describe('Nearest cross street'),
  food: z.string().describe('Nearby food options'),
  shopping: z.string().describe('Nearby shopping options'),
  attraction: z.string().describe('Nearby attractions'),
  link: z.string().describe('BART station webpage URL')
});

let stationAccessSchema = z.object({
  stationName: z.string().describe('Station name'),
  stationAbbr: z.string().describe('Station abbreviation code'),
  hasParking: z.boolean().describe('Whether parking is available'),
  hasBikeRacks: z.boolean().describe('Whether bike racks are available'),
  hasBikeStation: z.boolean().describe('Whether a bike station is available'),
  hasLockers: z.boolean().describe('Whether lockers are available'),
  entering: z.string().describe('Directions for entering the station'),
  exiting: z.string().describe('Directions for exiting the station'),
  parking: z.string().describe('Parking information'),
  lockers: z.string().describe('Locker information'),
  transitInfo: z.string().describe('Nearby transit connections'),
  link: z.string().describe('BART station webpage URL')
});

export let getStationInfo = SlateTool.create(spec, {
  name: 'Get Station Info',
  key: 'get_station_info',
  description: `Retrieve detailed information about BART stations. Can list all stations, get details about a specific station (address, routes, platforms, nearby amenities), or get station access information (parking, bike racks, lockers, entering/exiting directions, transit connections).`,
  instructions: [
    'Use station abbreviation codes (e.g., "12TH" for 12th St Oakland, "EMBR" for Embarcadero).',
    'Set includeAccess to true to also retrieve parking, bike, locker, and transit connection information.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      stationAbbr: z
        .string()
        .optional()
        .describe('Station abbreviation code. Omit to list all stations.'),
      includeAccess: z
        .boolean()
        .optional()
        .default(false)
        .describe(
          'Whether to include access/neighborhood info (parking, bikes, lockers, transit connections)'
        )
    })
  )
  .output(
    z.object({
      stations: z
        .array(stationSummarySchema)
        .optional()
        .describe('List of all stations (returned when no specific station is requested)'),
      station: stationDetailSchema
        .optional()
        .describe(
          'Detailed station information (returned when a specific station is requested)'
        ),
      access: stationAccessSchema
        .optional()
        .describe('Station access information (returned when includeAccess is true)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BartClient({ token: ctx.auth.token });

    if (!ctx.input.stationAbbr) {
      let result = await client.getStations();
      let stationData = result?.stations?.station;
      let stations = Array.isArray(stationData)
        ? stationData
        : stationData
          ? [stationData]
          : [];

      let mappedStations = stations.map((s: any) => ({
        stationName: s.name || '',
        stationAbbr: s.abbr || '',
        latitude: s.gtfs_latitude || '',
        longitude: s.gtfs_longitude || '',
        address: s.address || '',
        city: s.city || '',
        county: s.county || '',
        state: s.state || '',
        zipcode: s.zipcode || ''
      }));

      return {
        output: { stations: mappedStations },
        message: `Retrieved **${mappedStations.length}** BART stations.`
      };
    }

    let infoResult = await client.getStationInfo(ctx.input.stationAbbr);
    let stn = infoResult?.stations?.station;

    let extractArray = (data: any): string[] => {
      if (!data) return [];
      if (Array.isArray(data)) return data;
      if (typeof data === 'object' && data.route) {
        return Array.isArray(data.route) ? data.route : [data.route];
      }
      if (typeof data === 'object' && data.platform) {
        return Array.isArray(data.platform) ? data.platform : [data.platform];
      }
      return [String(data)];
    };

    let extractCdata = (data: any): string => {
      if (!data) return '';
      if (typeof data === 'string') return data;
      if (typeof data === 'object' && data['#cdata-section'] !== undefined)
        return data['#cdata-section'];
      return '';
    };

    let station = {
      stationName: stn?.name || '',
      stationAbbr: stn?.abbr || '',
      latitude: stn?.gtfs_latitude || '',
      longitude: stn?.gtfs_longitude || '',
      address: stn?.address || '',
      city: stn?.city || '',
      county: stn?.county || '',
      state: stn?.state || '',
      zipcode: stn?.zipcode || '',
      northRoutes: extractArray(stn?.north_routes),
      southRoutes: extractArray(stn?.south_routes),
      northPlatforms: extractArray(stn?.north_platforms),
      southPlatforms: extractArray(stn?.south_platforms),
      platformInfo: extractCdata(stn?.platform_info) || '',
      intro: extractCdata(stn?.intro) || '',
      crossStreet: extractCdata(stn?.cross_street) || '',
      food: extractCdata(stn?.food) || '',
      shopping: extractCdata(stn?.shopping) || '',
      attraction: extractCdata(stn?.attraction) || '',
      link: extractCdata(stn?.link) || ''
    };

    let output: any = { station };

    if (ctx.input.includeAccess) {
      let accessResult = await client.getStationAccess(ctx.input.stationAbbr);
      let acc = accessResult?.stations?.station;

      output.access = {
        stationName: acc?.name || '',
        stationAbbr: acc?.abbr || '',
        hasParking: acc?.['@parking_flag'] === '1',
        hasBikeRacks: acc?.['@bike_flag'] === '1',
        hasBikeStation: acc?.['@bike_station_flag'] === '1',
        hasLockers: acc?.['@locker_flag'] === '1',
        entering: extractCdata(acc?.entering) || '',
        exiting: extractCdata(acc?.exiting) || '',
        parking: extractCdata(acc?.parking) || '',
        lockers: extractCdata(acc?.lockers) || '',
        transitInfo: extractCdata(acc?.transit_info) || '',
        link: acc?.link || ''
      };
    }

    return {
      output,
      message: `Retrieved details for **${station.stationName}** (${station.stationAbbr})${ctx.input.includeAccess ? ' including access information' : ''}.`
    };
  })
  .build();
