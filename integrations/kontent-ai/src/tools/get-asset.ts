import { SlateTool } from 'slates';
import { z } from 'zod';
import { ManagementClient } from '../lib/client';
import { spec } from '../spec';

export let getAsset = SlateTool.create(spec, {
  name: 'Get Asset',
  key: 'get_asset',
  description: `Retrieves a single asset by its ID or external ID. Returns full asset details including file metadata, descriptions in all languages, and folder information.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      identifier: z.string().describe('The ID or external ID of the asset'),
      identifierType: z
        .enum(['id', 'external_id'])
        .default('id')
        .describe('Type of identifier')
    })
  )
  .output(
    z.object({
      assetId: z.string().describe('Internal ID of the asset'),
      fileName: z.string().describe('Name of the file'),
      title: z.string().nullable().describe('Title of the asset'),
      url: z.string().describe('URL of the asset'),
      size: z.number().describe('File size in bytes'),
      mimeType: z.string().describe('MIME type of the file'),
      imageWidth: z.number().nullable().describe('Image width in pixels'),
      imageHeight: z.number().nullable().describe('Image height in pixels'),
      descriptions: z
        .array(
          z.object({
            languageCodename: z.string().optional().describe('Language codename'),
            languageId: z.string().optional().describe('Language ID'),
            description: z.string().describe('Description text')
          })
        )
        .describe('Asset descriptions by language'),
      externalId: z.string().optional().describe('External ID if set'),
      lastModified: z.string().describe('ISO 8601 timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ManagementClient({
      token: ctx.auth.token,
      environmentId: ctx.config.environmentId
    });

    let asset = await client.getAsset(ctx.input.identifier, ctx.input.identifierType);

    return {
      output: {
        assetId: asset.id,
        fileName: asset.file_name,
        title: asset.title,
        url: asset.url,
        size: asset.size,
        mimeType: asset.type,
        imageWidth: asset.image_width,
        imageHeight: asset.image_height,
        descriptions: (asset.descriptions || []).map(d => ({
          languageCodename: d.language?.codename,
          languageId: d.language?.id,
          description: d.description
        })),
        externalId: asset.external_id,
        lastModified: asset.last_modified
      },
      message: `Retrieved asset **"${asset.title || asset.file_name}"** (${asset.type}, ${Math.round(asset.size / 1024)} KB).`
    };
  })
  .build();
