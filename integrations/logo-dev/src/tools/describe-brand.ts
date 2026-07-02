import { SlateTool } from 'slates';
import { z } from 'zod';
import { LogoDevClient } from '../lib/client';
import { spec } from '../spec';

let brandColorSchema = z
  .object({
    hex: z.string().optional().describe('Hex color code (e.g., "#1DB954").'),
    rgb: z
      .object({
        r: z.number(),
        g: z.number(),
        b: z.number()
      })
      .optional()
      .describe('RGB color values.')
  })
  .passthrough();

export let describeBrand = SlateTool.create(spec, {
  name: 'Describe Brand',
  key: 'describe_brand',
  description: `Retrieve comprehensive brand data for a domain, including company name, description, logo URL, brand colors, blurhash placeholder, and social media links across 13 platforms (Facebook, GitHub, Instagram, LinkedIn, Pinterest, Reddit, Snapchat, Telegram, Tumblr, Twitter/X, WeChat, WhatsApp, YouTube).`,
  constraints: ['Available on paid plans only.', 'Requires a secret key (sk_...).'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      domain: z.string().describe('Company domain to describe (e.g., "sweetgreen.com").')
    })
  )
  .output(
    z.object({
      name: z.string().describe('Company name.'),
      domain: z.string().describe('Domain queried.'),
      description: z.string().describe('Company description.'),
      indexedAt: z.string().describe('ISO 8601 timestamp of when the data was last indexed.'),
      logoUrl: z.string().describe('Direct URL to the company logo.'),
      blurhash: z
        .string()
        .describe('Compact blurhash string for generating a blurred placeholder image.'),
      colors: z
        .array(brandColorSchema)
        .describe('Prominent brand colors ordered by prominence.'),
      socials: z
        .record(z.string(), z.string().nullable())
        .describe(
          'Social media profile URLs keyed by platform name (e.g., twitter, linkedin). Null if not found.'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new LogoDevClient(ctx.auth.token);
    let brand = await client.describeBrand(ctx.input.domain);

    let socialCount = Object.values(brand.socials).filter(v => v != null).length;

    return {
      output: {
        name: brand.name,
        domain: brand.domain,
        description: brand.description,
        indexedAt: brand.indexedAt,
        logoUrl: brand.logo,
        blurhash: brand.blurhash,
        colors: brand.colors,
        socials: brand.socials
      },
      message: `**${brand.name}** (${brand.domain}): ${brand.description ? brand.description.slice(0, 120) + (brand.description.length > 120 ? '...' : '') : 'No description available.'}  \n${brand.colors.length} brand color(s), ${socialCount} social link(s).`
    };
  })
  .build();
