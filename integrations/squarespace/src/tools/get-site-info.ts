import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getSiteInfo = SlateTool.create(spec, {
  name: 'Get Site Info',
  key: 'get_site_info',
  description: `Retrieve basic information about the Squarespace website associated with the current API key or OAuth token. Returns site name, URL, currency, measurement standard, language, time zone, and business location.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      websiteId: z.string().describe('Website identifier'),
      siteId: z.string().optional().describe('Subdomain identifier'),
      title: z.string().optional().describe('Website name'),
      url: z.string().optional().describe('Canonical website URL'),
      currency: z.string().optional().describe('Commerce currency setting'),
      measurementStandard: z.string().optional().describe('IMPERIAL or METRIC'),
      language: z.string().optional().describe('ISO language and country code'),
      timeZone: z.string().optional().describe('Site time zone'),
      location: z.any().optional().describe('Physical business location')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let site = await client.getSiteInfo();

    return {
      output: {
        websiteId: site.id,
        siteId: site.siteId,
        title: site.title,
        url: site.url,
        currency: site.currency,
        measurementStandard: site.measurementStandard,
        language: site.language,
        timeZone: site.timeZone,
        location: site.location
      },
      message: `Site: **${site.title || 'Unknown'}** (${site.url || 'no URL'}), currency: ${site.currency || 'N/A'}`
    };
  })
  .build();
