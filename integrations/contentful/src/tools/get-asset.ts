import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let getAsset = SlateTool.create(spec, {
  name: 'Get Asset',
  key: 'get_asset',
  description: `Retrieve a single asset by ID. Returns full asset metadata including file URL, dimensions, and locale-specific fields.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      assetId: z.string().describe('The ID of the asset to retrieve.')
    })
  )
  .output(
    z.object({
      assetId: z.string(),
      title: z.record(z.string(), z.string()).optional(),
      description: z.record(z.string(), z.string()).optional(),
      file: z
        .record(
          z.string(),
          z.object({
            fileName: z.string().optional(),
            contentType: z.string().optional(),
            url: z.string().optional(),
            size: z.number().optional(),
            width: z.number().optional(),
            height: z.number().optional()
          })
        )
        .optional(),
      version: z.number().optional(),
      createdAt: z.string().optional(),
      updatedAt: z.string().optional(),
      publishedAt: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    let asset = await client.getAsset(ctx.input.assetId);

    let fields = asset.fields || {};
    let fileByLocale: Record<string, any> = {};
    if (fields.file) {
      for (let [locale, fileData] of Object.entries(fields.file as Record<string, any>)) {
        fileByLocale[locale] = {
          fileName: fileData?.fileName,
          contentType: fileData?.contentType,
          url: fileData?.url,
          size: fileData?.details?.size,
          width: fileData?.details?.image?.width,
          height: fileData?.details?.image?.height
        };
      }
    }

    return {
      output: {
        assetId: asset.sys?.id,
        title: fields.title,
        description: fields.description,
        file: Object.keys(fileByLocale).length > 0 ? fileByLocale : undefined,
        version: asset.sys?.version,
        createdAt: asset.sys?.createdAt,
        updatedAt: asset.sys?.updatedAt,
        publishedAt: asset.sys?.publishedAt
      },
      message: `Retrieved asset **${asset.sys?.id}**.`
    };
  })
  .build();
