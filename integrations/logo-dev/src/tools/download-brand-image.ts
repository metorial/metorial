import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { LogoDevClient } from '../lib/client';
import { prepareImageDownload } from '../lib/images';
import {
  imageDownloadOptionsSchema,
  imageMetadataSchema,
  lookupTypeSchema,
  metadataSchema
} from '../lib/schemas';
import { spec } from '../spec';

export let downloadBrandImage = SlateTool.create(spec, {
  name: 'Download Brand Image',
  key: 'download_brand_image',
  description:
    'Download a company logo or brandmark by domain, stock ticker, crypto symbol, ISIN, or company name. Returns image metadata and a downloadable file when ready.',
  instructions: [
    'For not_indexed, retry after metadata.pending.retry_after_seconds and stop after expires_in_seconds.',
    'Brandmarks are wide logo lockups containing a wordmark and, when available, a symbol.',
    'Use PNG or WebP with the dark theme.'
  ],
  constraints: [
    'Requires a secret API key and consumes API credits. A not_found result can mean the brand has no image of the requested kind.'
  ],
  tags: { readOnly: true }
})
  .input(
    imageDownloadOptionsSchema.extend({
      identifier: z
        .string()
        .min(1)
        .describe('Domain, ticker, crypto symbol, ISIN, or company name.'),
      lookupType: lookupTypeSchema.default('domain').describe('Type of identifier supplied.'),
      kind: z
        .enum(['logo', 'brandmark'])
        .default('logo')
        .describe('Image to download. Defaults to logo.')
    })
  )
  .output(
    z.object({
      status: z.enum(['ready', 'not_indexed', 'not_found']),
      kind: z.enum(['logo', 'brandmark']),
      brandId: z.string().optional(),
      image: imageMetadataSchema.optional(),
      metadata: metadataSchema
    })
  )
  .handleInvocation(async ctx => {
    if (ctx.input.theme === 'dark' && ctx.input.format === 'jpg') {
      throw createApiServiceError('Use PNG or WebP format with the dark theme.');
    }
    let response = await new LogoDevClient(ctx.auth.token).getImage(
      ctx.input.identifier,
      ctx.input.lookupType,
      ctx.input.kind
    );
    if (!response.settled) {
      return {
        output: {
          status: response.data.status,
          kind: ctx.input.kind,
          metadata: response.metadata
        },
        message:
          response.metadata.pending?.message ??
          `No ${ctx.input.kind} was found for this brand.`
      };
    }
    let options = imageDownloadOptionsSchema.parse(ctx.input);
    let download = prepareImageDownload(response.data, options);
    await ctx.addAttachment({
      type: 'url',
      url: download.url,
      mimeType: download.mimeType,
      refreshAt: download.expiresAt,
      refreshReference: {
        brandId: response.data.brand_id,
        kind: ctx.input.kind,
        options
      }
    });
    return {
      output: {
        status: response.data.status,
        kind: response.data.kind,
        brandId: response.data.brand_id,
        image: imageMetadataSchema.parse(response.data),
        metadata: response.metadata
      },
      message: `Prepared the ${ctx.input.kind} for download.`
    };
  })
  .build();
