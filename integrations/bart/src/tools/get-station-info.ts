import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { BartClient } from '../lib/client';
import { bartRecord, bartRecords, bartStrings, bartText } from '../lib/response';
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
  hasBikeShare: z.boolean().optional().describe('Whether bike sharing is available'),
  elevatorDescription: z
    .string()
    .optional()
    .describe('Elevator locations and accessible station routes'),
  bikeShareDescription: z.string().optional().describe('Nearby bike sharing information'),
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
    let mapSummary = (s: Record<string, unknown>) => ({
      stationName: bartText(s.name),
      stationAbbr: bartText(s.abbr),
      latitude: bartText(s.gtfs_latitude),
      longitude: bartText(s.gtfs_longitude),
      address: bartText(s.address),
      city: bartText(s.city),
      county: bartText(s.county),
      state: bartText(s.state),
      zipcode: bartText(s.zipcode)
    });
    if (!ctx.input.stationAbbr) {
      if (ctx.input.includeAccess) {
        throw createApiServiceError(
          'Provide stationAbbr to include station access information. Call get_station_info without includeAccess to find station abbreviations.'
        );
      }
      let result = await client.getStations();
      let stations = bartRecords(bartRecord(result.stations).station).map(mapSummary);
      return {
        output: { stations },
        message: `Retrieved **${stations.length}** BART stations.`
      };
    }
    let result = await client.getStationInfo(ctx.input.stationAbbr);
    let stn = bartRecords(bartRecord(result.stations).station)[0];
    if (!stn) {
      throw createApiServiceError(
        'BART did not return the requested station. Call get_station_info without stationAbbr to discover valid stations.'
      );
    }
    let station = {
      ...mapSummary(stn),
      northRoutes: bartStrings(bartRecord(stn.north_routes).route),
      southRoutes: bartStrings(bartRecord(stn.south_routes).route),
      northPlatforms: bartStrings(bartRecord(stn.north_platforms).platform),
      southPlatforms: bartStrings(bartRecord(stn.south_platforms).platform),
      platformInfo: bartText(stn.platform_info),
      intro: bartText(stn.intro),
      crossStreet: bartText(stn.cross_street),
      food: bartText(stn.food),
      shopping: bartText(stn.shopping),
      attraction: bartText(stn.attraction),
      link: bartText(stn.link)
    };
    let access: z.infer<typeof stationAccessSchema> | undefined;
    if (ctx.input.includeAccess) {
      let accessResult = await client.getStationAccess(ctx.input.stationAbbr);
      let acc = bartRecords(bartRecord(accessResult.stations).station)[0];
      if (!acc)
        throw createApiServiceError(
          'BART did not return access information for this station.'
        );
      access = {
        stationName: bartText(acc.name),
        stationAbbr: bartText(acc.abbr),
        hasParking: bartText(acc['@parking_flag']) === '1',
        hasBikeRacks: bartText(acc['@bike_flag']) === '1',
        hasBikeStation: bartText(acc['@bike_station_flag']) === '1',
        hasLockers: bartText(acc['@locker_flag']) === '1',
        hasBikeShare:
          acc['@bike_share_flag'] === undefined
            ? undefined
            : bartText(acc['@bike_share_flag']) === '1',
        elevatorDescription: bartText(acc.elevator_description),
        bikeShareDescription: bartText(acc.bike_share_description),
        entering: bartText(acc.entering),
        exiting: bartText(acc.exiting),
        parking: bartText(acc.parking),
        lockers: bartText(acc.lockers),
        transitInfo: bartText(acc.transit_info),
        link: bartText(acc.link)
      };
    }
    return {
      output: { station, ...(access ? { access } : {}) },
      message: `Retrieved details for **${station.stationName}** (${station.stationAbbr})${ctx.input.includeAccess ? ' including access information' : ''}.`
    };
  })
  .build();
