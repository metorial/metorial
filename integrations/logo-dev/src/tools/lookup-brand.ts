import { SlateTool } from 'slates';
import { z } from 'zod';
import { LogoDevClient } from '../lib/client';
import { brandMetadataSchema, metadataSchema } from '../lib/schemas';
import { spec } from '../spec';

export let lookupBrand = SlateTool.create(spec, {
  name: 'Look Up Brand',
  key: 'lookup_brand',
  description:
    'Look up a current brand profile by domain, stock ticker, crypto symbol, ISIN, company name, or stable brand ID. Returns identity, description, colors, socials, and image metadata.',
  instructions: [
    'Use a brand ID returned by this tool for stable lookups across domain changes.',
    'For not_indexed, retry after metadata.pending.retry_after_seconds and stop after expires_in_seconds.',
    'Use download_brand_image to download a logo or brandmark file.'
  ],
  constraints: ['Requires a secret API key and consumes API credits.'],
  tags: { readOnly: true }
})
  .input(
    z.object({
      identifier: z
        .string()
        .min(1)
        .describe(
          'Domain, ticker, crypto symbol, ISIN, company name, or brand ID returned by lookup_brand.'
        ),
      lookupType: z
        .enum(['domain', 'ticker', 'crypto', 'isin', 'name', 'brand_id'])
        .default('domain')
        .describe('Type of identifier supplied.')
    })
  )
  .output(
    z.object({
      status: z.enum(['ready', 'not_indexed', 'not_found']),
      brand: brandMetadataSchema
        .optional()
        .describe(
          'The ready brand profile; image fields contain metadata rather than download URLs.'
        ),
      metadata: metadataSchema
    })
  )
  .handleInvocation(async ctx => {
    let response = await new LogoDevClient(ctx.auth.token).lookupBrand(
      ctx.input.identifier,
      ctx.input.lookupType
    );
    if (!response.settled) {
      return {
        output: { status: response.data.status, metadata: response.metadata },
        message: response.metadata.pending?.message ?? 'No matching brand was found.'
      };
    }
    return {
      output: {
        status: response.data.status,
        brand: brandMetadataSchema.parse(response.data),
        metadata: response.metadata
      },
      message: `Retrieved the brand profile for **${response.data.name}**.`
    };
  })
  .build();
