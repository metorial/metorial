import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateFile = SlateTool.create(spec, {
  name: 'Update File',
  key: 'update_file',
  description: `Update a file's properties including tags, custom coordinates, custom metadata, publish status, and extensions. Only the provided fields will be updated.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      fileId: z.string().describe('Unique identifier of the file to update'),
      tags: z
        .array(z.string())
        .optional()
        .describe('New set of tags (replaces existing tags)'),
      customCoordinates: z
        .string()
        .optional()
        .describe('Custom focus area in format "x,y,width,height"'),
      customMetadata: z
        .record(z.string(), z.any())
        .optional()
        .describe('Custom metadata key-value pairs to set'),
      extensions: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe(
          'Extensions to apply, e.g. [{"name": "google-auto-tagging", "minConfidence": 80}]'
        ),
      webhookUrl: z
        .string()
        .optional()
        .describe('Webhook URL for extension processing results'),
      isPublished: z.boolean().optional().describe('Set publish status of the file'),
      includeFileVersions: z
        .boolean()
        .optional()
        .describe('Apply publish status to all file versions')
    })
  )
  .output(
    z.object({
      fileId: z.string().describe('Unique identifier'),
      name: z.string().describe('File name'),
      filePath: z.string().describe('Full path in the Media Library'),
      url: z.string().describe('CDN URL'),
      fileType: z.string().describe('File type'),
      size: z.number().describe('File size in bytes'),
      tags: z.array(z.string()).optional().nullable().describe('Updated tags'),
      customMetadata: z
        .record(z.string(), z.any())
        .optional()
        .nullable()
        .describe('Updated custom metadata'),
      isPublished: z.boolean().optional().describe('Publish status')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let updateParams: any = {};
    if (ctx.input.tags !== undefined) updateParams.tags = ctx.input.tags;
    if (ctx.input.customCoordinates !== undefined)
      updateParams.customCoordinates = ctx.input.customCoordinates;
    if (ctx.input.customMetadata !== undefined)
      updateParams.customMetadata = ctx.input.customMetadata;
    if (ctx.input.extensions !== undefined) updateParams.extensions = ctx.input.extensions;
    if (ctx.input.webhookUrl !== undefined) updateParams.webhookUrl = ctx.input.webhookUrl;
    if (ctx.input.isPublished !== undefined) {
      updateParams.publish = {
        isPublished: ctx.input.isPublished,
        includeFileVersions: ctx.input.includeFileVersions ?? false
      };
    }

    let f = await client.updateFile(ctx.input.fileId, updateParams);

    return {
      output: {
        fileId: f.fileId,
        name: f.name,
        filePath: f.filePath,
        url: f.url,
        fileType: f.fileType,
        size: f.size,
        tags: f.tags,
        customMetadata: f.customMetadata,
        isPublished: f.isPublished
      },
      message: `Updated file **${f.name}** at \`${f.filePath}\`.`
    };
  })
  .build();
