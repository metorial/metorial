import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getSiteInfo = SlateTool.create(spec, {
  name: 'Get Site Info',
  key: 'get_site_info',
  description: `Retrieve project site information including name, domain, locales, timezone, global SEO settings, and other configuration details.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      site: z.any().describe('The site object with all project configuration')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      environment: ctx.config.environment
    });

    let site = await client.getSite();

    return {
      output: { site },
      message: `Retrieved site info for **${site.name}** (domain: ${site.internal_domain || 'N/A'}).`
    };
  })
  .build();
