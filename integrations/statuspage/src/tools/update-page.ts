import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updatePage = SlateTool.create(spec, {
  name: 'Update Page',
  key: 'update_page',
  description: `Update status page profile settings such as name, domain, subdomain, time zone, branding/CSS, and subscriber notification preferences.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      name: z.string().optional().describe('New name for the status page'),
      subdomain: z.string().optional().describe('New subdomain for the status page'),
      domain: z.string().optional().describe('Custom domain for the status page'),
      timeZone: z
        .string()
        .optional()
        .describe('IANA time zone string, e.g. "America/New_York"'),
      allowEmail: z.boolean().optional().describe('Enable or disable email subscriptions'),
      allowSms: z.boolean().optional().describe('Enable or disable SMS subscriptions'),
      allowWebhook: z.boolean().optional().describe('Enable or disable webhook subscriptions'),
      allowRss: z.boolean().optional().describe('Enable or disable RSS/Atom subscriptions'),
      notificationsFromEmail: z
        .string()
        .optional()
        .describe('Email address used as the sender for notifications'),
      cssBody: z.string().optional().describe('Custom CSS for the page body')
    })
  )
  .output(
    z.object({
      pageId: z.string().describe('Unique identifier of the page'),
      name: z.string().optional().describe('Updated name of the status page'),
      subdomain: z.string().optional().describe('Updated subdomain'),
      domain: z.string().optional().describe('Updated custom domain'),
      url: z.string().optional().describe('Full URL of the status page'),
      timeZone: z.string().optional().describe('Updated time zone'),
      updatedAt: z.string().optional().describe('Last update timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, pageId: ctx.config.pageId });

    let data: Record<string, any> = {};
    if (ctx.input.name !== undefined) data.name = ctx.input.name;
    if (ctx.input.subdomain !== undefined) data.subdomain = ctx.input.subdomain;
    if (ctx.input.domain !== undefined) data.domain = ctx.input.domain;
    if (ctx.input.timeZone !== undefined) data.time_zone = ctx.input.timeZone;
    if (ctx.input.allowEmail !== undefined) data.allow_email = ctx.input.allowEmail;
    if (ctx.input.allowSms !== undefined) data.allow_sms = ctx.input.allowSms;
    if (ctx.input.allowWebhook !== undefined) data.allow_webhook = ctx.input.allowWebhook;
    if (ctx.input.allowRss !== undefined) data.allow_rss_atom_feeds = ctx.input.allowRss;
    if (ctx.input.notificationsFromEmail !== undefined)
      data.notifications_from_email = ctx.input.notificationsFromEmail;
    if (ctx.input.cssBody !== undefined) data.css_body = ctx.input.cssBody;

    let page = await client.updatePage(data);

    return {
      output: {
        pageId: page.id,
        name: page.name,
        subdomain: page.subdomain,
        domain: page.domain,
        url: page.url,
        timeZone: page.time_zone,
        updatedAt: page.updated_at
      },
      message: `Updated status page **${page.name}**.`
    };
  })
  .build();
