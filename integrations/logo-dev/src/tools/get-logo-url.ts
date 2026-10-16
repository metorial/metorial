import { SlateTool } from 'slates';
import { z } from 'zod';
import { buildLogoUrl } from '../lib/client';
import { spec } from '../spec';

export let getLogoUrl = SlateTool.create(spec, {
  name: 'Get Logo URL',
  key: 'get_logo_url',
  description: `Generate a Logo.dev CDN URL for a company logo. Supports lookup by **domain**, **stock ticker**, **cryptocurrency symbol**, **ISIN**, or **company name**. Returns a direct image URL that can be embedded in HTML, markdown, or any image container. Optionally configure format, size, theme, greyscale, and retina settings.`,
  instructions: [
    'For stock tickers on non-US exchanges, append the exchange shortcode (e.g., "7203.T" for Tokyo, "AZN.L" for London).',
    'A publishable key must be configured during authentication. It is safe to embed in a CDN URL.',
    'For a downloadable logo file, use download_brand_image. CDN URLs are for displaying images in websites and applications.',
    'Use PNG or WebP with the dark theme.'
  ],
  constraints: [
    'Maximum image size is 800px.',
    'Only JPG, PNG, and WebP output formats are supported.',
    'Domain-restricted publishable keys need an allowed Referer header from the embedding application.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      identifier: z
        .string()
        .describe(
          'The lookup value — a domain (e.g., "shopify.com"), stock ticker (e.g., "AAPL"), crypto symbol (e.g., "BTC"), ISIN (e.g., "US0378331005"), or company name (e.g., "Shopify").'
        ),
      lookupType: z
        .enum(['domain', 'ticker', 'crypto', 'isin', 'name'])
        .default('domain')
        .describe('Type of identifier being used for the logo lookup.'),
      format: z
        .enum(['jpg', 'png', 'webp'])
        .optional()
        .describe('Image format. Defaults to jpg.'),
      size: z
        .number()
        .min(1)
        .max(800)
        .optional()
        .describe('Image size in pixels (1–800). Defaults to 128.'),
      theme: z
        .enum(['dark', 'light'])
        .optional()
        .describe('Adjusts logo colors for visibility on dark or light backgrounds.'),
      greyscale: z.boolean().optional().describe('Desaturate the logo to greyscale.'),
      retina: z
        .boolean()
        .optional()
        .describe('Double the image resolution for high-density displays.'),
      fallback: z
        .enum(['monogram', '404'])
        .optional()
        .describe(
          'Behavior when no logo is found. "monogram" returns a letter placeholder (default), "404" returns an HTTP 404.'
        ),
      width: z
        .number()
        .int()
        .min(1)
        .max(800)
        .optional()
        .describe(
          'Image width in pixels; overrides the width from size while preserving aspect ratio.'
        ),
      height: z
        .number()
        .int()
        .min(1)
        .max(800)
        .optional()
        .describe(
          'Image height in pixels; overrides the height from size while preserving aspect ratio.'
        ),
      redirect: z
        .enum(['follow', '404'])
        .optional()
        .describe(
          'Use 404 to reject a domain that resolves only by redirecting to another brand.'
        )
    })
  )
  .output(
    z.object({
      logoUrl: z.string().describe('Direct CDN URL for the company logo image.'),
      identifier: z.string().describe('The identifier used for the lookup.'),
      lookupType: z.string().describe('The type of lookup performed.')
    })
  )
  .handleInvocation(async ctx => {
    let logoUrl = buildLogoUrl(
      ctx.input.identifier,
      ctx.input.lookupType,
      ctx.auth.publishableToken,
      {
        format: ctx.input.format,
        size: ctx.input.size,
        width: ctx.input.width,
        height: ctx.input.height,
        theme: ctx.input.theme,
        greyscale: ctx.input.greyscale,
        retina: ctx.input.retina,
        fallback: ctx.input.fallback,
        redirect: ctx.input.redirect
      }
    );

    return {
      output: {
        logoUrl,
        identifier: ctx.input.identifier,
        lookupType: ctx.input.lookupType
      },
      message: `Generated logo URL for **${ctx.input.identifier}** (${ctx.input.lookupType}): ${logoUrl}`
    };
  })
  .build();
