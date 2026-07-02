import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let uploadFile = SlateTool.create(spec, {
  name: 'Upload File',
  key: 'upload_file',
  description: `Upload a file to the ImageKit Media Library from a URL or Base64-encoded data. Supports setting tags, folder destination, custom metadata, privacy settings, and AI extensions during upload.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      file: z
        .string()
        .describe('The file content — a remote URL (http/https) or a Base64-encoded string'),
      fileName: z
        .string()
        .describe('Name for the uploaded file including extension, e.g. "photo.jpg"'),
      folder: z
        .string()
        .optional()
        .describe('Destination folder path, e.g. "/images/products/"'),
      tags: z.array(z.string()).optional().describe('Tags for organizing the file'),
      isPrivateFile: z
        .boolean()
        .optional()
        .describe('Mark as private to restrict access via URL'),
      useUniqueFileName: z
        .boolean()
        .optional()
        .describe('Auto-generate a unique filename to prevent overwrites. Defaults to true.'),
      customCoordinates: z
        .string()
        .optional()
        .describe('Custom focus area coordinates in format "x,y,width,height"'),
      customMetadata: z
        .record(z.string(), z.any())
        .optional()
        .describe('Custom metadata key-value pairs to attach to the file'),
      overwriteFile: z
        .boolean()
        .optional()
        .describe('Overwrite an existing file with the same name and folder'),
      overwriteTags: z
        .boolean()
        .optional()
        .describe('Overwrite existing tags when overwriting a file'),
      overwriteCustomMetadata: z
        .boolean()
        .optional()
        .describe('Overwrite existing custom metadata when overwriting a file'),
      webhookUrl: z
        .string()
        .optional()
        .describe('URL to receive webhook notifications about extension processing results'),
      isPublished: z.boolean().optional().describe('Whether to publish the file immediately'),
      preTransformation: z
        .string()
        .optional()
        .describe('Pre-upload transformation string, e.g. "rt-90" for 90° rotation'),
      postTransformations: z
        .array(
          z.object({
            type: z.string().describe('Transformation type, e.g. "transformation"'),
            value: z.string().describe('Transformation string, e.g. "rt-90"')
          })
        )
        .optional()
        .describe('Post-upload transformations to apply (max 5)'),
      checks: z
        .string()
        .optional()
        .describe('Server-side validation conditions for the uploaded file')
    })
  )
  .output(
    z.object({
      fileId: z.string().describe('Unique identifier for the uploaded file'),
      name: z.string().describe('Name of the uploaded file'),
      url: z.string().describe('CDN URL of the uploaded file'),
      thumbnailUrl: z.string().optional().describe('URL of the auto-generated thumbnail'),
      filePath: z.string().describe('Path of the file in the Media Library'),
      fileType: z.string().describe('Type of file: "image", "non-image", or "video"'),
      size: z.number().describe('File size in bytes'),
      height: z.number().optional().describe('Height in pixels (images/videos only)'),
      width: z.number().optional().describe('Width in pixels (images/videos only)'),
      tags: z.array(z.string()).optional().nullable().describe('Tags assigned to the file'),
      aiTags: z.array(z.any()).optional().nullable().describe('AI-generated tags'),
      isPrivateFile: z.boolean().optional().describe('Whether the file is private'),
      customMetadata: z
        .record(z.string(), z.any())
        .optional()
        .nullable()
        .describe('Custom metadata attached to the file'),
      versionInfo: z
        .object({
          versionId: z.string(),
          versionName: z.string()
        })
        .optional()
        .describe('Version information')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let transformation:
      | { pre?: string; post?: Array<{ type: string; value: string }> }
      | undefined;
    if (ctx.input.preTransformation || ctx.input.postTransformations) {
      transformation = {};
      if (ctx.input.preTransformation) transformation.pre = ctx.input.preTransformation;
      if (ctx.input.postTransformations) transformation.post = ctx.input.postTransformations;
    }

    let result = await client.uploadFile({
      file: ctx.input.file,
      fileName: ctx.input.fileName,
      folder: ctx.input.folder,
      tags: ctx.input.tags,
      isPrivateFile: ctx.input.isPrivateFile,
      useUniqueFileName: ctx.input.useUniqueFileName,
      customCoordinates: ctx.input.customCoordinates,
      customMetadata: ctx.input.customMetadata,
      overwriteFile: ctx.input.overwriteFile,
      overwriteTags: ctx.input.overwriteTags,
      overwriteCustomMetadata: ctx.input.overwriteCustomMetadata,
      webhookUrl: ctx.input.webhookUrl,
      isPublished: ctx.input.isPublished,
      transformation,
      checks: ctx.input.checks
    });

    return {
      output: {
        fileId: result.fileId,
        name: result.name,
        url: result.url,
        thumbnailUrl: result.thumbnailUrl,
        filePath: result.filePath,
        fileType: result.fileType,
        size: result.size,
        height: result.height,
        width: result.width,
        tags: result.tags,
        aiTags: result.AITags,
        isPrivateFile: result.isPrivateFile,
        customMetadata: result.customMetadata,
        versionInfo: result.versionInfo
          ? {
              versionId: result.versionInfo.id,
              versionName: result.versionInfo.name
            }
          : undefined
      },
      message: `Uploaded **${result.name}** to \`${result.filePath}\` (${result.fileType}, ${result.size} bytes). URL: ${result.url}`
    };
  })
  .build();
