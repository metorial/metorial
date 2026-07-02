import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createLink = SlateTool.create(spec, {
  name: 'Create Link',
  key: 'create_link',
  description: `Create a new short link in your Dub workspace. Supports custom domains, slugs, UTM parameters, device targeting, geo targeting, expiration, password protection, conversion tracking, and custom social media cards.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      destinationUrl: z.string().describe('The destination URL for the short link'),
      domain: z
        .string()
        .optional()
        .describe('Custom domain for the short link (defaults to workspace primary domain)'),
      slug: z
        .string()
        .optional()
        .describe('Custom slug/key for the short link (random 7-char generated if omitted)'),
      externalId: z
        .string()
        .optional()
        .describe('Your own system ID to associate with the link'),
      tenantId: z.string().optional().describe('Tenant identifier within your system'),
      trackConversion: z
        .boolean()
        .optional()
        .describe('Enable conversion tracking for this link'),
      archived: z.boolean().optional().describe('Whether to archive the link'),
      tagIds: z.array(z.string()).optional().describe('Tag IDs to assign to the link'),
      tagNames: z
        .array(z.string())
        .optional()
        .describe('Tag names to assign (case-insensitive, tags created if not existing)'),
      folderId: z.string().optional().describe('Folder ID to place the link in'),
      comments: z.string().optional().describe('Internal notes about the link'),
      expiresAt: z.string().optional().describe('Expiration date/time in ISO-8601 format'),
      expiredUrl: z.string().optional().describe('URL to redirect to after link expires'),
      password: z.string().optional().describe('Password required to access the link'),
      proxy: z.boolean().optional().describe('Enable custom social media card previews'),
      title: z.string().optional().describe('Custom og:title for link previews'),
      description: z.string().optional().describe('Custom og:description for link previews'),
      image: z.string().optional().describe('Custom og:image URL for link previews'),
      rewrite: z
        .boolean()
        .optional()
        .describe('Enable link cloaking (shows your domain in browser)'),
      ios: z.string().optional().describe('iOS-specific destination URL'),
      android: z.string().optional().describe('Android-specific destination URL'),
      geo: z
        .record(z.string(), z.string())
        .optional()
        .describe('Country-based targeting: { "US": "https://us.example.com" }'),
      utmSource: z.string().optional().describe('UTM source parameter'),
      utmMedium: z.string().optional().describe('UTM medium parameter'),
      utmCampaign: z.string().optional().describe('UTM campaign parameter'),
      utmTerm: z.string().optional().describe('UTM term parameter'),
      utmContent: z.string().optional().describe('UTM content parameter'),
      webhookIds: z
        .array(z.string())
        .optional()
        .describe('Webhook IDs to trigger on link clicks')
    })
  )
  .output(
    z.object({
      linkId: z.string().describe('Unique ID of the created link'),
      shortLink: z.string().describe('The full short link URL'),
      domain: z.string().describe('The domain of the short link'),
      slug: z.string().describe('The slug/key portion of the short link'),
      destinationUrl: z.string().describe('The destination URL'),
      qrCode: z.string().describe('URL to the QR code image for this link'),
      trackConversion: z.boolean().describe('Whether conversion tracking is enabled'),
      createdAt: z.string().describe('When the link was created')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let link = await client.createLink({
      url: ctx.input.destinationUrl,
      domain: ctx.input.domain,
      key: ctx.input.slug,
      externalId: ctx.input.externalId,
      tenantId: ctx.input.tenantId,
      trackConversion: ctx.input.trackConversion,
      archived: ctx.input.archived,
      tagIds: ctx.input.tagIds,
      tagNames: ctx.input.tagNames,
      folderId: ctx.input.folderId,
      comments: ctx.input.comments,
      expiresAt: ctx.input.expiresAt,
      expiredUrl: ctx.input.expiredUrl,
      password: ctx.input.password,
      proxy: ctx.input.proxy,
      title: ctx.input.title,
      description: ctx.input.description,
      image: ctx.input.image,
      rewrite: ctx.input.rewrite,
      ios: ctx.input.ios,
      android: ctx.input.android,
      geo: ctx.input.geo,
      utm_source: ctx.input.utmSource,
      utm_medium: ctx.input.utmMedium,
      utm_campaign: ctx.input.utmCampaign,
      utm_term: ctx.input.utmTerm,
      utm_content: ctx.input.utmContent,
      webhookIds: ctx.input.webhookIds
    });

    return {
      output: {
        linkId: link.id,
        shortLink: link.shortLink,
        domain: link.domain,
        slug: link.key,
        destinationUrl: link.url,
        qrCode: link.qrCode,
        trackConversion: link.trackConversion,
        createdAt: link.createdAt
      },
      message: `Created short link **${link.shortLink}** → ${link.url}`
    };
  })
  .build();
