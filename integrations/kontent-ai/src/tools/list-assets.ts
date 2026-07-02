import { SlateTool } from 'slates';
import { z } from 'zod';
import { ManagementClient } from '../lib/client';
import { spec } from '../spec';

export let listAssets = SlateTool.create(spec, {
  name: 'List Assets',
  key: 'list_assets',
  description: `Retrieves assets (files, images, documents) from a Kontent.ai environment. Returns asset metadata including file name, URL, size, dimensions, and descriptions.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      continuationToken: z.string().optional().describe('Continuation token for pagination')
    })
  )
  .output(
    z.object({
      assets: z.array(
        z.object({
          assetId: z.string().describe('Internal ID of the asset'),
          fileName: z.string().describe('Name of the file'),
          title: z.string().nullable().describe('Title of the asset'),
          url: z.string().describe('URL of the asset'),
          size: z.number().describe('File size in bytes'),
          mimeType: z.string().describe('MIME type of the file'),
          imageWidth: z
            .number()
            .nullable()
            .describe('Image width in pixels (null for non-images)'),
          imageHeight: z
            .number()
            .nullable()
            .describe('Image height in pixels (null for non-images)'),
          externalId: z.string().optional().describe('External ID if set'),
          lastModified: z.string().describe('ISO 8601 timestamp')
        })
      ),
      continuationToken: z.string().optional().describe('Token for fetching the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ManagementClient({
      token: ctx.auth.token,
      environmentId: ctx.config.environmentId
    });

    let result = await client.listAssets(ctx.input.continuationToken);

    let assets = result.assets.map(asset => ({
      assetId: asset.id,
      fileName: asset.file_name,
      title: asset.title,
      url: asset.url,
      size: asset.size,
      mimeType: asset.type,
      imageWidth: asset.image_width,
      imageHeight: asset.image_height,
      externalId: asset.external_id,
      lastModified: asset.last_modified
    }));

    return {
      output: {
        assets,
        continuationToken: result.continuationToken
      },
      message: `Retrieved **${assets.length}** asset(s).${result.continuationToken ? ' More available with continuation token.' : ''}`
    };
  })
  .build();
