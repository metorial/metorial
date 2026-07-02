import { SlateTool } from 'slates';
import { z } from 'zod';
import { BrightDataClient } from '../lib/client';
import { spec } from '../spec';

export let getZoneDetails = SlateTool.create(spec, {
  name: 'Get Zone Details',
  key: 'get_zone_details',
  description: `Get detailed information about a specific Bright Data zone, including its configuration, plan, status, and passwords. Combines zone info, status, and credential data into a single response.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      zoneName: z.string().describe('Name of the zone to retrieve details for.')
    })
  )
  .output(
    z.object({
      zoneInfo: z
        .record(z.string(), z.unknown())
        .describe(
          'Full zone configuration including plan, creation date, permissions, and IPs.'
        ),
      zoneStatus: z.record(z.string(), z.unknown()).describe('Current status of the zone.'),
      passwords: z.array(z.string()).describe('Zone passwords for proxy authentication.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BrightDataClient({ token: ctx.auth.token });

    let [zoneInfo, zoneStatus, passwords] = await Promise.all([
      client.getZoneInfo(ctx.input.zoneName),
      client.getZoneStatus(ctx.input.zoneName),
      client.getZonePasswords(ctx.input.zoneName)
    ]);

    return {
      output: { zoneInfo, zoneStatus, passwords },
      message: `Retrieved details for zone **${ctx.input.zoneName}**.`
    };
  })
  .build();
