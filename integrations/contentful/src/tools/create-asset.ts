import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let createAsset = SlateTool.create(spec, {
  name: 'Create Asset',
  key: 'create_asset',
  description: `Create a new asset in Contentful. Provide file upload URL, title, and description per locale. Optionally process and publish the asset immediately.`,
  instructions: [
    'Fields must use locale keys, e.g. {"en-US": {...}}.',
    'The file.upload field should be a publicly accessible URL for Contentful to download.',
    'Set processAndPublish to true to process the file and publish the asset in one step.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      title: z
        .record(z.string(), z.string())
        .describe('Asset title by locale, e.g. {"en-US": "Photo"}.'),
      description: z
        .record(z.string(), z.string())
        .optional()
        .describe('Asset description by locale.'),
      file: z
        .record(
          z.string(),
          z.object({
            fileName: z.string().describe('File name with extension.'),
            contentType: z.string().describe('MIME type, e.g. "image/jpeg".'),
            upload: z.string().describe('Public URL of the file to upload.')
          })
        )
        .describe(
          'File details by locale, e.g. {"en-US": {fileName: "photo.jpg", contentType: "image/jpeg", upload: "https://example.com/photo.jpg"}}.'
        ),
      processAndPublish: z
        .boolean()
        .optional()
        .describe('If true, process and publish the asset after creation.')
    })
  )
  .output(
    z.object({
      assetId: z.string().describe('ID of the created asset.'),
      version: z.number().describe('Current version number.'),
      processed: z.boolean().describe('Whether the asset file was processed.'),
      published: z.boolean().describe('Whether the asset was published.'),
      createdAt: z.string().optional().describe('ISO 8601 creation timestamp.')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);

    let fields: Record<string, any> = {
      title: ctx.input.title,
      file: ctx.input.file
    };
    if (ctx.input.description) {
      fields.description = ctx.input.description;
    }

    let asset = await client.createAsset(fields);
    let processed = false;
    let published = false;

    if (ctx.input.processAndPublish) {
      // Process file for each locale
      for (let locale of Object.keys(ctx.input.file)) {
        await client.processAsset(asset.sys.id, locale, asset.sys.version);
      }
      processed = true;

      // Wait briefly for processing, then fetch updated version and publish
      // Contentful processing is async, re-fetch to get updated version
      await new Promise(resolve => setTimeout(resolve, 2000));
      let updated = await client.getAsset(asset.sys.id);
      asset = await client.publishAsset(updated.sys.id, updated.sys.version);
      published = true;
    }

    return {
      output: {
        assetId: asset.sys.id,
        version: asset.sys.version,
        processed,
        published,
        createdAt: asset.sys.createdAt
      },
      message: `Created asset **${asset.sys.id}**${published ? ', processed and published it' : ''}.`
    };
  })
  .build();
