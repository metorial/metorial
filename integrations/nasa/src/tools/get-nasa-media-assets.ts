import { SlateTool } from 'slates';
import { z } from 'zod';
import { NasaClient } from '../lib/client';
import { spec } from '../spec';

export let getNasaMediaAssets = SlateTool.create(spec, {
  name: 'Get NASA Media Assets',
  key: 'get_nasa_media_assets',
  description: `Retrieve the full list of asset files (different resolutions, formats) for a specific NASA media item by its NASA ID. Useful for getting direct download URLs to high-resolution images, original video files, or metadata.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      nasaId: z
        .string()
        .describe(
          'NASA unique identifier for the media item (e.g., "PIA12345", "KSC-20200101-PH-ABC01")'
        )
    })
  )
  .output(
    z.object({
      nasaId: z.string().describe('NASA ID of the media item'),
      assetUrls: z.array(z.string()).describe('List of URLs for all available asset files')
    })
  )
  .handleInvocation(async ctx => {
    let client = new NasaClient({ token: ctx.auth.token });

    let result = await client.getNasaImageAsset(ctx.input.nasaId);
    let assetUrls = (result.collection?.items || []).map((item: any) => item.href);

    return {
      output: {
        nasaId: ctx.input.nasaId,
        assetUrls
      },
      message: `Found **${assetUrls.length}** asset files for NASA ID "${ctx.input.nasaId}".`
    };
  })
  .build();
