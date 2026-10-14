import { SlateTool } from 'slates';
import { z } from 'zod';
import { PrerenderClient } from '../lib/client';
import { spec } from '../spec';

export let submitSitemap = SlateTool.create(spec, {
  name: 'Submit Sitemap',
  key: 'submit_sitemap',
  description:
    'Submit an XML sitemap to add new URLs to the rendering queue. Existing cached URLs are not recached; use recache_urls to refresh them.',
  tags: { destructive: false, readOnly: false }
})
  .input(
    z.object({
      sitemapUrl: z.string().describe('Full HTTP or HTTPS URL of the XML sitemap to import.')
    })
  )
  .output(z.object({ result: z.unknown().describe('Response from the sitemap submission.') }))
  .handleInvocation(async ctx => {
    let client = new PrerenderClient({ token: ctx.auth.token });
    let result = await client.addSitemap({ url: ctx.input.sitemapUrl });
    return {
      output: { result },
      message: `Submitted sitemap **${ctx.input.sitemapUrl}** to import new URLs.`
    };
  })
  .build();
