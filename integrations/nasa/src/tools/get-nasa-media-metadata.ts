import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { NasaClient } from '../lib/client';
import { spec } from '../spec';

export let getNasaMediaMetadata = SlateTool.create(spec, {
  name: 'Get NASA Media Metadata or Captions',
  key: 'get_nasa_media_metadata',
  description:
    'Retrieve a downloadable metadata JSON file or video captions file for a NASA Image and Video Library item. Use search_nasa_media to discover NASA identifiers.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      nasaId: z.string().describe('NASA media identifier from search_nasa_media'),
      kind: z
        .enum(['metadata', 'captions'])
        .optional()
        .describe(
          'File to retrieve; defaults to metadata. Captions are available for supported videos.'
        )
    })
  )
  .output(
    z.object({
      nasaId: z.string().describe('NASA media identifier'),
      kind: z.enum(['metadata', 'captions']).describe('Retrieved file kind'),
      url: z.string().describe('Provider URL for the downloadable file'),
      raw: z.any().describe('Complete provider response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new NasaClient({ token: ctx.auth.token });
    let kind = ctx.input.kind ?? 'metadata';
    let result =
      kind === 'metadata'
        ? await client.getNasaImageMetadata(ctx.input.nasaId)
        : await client.getNasaImageCaptions(ctx.input.nasaId);
    if (typeof result.location !== 'string' || !result.location) {
      throw createApiServiceError('NASA did not return a file location for this media item.');
    }
    await ctx.addAttachment({
      type: 'url',
      url: result.location,
      ...(kind === 'metadata' ? { mimeType: 'application/json' } : {})
    });
    return {
      output: { nasaId: ctx.input.nasaId, kind, url: result.location, raw: result },
      message: `Retrieved ${kind} for NASA media item **${ctx.input.nasaId}**.`
    };
  })
  .build();
