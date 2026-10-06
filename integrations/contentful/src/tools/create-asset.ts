import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { currentVersion, invalid, recovery, resourceId, selection } from '../lib/schemas';
import { spec } from '../spec';

export let createAsset = SlateTool.create(spec, {
  name: 'Create Asset',
  key: 'create_asset',
  description: `Create a new asset in Contentful. Provide file upload URL, title, and description per locale. Optionally request processing and publish only after completion.`,
  instructions: [
    'Fields must use locale keys, e.g. {"en-US": {...}}.',
    'The file.upload field should be a publicly accessible URL for Contentful to download.',
    'Processing is asynchronous. A pending receipt preserves the asset ID; inspect get_asset before publishing or retrying.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      ...selection,
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
            upload: z
              .string()
              .url()
              .refine(
                value => value.startsWith('https://'),
                'Use a publicly reachable HTTPS URL.'
              )
              .describe('Public URL of the file to upload.')
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
      assetId: resourceId.describe('ID of the created asset.'),
      version: z.number().describe('Current version number.'),
      processed: z.boolean().describe('Whether the asset file was processed.'),
      published: z.boolean().describe('Whether the asset was published.'),
      createdAt: z.string().optional().describe('ISO 8601 creation timestamp.')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth, ctx.input);

    let fields: Record<string, any> = {
      title: ctx.input.title,
      file: ctx.input.file
    };
    if (ctx.input.description) {
      fields.description = ctx.input.description;
    }

    if (!Object.keys(ctx.input.file).length)
      throw invalid('Provide at least one file locale.');
    let asset = await client.createAsset(fields);
    let processed = false;
    let published = false;

    if (ctx.input.processAndPublish) {
      try {
        for (let locale of Object.keys(ctx.input.file)) {
          asset = await client.getAsset(asset.sys.id);
          await client.processAsset(asset.sys.id, locale, currentVersion(asset));
        }
        for (let attempt = 0; attempt < 8; attempt++) {
          asset = await client.getAsset(asset.sys.id);
          processed = Object.keys(ctx.input.file).every(
            locale => typeof asset.fields?.file?.[locale]?.url === 'string'
          );
          if (processed) break;
          if (attempt < 7) await new Promise(resolve => setTimeout(resolve, 500));
        }
        if (processed) {
          asset = await client.publishAsset(asset.sys.id, currentVersion(asset));
          published = true;
        }
      } catch {
        throw recovery('asset', asset.sys.id, client.spaceId, client.environmentId);
      }
    }

    return {
      output: {
        assetId: asset.sys.id,
        version: currentVersion(asset),
        processed,
        published,
        createdAt: asset.sys.createdAt
      },
      message: `Created asset **${asset.sys.id}**${published ? ', processed and published it' : ctx.input.processAndPublish ? '; processing is pending, inspect the existing asset before publishing' : ''}.`
    };
  })
  .build();
