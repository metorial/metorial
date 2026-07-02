import { SlateTool } from 'slates';
import { z } from 'zod';
import { BrightDataClient } from '../lib/client';
import { spec } from '../spec';

export let listZones = SlateTool.create(spec, {
  name: 'List Zones',
  key: 'list_zones',
  description: `List all active zones in your Bright Data account. Zones are collections of proxy or scraping configurations. Each zone has a name and type (e.g., "serp", "dc", "residential").`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      zones: z
        .array(
          z.object({
            zoneName: z.string().describe('Name of the zone.'),
            zoneType: z
              .string()
              .describe(
                'Type of the zone (e.g., "serp", "dc", "residential", "isp", "mobile").'
              )
          })
        )
        .describe('List of active zones.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BrightDataClient({ token: ctx.auth.token });

    let zones = await client.getActiveZones();

    let mappedZones = zones.map(z => ({
      zoneName: z.name,
      zoneType: z.type
    }));

    return {
      output: { zones: mappedZones },
      message: `Found **${mappedZones.length}** active zone(s):\n${mappedZones.map(z => `- **${z.zoneName}** (${z.zoneType})`).join('\n')}`
    };
  })
  .build();
