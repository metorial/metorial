import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { BusinessClient } from '../lib/client';
import { workspaceIdSchema } from '../lib/schemas';
import { spec } from '../spec';

export let uploadTrainingData = SlateTool.create(spec, {
  name: 'Upload Training Data',
  key: 'upload_training_data',
  description: `Upload training data to a Botsonic bot's knowledge base. Supports three upload methods:
- **File**: Upload a file via URL (PDF, DOC, DOCX formats)
- **Text**: Upload text content directly with an optional title
- **URLs**: Bulk upload multiple URLs for the bot to learn from

The uploaded data will be processed asynchronously. Use the "List Training Data" tool to check processing status.`,
  instructions: [
    'For file uploads, provide a publicly accessible file URL',
    'For bulk URL uploads, provide an array of URLs the bot should learn from',
    'A unique upload ID is required for file and text uploads - use a UUID',
    'URL uploads target the bot selected by botId for account connections, or the bot owning a bot API token'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      botId: z
        .string()
        .min(1)
        .describe(
          'Bot ID from list_bots. For a bot API token connection, use the bot that owns the token.'
        ),
      workspaceId: workspaceIdSchema,
      uploadType: z
        .enum(['file', 'text', 'urls'])
        .describe('The type of training data to upload'),
      uploadId: z
        .string()
        .optional()
        .describe('Unique identifier for the upload (required for file and text uploads)'),
      fileUrl: z
        .string()
        .optional()
        .describe('URL of the file to upload (for file upload type)'),
      fileName: z.string().optional().describe('Name of the file (for file upload type)'),
      text: z.string().optional().describe('Text content to upload (for text upload type)'),
      title: z
        .string()
        .optional()
        .describe('Title for the text content (for text upload type)'),
      urls: z
        .array(z.string())
        .optional()
        .describe('List of URLs to upload (for urls upload type)'),
      isSitemap: z
        .boolean()
        .optional()
        .describe('Whether the URLs are from a sitemap (for urls upload type)'),
      sitemapRoot: z
        .string()
        .optional()
        .describe('Root URL of the sitemap (for urls upload type)')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the upload was accepted'),
      uploadType: z.string().describe('The type of upload that was performed'),
      botId: z.string().describe('Bot ID supplied for the upload'),
      uploadId: z
        .string()
        .optional()
        .describe(
          'Submitted data ID for file and text uploads; use list_training_data to check processing'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new BusinessClient(
      ctx.auth.token,
      ctx.auth.credentialType,
      ctx.input.botId,
      ctx.input.workspaceId
    );

    if (ctx.input.uploadType === 'file') {
      if (!ctx.input.fileUrl)
        throw createApiServiceError('fileUrl is required for file uploads', {
          reason: 'missing_file_url'
        });
      if (!ctx.input.uploadId)
        throw createApiServiceError('uploadId is required for file uploads', {
          reason: 'missing_upload_id'
        });
      await client.uploadFile({
        id: ctx.input.uploadId,
        botId: ctx.input.botId,
        fileUrl: ctx.input.fileUrl,
        fileName: ctx.input.fileName
      });
    } else if (ctx.input.uploadType === 'text') {
      if (!ctx.input.text)
        throw createApiServiceError('text is required for text uploads', {
          reason: 'missing_text'
        });
      if (!ctx.input.uploadId)
        throw createApiServiceError('uploadId is required for text uploads', {
          reason: 'missing_upload_id'
        });
      await client.uploadText({
        id: ctx.input.uploadId,
        botId: ctx.input.botId,
        text: ctx.input.text,
        title: ctx.input.title
      });
    } else if (ctx.input.uploadType === 'urls') {
      if (!ctx.input.urls || ctx.input.urls.length === 0)
        throw createApiServiceError('urls array is required for URL uploads', {
          reason: 'missing_urls'
        });
      await client.bulkUploadUrls({
        urls: ctx.input.urls,
        isSitemap: ctx.input.isSitemap,
        sitemapRoot: ctx.input.sitemapRoot
      });
    }

    return {
      output: {
        success: true,
        uploadType: ctx.input.uploadType,
        botId: ctx.input.botId,
        uploadId: ctx.input.uploadType === 'urls' ? undefined : ctx.input.uploadId
      },
      message: `Submitted ${ctx.input.uploadType} training data to bot **${ctx.input.botId}**.${ctx.input.uploadType === 'urls' ? ` ${ctx.input.urls?.length || 0} URLs submitted.` : ''}`
    };
  })
  .build();
