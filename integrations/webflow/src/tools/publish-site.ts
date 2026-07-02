import { SlateTool } from 'slates';
import { z } from 'zod';
import { WebflowClient } from '../lib/client';
import { spec } from '../spec';

export let publishSite = SlateTool.create(spec, {
  name: 'Publish Site',
  key: 'publish_site',
  description: `Publish a Webflow site to make staged changes live. Optionally specify which custom domains to publish to, or publish to the Webflow subdomain.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      siteId: z.string().describe('Unique identifier of the Webflow site to publish'),
      customDomains: z
        .array(z.string())
        .optional()
        .describe(
          'List of custom domain IDs to publish to. If omitted, publishes to all configured domains.'
        ),
      publishToWebflowSubdomain: z
        .boolean()
        .optional()
        .describe('Whether to also publish to the Webflow subdomain')
    })
  )
  .output(
    z.object({
      published: z.boolean().describe('Whether the publish was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new WebflowClient(ctx.auth.token);
    await client.publishSite(
      ctx.input.siteId,
      ctx.input.customDomains,
      ctx.input.publishToWebflowSubdomain
    );

    return {
      output: { published: true },
      message: `Successfully published site **${ctx.input.siteId}**.`
    };
  })
  .build();
