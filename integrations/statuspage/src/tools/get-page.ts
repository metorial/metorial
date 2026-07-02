import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getPage = SlateTool.create(spec, {
  name: 'Get Page',
  key: 'get_page',
  description: `Retrieve the status page profile and settings including name, domain, subdomain, time zone, branding, and notification preferences. Use this to inspect current page configuration.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      pageId: z.string().describe('Unique identifier of the page'),
      name: z.string().optional().describe('Name of the status page'),
      pageDescription: z.string().optional().describe('Description of the status page'),
      subdomain: z.string().optional().describe('Subdomain for the status page'),
      domain: z.string().optional().describe('Custom domain for the status page'),
      url: z.string().optional().describe('Full URL of the status page'),
      timeZone: z.string().optional().describe('Time zone configured for the page'),
      updatedAt: z.string().optional().describe('Last update timestamp'),
      allowEmail: z.boolean().optional().describe('Whether email subscriptions are enabled'),
      allowSms: z.boolean().optional().describe('Whether SMS subscriptions are enabled'),
      allowWebhook: z
        .boolean()
        .optional()
        .describe('Whether webhook subscriptions are enabled'),
      allowRss: z.boolean().optional().describe('Whether RSS/Atom subscriptions are enabled')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, pageId: ctx.config.pageId });
    let page = await client.getPage();

    let output = {
      pageId: page.id,
      name: page.name,
      pageDescription: page.page_description,
      subdomain: page.subdomain,
      domain: page.domain,
      url: page.url,
      timeZone: page.time_zone,
      updatedAt: page.updated_at,
      allowEmail: page.allow_email,
      allowSms: page.allow_sms,
      allowWebhook: page.allow_webhook,
      allowRss: page.allow_rss_atom_feeds
    };

    return {
      output,
      message: `Retrieved status page **${page.name}** (${page.url || page.subdomain}).`
    };
  })
  .build();
