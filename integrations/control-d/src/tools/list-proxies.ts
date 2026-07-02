import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let listProxies = SlateTool.create(spec, {
  name: 'List Proxies',
  key: 'list_proxies',
  description: `List all available proxy locations for traffic redirection. Control D supports 100+ exit proxy locations worldwide. Use proxy codes (e.g., "JFK", "YYZ", "LOCAL") when configuring redirect actions on services, custom rules, or default rules.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      proxies: z.array(
        z.object({
          proxyId: z.string().describe('Proxy location code (e.g., "JFK", "YYZ")'),
          country: z.string().describe('Country code'),
          countryName: z.string().describe('Country name'),
          city: z.string().describe('City code'),
          cityName: z.string().describe('City name'),
          latitude: z.number().describe('GPS latitude'),
          longitude: z.number().describe('GPS longitude')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let proxies = await client.listProxies();

    let mapped = proxies.map(p => ({
      proxyId: p.PK,
      country: p.country,
      countryName: p.country_name,
      city: p.city,
      cityName: p.city_name,
      latitude: p.gps_lat,
      longitude: p.gps_long
    }));

    return {
      output: { proxies: mapped },
      message: `Found **${mapped.length}** proxy locations.`
    };
  })
  .build();
