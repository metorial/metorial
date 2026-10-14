import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { SitesClient } from '../lib/client';
import { spec } from '../spec';

export let getTrackerInstallation = SlateTool.create(spec, {
  name: 'Get Tracker Installation',
  key: 'get_tracker_installation',
  description:
    'Retrieve the site-specific tracker script URL and its configuration for installing Plausible on a website. Call list_sites to discover accessible site domains. Works with a Stats API key or Sites API key.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      siteId: z.string().describe('Site domain. Call list_sites to discover accessible sites.')
    })
  )
  .output(
    z.object({
      domain: z.string().describe('Site domain'),
      trackerId: z.string().describe('Site-specific tracker script identifier'),
      scriptUrl: z.string().describe('URL to use as the tracker script source on the website'),
      trackerScriptConfiguration: z.record(z.string(), z.any()).describe('Tracker settings')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SitesClient({ token: ctx.auth.token, baseUrl: ctx.config.baseUrl });
    let site = await client.getSite(ctx.input.siteId);
    let configuration = site.tracker_script_configuration;
    if (typeof configuration?.id !== 'string' || !configuration.id) {
      throw createApiServiceError(
        'This site does not expose a site-specific tracker ID. Retrieve its installation instructions from the Plausible dashboard.'
      );
    }
    let scriptUrl = `${ctx.config.baseUrl.replace(/\/+$/, '')}/js/${encodeURIComponent(configuration.id)}.js`;
    return {
      output: {
        domain: site.domain,
        trackerId: configuration.id,
        scriptUrl,
        trackerScriptConfiguration: configuration
      },
      message: `Retrieved the tracker script URL for **${site.domain}**: ${scriptUrl}`
    };
  })
  .build();
