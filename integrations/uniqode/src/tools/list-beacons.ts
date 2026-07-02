import { SlateTool } from 'slates';
import { z } from 'zod';
import { BeaconstacClient } from '../lib/client';
import { spec } from '../spec';

export let listBeacons = SlateTool.create(spec, {
  name: 'List Beacons',
  key: 'list_beacons',
  description: `List and search BLE beacons in your Beaconstac account. Returns beacon details including hardware status (battery, temperature), iBeacon identifiers, associated campaigns, and last heartbeat timestamps.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
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
      organization: ctx.config.organizationId,
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let beacons = result.results.map(b => ({
      beaconId: b.id,
      name: b.name,
      serialNumber: b.serial_number,
      uuid: b.UUID,
      major: b.major,
      minor: b.minor,
      battery: b.battery,
      temperature: b.temperature,
      state: b.state,
      heartbeat: b.heartbeat,
      placeId: b.place,
      campaignContentType: b.campaign?.content_type,
      createdAt: b.created,
      updatedAt: b.updated
    }));

    return {
      output: {
        totalCount: result.count,
        beacons
      },
      message: `Found **${result.count}** beacon(s). Showing ${beacons.length} result(s).`
    };
  })
  .build();
