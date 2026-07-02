import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let websightsLookup = SlateTool.create(spec, {
  name: 'WebSights IP Lookup',
  key: 'websights_lookup',
  description: `Resolve IP addresses to company-level data using ZoomInfo WebSights. Identifies anonymous website visitors by mapping their IP addresses to firmographic details, enabling account-based marketing plays and alerting sales to engaged accounts. Supports both IPv4 and IPv6.`,
  constraints: ['Requires separate WebSights subscription/entitlement.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      ipAddresses: z
        .array(z.string())
        .min(1)
        .describe('IP addresses to resolve (IPv4 or IPv6)')
    })
  )
  .output(
    z.object({
      results: z
        .array(z.record(z.string(), z.any()))
        .describe(
          'Resolved company profiles, ISP information, and IP geolocation details for each IP address'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiVersion: ctx.config.apiVersion
    });

    let result = await client.lookupWebSights(ctx.input.ipAddresses);

    let results = result.data || result.result || [];

    return {
      output: { results },
      message: `Resolved **${results.length}** IP address(es) to company data.`
    };
  })
  .build();
