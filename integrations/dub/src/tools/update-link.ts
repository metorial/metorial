import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateLink = SlateTool.create(spec, {
  name: 'Update Link',
  key: 'update_link',
  description: `Update an existing short link's properties. You can modify the destination URL, slug, UTM parameters, targeting rules, social media card, and more. Identify the link by its Dub link ID or external ID (prefixed with \`ext_\`).`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      linkId: z.string().describe('The Dub link ID or external ID prefixed with ext_'),
      destinationUrl: z.string().optional().describe('New destination URL'),
      domain: z.string().optional().describe('New custom domain'),
      slug: z.string().optional().describe('New slug/key for the short link'),
      externalId: z.string().optional().describe('New external ID mapping'),
      tenantId: z.string().optional().describe('Tenant identifier'),
      trackConversion: z.boolean().optional().describe('Enable/disable conversion tracking'),
      archived: z.boolean().optional().describe('Archive/unarchive the link'),
      tagIds: z.array(z.string()).optional().describe('Updated tag IDs'),
      tagNames: z.array(z.string()).optional().describe('Updated tag names'),
      folderId: z.string().optional().describe('Move to a different folder'),
      comments: z.string().optional().describe('Internal notes'),
      expiresAt: z.string().optional().describe('Expiration date/time in ISO-8601 format'),
      expiredUrl: z.string().optional().describe('Redirect URL after expiration'),
      password: z.string().optional().describe('Password protection'),
      proxy: z.boolean().optional().describe('Enable/disable custom social media previews'),
      title: z.string().optional().describe('Custom og:title'),
      description: z.string().optional().describe('Custom og:description'),
      image: z.string().optional().describe('Custom og:image URL'),
      rewrite: z.boolean().optional().describe('Enable/disable link cloaking'),
      ios: z.string().optional().describe('iOS-specific destination URL'),
      android: z.string().optional().describe('Android-specific destination URL'),
      geo: z.record(z.string(), z.string()).optional().describe('Country-based targeting'),
      utmSource: z.string().optional().describe('UTM source parameter'),
      utmMedium: z.string().optional().describe('UTM medium parameter'),
      utmCampaign: z.string().optional().describe('UTM campaign parameter'),
      utmTerm: z.string().optional().describe('UTM term parameter'),
      utmContent: z.string().optional().describe('UTM content parameter'),
      webhookIds: z.array(z.string()).optional().describe('Webhook IDs for click events')
    })
  )
  .output(
    z.object({
      linkId: z.string().describe('ID of the updated link'),
      shortLink: z.string().describe('The full short link URL'),
      domain: z.string().describe('The domain of the short link'),
      slug: z.string().describe('The slug/key of the short link'),
      destinationUrl: z.string().describe('The destination URL'),
      trackConversion: z.boolean().describe('Whether conversion tracking is enabled'),
      updatedAt: z.string().describe('When the link was last updated')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let link = await client.updateLink(ctx.input.linkId, {
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
        trackConversion: link.trackConversion,
        updatedAt: link.updatedAt
      },
      message: `Updated link **${link.shortLink}** → ${link.url}`
    };
  })
  .build();
