import { SlateTool } from 'slates';
import { z } from 'zod';
import { buildLogoUrl } from '../lib/client';
import { spec } from '../spec';

export let getLogoUrl = SlateTool.create(spec, {
  name: 'Get Logo URL',
  key: 'get_logo_url',
  description: `Generate a CDN URL for directly embedding a brand's logo in HTML. The URL can be used in \`<img>\` tags and always serves the latest version of the logo.
Supports customizable dimensions, theme variants, multiple logo types, output format selection, and smart fallback options.`,
  instructions: [
    'Logos must be hotlinked (direct embedding). Caching or downloading is not permitted without a custom agreement.',
    'Requires a Client ID to be configured in authentication.',
    'The same identifier types as the Brand API are supported: domain, ticker, ISIN, crypto symbol.'
  ],
  constraints: [
    'Up to 500,000 requests/month under free fair use.',
    'Rate limited to 1,000 requests per 5 minutes per IP.'
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
          'Brand identifier: domain (e.g. "nike.com"), ticker, ISIN, or crypto symbol'
        ),
      logoType: z
        .enum(['icon', 'logo', 'symbol'])
        .optional()
        .describe(
          'Logo type. "icon" is the square icon, "logo" is the full horizontal logo, "symbol" is the brand symbol. Defaults to "icon".'
        ),
      theme: z.enum(['light', 'dark']).optional().describe('Theme variant for the logo'),
      height: z
        .number()
        .optional()
        .describe('Desired height in pixels (aspect ratio is preserved)'),
      width: z
        .number()
        .optional()
        .describe('Desired width in pixels (aspect ratio is preserved)'),
      fallback: z
        .enum(['brandfetch', 'transparent', 'lettermark', '404'])
        .optional()
        .describe(
          'Fallback behavior when logo is not found. "brandfetch" shows Brandfetch default, "transparent" returns transparent image, "lettermark" generates a letter-based logo, "404" returns HTTP 404.'
        ),
      format: z
        .enum(['png', 'jpg', 'svg', 'webp'])
        .optional()
        .describe('Output image format. Defaults to WebP.')
    })
  )
  .output(
    z.object({
      logoUrl: z.string().describe('CDN URL for the brand logo, ready to embed in HTML'),
      identifier: z.string().describe('The brand identifier used'),
      logoType: z.string().describe('The logo type used')
    })
  )
  .handleInvocation(async ctx => {
    if (!ctx.auth.clientId) {
      throw new Error(
        'Client ID is required for the Logo API. Please configure your Brandfetch Client ID in the authentication settings.'
      );
    }

    let logoType = ctx.input.logoType || 'icon';

    let url = buildLogoUrl({
      identifier: ctx.input.identifier,
      clientId: ctx.auth.clientId,
      type: ctx.input.logoType,
      theme: ctx.input.theme,
      height: ctx.input.height,
      width: ctx.input.width,
      fallback: ctx.input.fallback,
      format: ctx.input.format
    });

    return {
      output: {
        logoUrl: url,
        identifier: ctx.input.identifier,
        logoType
      },
      message: `Generated logo CDN URL for **${ctx.input.identifier}** (${logoType}): ${url}`
    };
  })
  .build();
