import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listLocationsBrowsers = SlateTool.create(spec, {
  name: 'List Locations & Browsers',
  key: 'list_locations_browsers',
  description: `Retrieves the available test locations and browsers for GTmetrix performance testing. Use this to discover valid location and browser IDs before running tests. Locations include supported browsers and IP addresses (useful for firewall whitelisting). Browsers include feature support flags.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      locations: z.array(
        z.object({
          locationId: z.string().describe('Unique identifier of the location'),
          name: z.string().describe('Human-readable location name (e.g. "Sydney, Australia")'),
          region: z.string().describe('Geographic region'),
          isDefault: z.boolean().describe('Whether this is the account default location'),
          accountHasAccess: z.boolean().describe('Whether your account can use this location'),
          browsers: z.array(z.string()).describe('Browser IDs available at this location'),
          ips: z.array(z.string()).describe('IP addresses for this location')
        })
      ),
      browsers: z.array(
        z.object({
          browserId: z.string().describe('Unique identifier of the browser'),
          name: z.string().describe('Browser name (e.g. "Chrome")'),
          isDefault: z.boolean().describe('Whether this is the default browser'),
          platform: z.string().describe('Platform type (e.g. "desktop")'),
          device: z.string().describe('Device name (empty for desktop browsers)'),
          features: z.object({
            adblock: z.boolean().describe('Supports ad blocking'),
            cookies: z.boolean().describe('Supports custom cookies'),
            dns: z.boolean().describe('Supports DNS overrides'),
            filtering: z.boolean().describe('Supports URL filtering'),
            httpAuth: z.boolean().describe('Supports HTTP authentication'),
            resolution: z.boolean().describe('Supports custom resolution'),
            throttle: z.boolean().describe('Supports connection throttling'),
            userAgent: z.boolean().describe('Supports custom user agent'),
            video: z.boolean().describe('Supports video capture'),
            lighthouse: z.boolean().describe('Supports Lighthouse reports')
          })
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let [locations, browsers] = await Promise.all([
      client.listLocations(),
      client.listBrowsers()
    ]);

    let accessibleLocations = locations.filter(l => l.accountHasAccess);

    return {
      output: { locations, browsers },
      message: `Found **${locations.length}** location(s) (${accessibleLocations.length} accessible) and **${browsers.length}** browser(s).\n\n**Locations:** ${accessibleLocations.map(l => `${l.name} (\`${l.locationId}\`)`).join(', ')}\n\n**Browsers:** ${browsers.map(b => `${b.name} (\`${b.browserId}\`)`).join(', ')}`
    };
  })
  .build();
