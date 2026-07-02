import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getSiteTool = SlateTool.create(spec, {
  name: 'Get Site',
  key: 'get_site',
  description: `Retrieve detailed information about a specific storage facility. Returns site configuration including address, operating hours, unit inventory, and availability. You can look up a site by its ID or unique code.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      siteIdOrCode: z.string().describe('The site ID or unique site code'),
      includeUnits: z
        .boolean()
        .optional()
        .describe('Whether to include the full unit inventory for this site')
    })
  )
  .output(
    z.object({
      site: z.record(z.string(), z.any()).describe('Site details')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      subdomain: ctx.config.subdomain
    });

    let include = ctx.input.includeUnits ? 'units' : undefined;
    let site = await client.getSite(ctx.input.siteIdOrCode, include);

    return {
      output: { site },
      message: `Retrieved site **${site.name || site._id}**.`
    };
  })
  .build();
