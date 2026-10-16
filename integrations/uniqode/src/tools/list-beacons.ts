import { SlateTool } from 'slates';
import { z } from 'zod';
import { BeaconstacClient } from '../lib/client';
import { spec } from '../spec';

export let listBeacons = SlateTool.create(spec, {
  name: 'List Beacons',
  key: 'list_beacons',
  description: `List and search BLE beacons in your Uniqode account. Returns beacon details including hardware status (battery, temperature), iBeacon identifiers, associated campaigns, and last heartbeat timestamps.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      organizationId: z
        .string()
        .optional()
        .describe('Organization ID from list_organizations; overrides the configured default'),
      search: z
        .string()
        .optional()
        .describe('Search by beacon name, serial number, or place name'),
      ordering: z
        .string()
        .optional()
        .describe(
          'Sort field. Options include: name, serial_number, battery, heartbeat, place__name, created, updated, state. Prefix with "-" for descending.'
        ),
      limit: z.number().optional().describe('Maximum number of results'),
      offset: z.number().optional().describe('Pagination offset')
    })
  )
  .output(
    z.object({
      raw: z.unknown().optional().describe('Complete provider response'),
      totalCount: z.number().describe('Total number of beacons'),
      beacons: z
        .array(
          z.object({
            beaconId: z.number().describe('Beacon ID'),
            name: z.string().describe('Beacon name'),
            serialNumber: z.string().optional().describe('Serial number'),
            uuid: z.string().optional().describe('iBeacon UUID'),
            major: z.number().optional().describe('iBeacon major value'),
            minor: z.number().optional().describe('iBeacon minor value'),
            battery: z.number().optional().describe('Battery level percentage'),
            temperature: z.number().optional().describe('Temperature reading'),
            state: z.string().optional().describe('Beacon state: Active or Sleeping'),
            heartbeat: z.string().optional().describe('Last heartbeat timestamp'),
            placeId: z.number().optional().describe('Associated place ID'),
            campaignContentType: z.number().optional().describe('Campaign content type'),
            createdAt: z.string().optional().describe('Creation timestamp'),
            updatedAt: z.string().optional().describe('Last update timestamp')
          })
        )
        .describe('List of beacons')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BeaconstacClient({
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    let result = await client.listBeacons({
      search: ctx.input.search,
      ordering: ctx.input.ordering,
      organization: ctx.input.organizationId ?? ctx.config.organizationId,
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let beacons = result.results.map(b => ({
      beaconId: b.id,
      name: b.name,
      serialNumber: typeof b.serial_number === 'string' ? b.serial_number : undefined,
      uuid: typeof b.UUID === 'string' ? b.UUID : undefined,
      major: typeof b.major === 'number' ? b.major : undefined,
      minor: typeof b.minor === 'number' ? b.minor : undefined,
      battery: typeof b.battery === 'number' ? b.battery : undefined,
      temperature: typeof b.temperature === 'number' ? b.temperature : undefined,
      state: typeof b.state === 'string' ? b.state : undefined,
      heartbeat: typeof b.heartbeat === 'string' ? b.heartbeat : undefined,
      placeId: typeof b.place === 'number' ? b.place : undefined,
      campaignContentType:
        typeof b.campaign?.content_type === 'number' ? b.campaign?.content_type : undefined,
      createdAt: typeof b.created === 'string' ? b.created : undefined,
      updatedAt: typeof b.updated === 'string' ? b.updated : undefined
    }));

    return {
      output: {
        raw: result,
        totalCount: result.count,
        beacons
      },
      message: `Found **${result.count}** beacon(s). Showing ${beacons.length} result(s).`
    };
  })
  .build();
