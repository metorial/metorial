import { SlateTool } from 'slates';
import { z } from 'zod';
import { WebflowClient } from '../lib/client';
import { spec } from '../spec';

export let listCustomDomains = SlateTool.create(spec, {
  name: 'List Custom Domains',
  key: 'list_custom_domains',
  description: `List custom domains configured on a Webflow site. Use this before publishing a site to a selected domain.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      siteId: z.string().describe('Unique identifier of the Webflow site')
    })
  )
  .output(
    z.object({
      domains: z
        .array(
          z.object({
            domainId: z.string().optional().describe('Domain identifier'),
            url: z.string().optional().describe('Custom domain URL'),
            lastPublished: z.string().optional().describe('ISO 8601 last publish timestamp')
          })
        )
        .describe('Custom domains configured on the site')
    })
  )
  .handleInvocation(async ctx => {
    let client = new WebflowClient(ctx.auth.token);
    let data = await client.listCustomDomains(ctx.input.siteId);
    let domains = (data.customDomains ?? data.domains ?? []).map((d: any) => ({
      domainId: d.id ?? d._id,
      url: d.url,
      lastPublished: d.lastPublished
    }));

    return {
      output: { domains },
      message: `Found **${domains.length}** custom domain(s) on site **${ctx.input.siteId}**.`
    };
  })
  .build();
