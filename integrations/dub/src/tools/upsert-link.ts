import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let upsertLink = SlateTool.create(spec, {
  name: 'Upsert Link',
  key: 'upsert_link',
  description: `Create a new short link or update an existing one. If a link with the same URL already exists (or matching domain + key), it will be updated. Otherwise, a new link is created. Useful for idempotent link creation.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      destinationUrl: z.string().describe('The destination URL for the short link'),
      domain: z.string().optional().describe('Custom domain'),
      slug: z.string().optional().describe('Custom slug/key'),
      externalId: z.string().optional().describe('External system ID'),
      trackConversion: z.boolean().optional().describe('Enable conversion tracking'),
      tagIds: z.array(z.string()).optional().describe('Tag IDs to assign'),
      tagNames: z.array(z.string()).optional().describe('Tag names to assign'),
      folderId: z.string().optional().describe('Folder ID'),
      comments: z.string().optional().describe('Internal notes'),
      expiresAt: z.string().optional().describe('Expiration date in ISO-8601'),
      proxy: z.boolean().optional().describe('Enable custom social media previews'),
      title: z.string().optional().describe('Custom og:title'),
      description: z.string().optional().describe('Custom og:description'),
      image: z.string().optional().describe('Custom og:image URL'),
      ios: z.string().optional().describe('iOS-specific URL'),
      android: z.string().optional().describe('Android-specific URL'),
      utmSource: z.string().optional().describe('UTM source'),
      utmMedium: z.string().optional().describe('UTM medium'),
      utmCampaign: z.string().optional().describe('UTM campaign')
    })
  )
  .output(
    z.object({
      linkId: z.string().describe('ID of the created/updated link'),
      shortLink: z.string().describe('The full short link URL'),
      domain: z.string().describe('The domain'),
      slug: z.string().describe('The slug/key'),
      destinationUrl: z.string().describe('The destination URL'),
      qrCode: z.string().describe('URL to the QR code'),
      createdAt: z.string().describe('Creation timestamp'),
      updatedAt: z.string().describe('Last update timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let link = await client.upsertLink({
      url: ctx.input.destinationUrl,
      domain: ctx.input.domain,
      key: ctx.input.slug,
      externalId: ctx.input.externalId,
      trackConversion: ctx.input.trackConversion,
      tagIds: ctx.input.tagIds,
      tagNames: ctx.input.tagNames,
      folderId: ctx.input.folderId,
      comments: ctx.input.comments,
      expiresAt: ctx.input.expiresAt,
      proxy: ctx.input.proxy,
      title: ctx.input.title,
      description: ctx.input.description,
      image: ctx.input.image,
      ios: ctx.input.ios,
      android: ctx.input.android,
      utm_source: ctx.input.utmSource,
      utm_medium: ctx.input.utmMedium,
      utm_campaign: ctx.input.utmCampaign
    });

    return {
      output: {
        linkId: link.id,
        shortLink: link.shortLink,
        domain: link.domain,
        slug: link.key,
        destinationUrl: link.url,
        qrCode: link.qrCode,
        createdAt: link.createdAt,
        updatedAt: link.updatedAt
      },
      message: `Upserted link **${link.shortLink}** → ${link.url}`
    };
  })
  .build();
