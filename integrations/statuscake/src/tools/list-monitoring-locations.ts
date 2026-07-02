import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listMonitoringLocations = SlateTool.create(spec, {
  name: 'List Monitoring Locations',
  key: 'list_monitoring_locations',
  description: `Retrieve available monitoring server locations for uptime and page speed checks. Returns IP addresses, region information, and server status. Useful for firewall whitelisting and selecting monitoring regions when creating checks.`,
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      locationType: z
        .enum(['uptime', 'pagespeed'])
        .describe('Type of monitoring locations to retrieve'),
      regionCode: z
        .string()
        .optional()
        .describe('Filter by region code (for uptime locations)')
    })
  )
  .output(
    z.object({
      locations: z
        .array(z.record(z.string(), z.any()))
        .describe('List of monitoring location objects with IP addresses and region info')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result: any;
    if (ctx.input.locationType === 'uptime') {
      result = await client.listUptimeLocations({
        region_code: ctx.input.regionCode
      });
    } else {
      result = await client.listPagespeedLocations({
        location: ctx.input.regionCode
      });
    }

    let locations = result?.data ?? [];

    return {
      output: { locations },
      message: `Found **${locations.length}** ${ctx.input.locationType} monitoring location(s).`
    };
  })
  .build();
