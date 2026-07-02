import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getLink = SlateTool.create(spec, {
  name: 'Get Link',
  key: 'get_link',
  description: `Retrieve details about a specific short link. Look up a link by its Dub link ID, external ID, or domain + slug combination. Returns full link details including click counts, tags, and configuration.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      linkId: z.string().optional().describe('The Dub link ID'),
      externalId: z.string().optional().describe('Your external ID for the link'),
      domain: z.string().optional().describe('Domain of the short link (use with slug)'),
      slug: z.string().optional().describe('Slug/key of the short link (use with domain)')
    })
  )
  .output(
    z.object({
      linkId: z.string().describe('Unique link ID'),
      shortLink: z.string().describe('The full short link URL'),
      domain: z.string().describe('Domain of the short link'),
      slug: z.string().describe('Slug/key of the short link'),
      destinationUrl: z.string().describe('The destination URL'),
      qrCode: z.string().describe('URL to the QR code image'),
      archived: z.boolean().describe('Whether the link is archived'),
      trackConversion: z.boolean().describe('Whether conversion tracking is enabled'),
      externalId: z.string().nullable().describe('External ID mapping'),
      clicks: z.number().describe('Total number of clicks'),
      leads: z.number().describe('Total number of leads'),
      sales: z.number().describe('Total number of sales'),
      saleAmount: z.number().describe('Total sale amount in cents'),
      tags: z
        .array(
          z.object({
            tagId: z.string(),
            name: z.string(),
            color: z.string()
          })
        )
        .describe('Tags assigned to the link'),
      title: z.string().nullable().describe('Custom og:title'),
      description: z.string().nullable().describe('Custom og:description'),
      ios: z.string().nullable().describe('iOS-specific URL'),
      android: z.string().nullable().describe('Android-specific URL'),
      lastClicked: z.string().nullable().describe('When the link was last clicked'),
      createdAt: z.string().describe('When the link was created'),
      updatedAt: z.string().describe('When the link was last updated')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let link = await client.getLink({
      linkId: ctx.input.linkId,
      externalId: ctx.input.externalId,
      domain: ctx.input.domain,
      key: ctx.input.slug
    });

    return {
      output: {
        linkId: link.id,
        shortLink: link.shortLink,
        domain: link.domain,
        slug: link.key,
        destinationUrl: link.url,
        qrCode: link.qrCode,
        archived: link.archived,
        trackConversion: link.trackConversion,
        externalId: link.externalId,
        clicks: link.clicks,
        leads: link.leads,
        sales: link.sales,
        saleAmount: link.saleAmount,
        tags: link.tags.map(t => ({ tagId: t.id, name: t.name, color: t.color })),
        title: link.title,
        description: link.description,
        ios: link.ios,
        android: link.android,
        lastClicked: link.lastClicked,
        createdAt: link.createdAt,
        updatedAt: link.updatedAt
      },
      message: `Retrieved link **${link.shortLink}** with ${link.clicks} clicks`
    };
  })
  .build();
