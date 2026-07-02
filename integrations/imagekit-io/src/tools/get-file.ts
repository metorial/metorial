import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getFile = SlateTool.create(spec, {
  name: 'Get File Details',
  key: 'get_file',
  description: `Retrieve detailed information about a file including its metadata, tags, dimensions, URL, custom metadata, and version info.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      fileId: z.string().describe('Unique identifier of the file')
    })
  )
  .output(
    z.object({
      fileId: z.string().describe('Unique identifier'),
      name: z.string().describe('File name'),
      filePath: z.string().describe('Full path in the Media Library'),
      url: z.string().describe('CDN URL'),
      thumbnailUrl: z.string().optional().nullable().describe('Thumbnail URL'),
      fileType: z.string().describe('Type: "image", "non-image", or "video"'),
      mime: z.string().optional().describe('MIME type'),
      size: z.number().describe('File size in bytes'),
      height: z.number().optional().nullable().describe('Height in pixels'),
      width: z.number().optional().nullable().describe('Width in pixels'),
      tags: z.array(z.string()).optional().nullable().describe('Tags'),
      aiTags: z.array(z.any()).optional().nullable().describe('AI-generated tags'),
      isPrivateFile: z.boolean().optional().describe('Whether the file is private'),
      customCoordinates: z
        .string()
        .optional()
        .nullable()
        .describe('Custom focus area coordinates'),
      customMetadata: z
        .record(z.string(), z.any())
        .optional()
        .nullable()
        .describe('Custom metadata'),
      isPublished: z.boolean().optional().describe('Whether the file is published'),
      extensionStatus: z
        .record(z.string(), z.any())
        .optional()
        .nullable()
        .describe('Status of applied extensions'),
      versionInfo: z
        .object({
          versionId: z.string(),
          versionName: z.string()
        })
        .optional()
        .nullable()
        .describe('Current version info'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      updatedAt: z.string().optional().describe('Last update timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let f = await client.getFileDetails(ctx.input.fileId);

    return {
      output: {
        fileId: f.fileId,
        name: f.name,
        filePath: f.filePath,
        url: f.url,
        thumbnailUrl: f.thumbnailUrl,
        fileType: f.fileType,
        mime: f.mime,
        size: f.size,
        height: f.height,
        width: f.width,
        tags: f.tags,
        aiTags: f.AITags,
        isPrivateFile: f.isPrivateFile,
        customCoordinates: f.customCoordinates,
        customMetadata: f.customMetadata,
        isPublished: f.isPublished,
        extensionStatus: f.extensionStatus,
        versionInfo: f.versionInfo
          ? {
              versionId: f.versionInfo.id,
              versionName: f.versionInfo.name
            }
          : null,
        createdAt: f.createdAt,
        updatedAt: f.updatedAt
      },
      message: `Retrieved details for **${f.name}** (${f.fileType}, ${f.size} bytes) at \`${f.filePath}\`.`
    };
  })
  .build();
