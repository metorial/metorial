import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let manageAttachments = SlateTool.create(spec, {
  name: 'Manage Attachments',
  key: 'manage_attachments',
  description: `Upload, retrieve, or delete file attachments in EspoCRM. Attachments can be associated with records of any entity type. Upload attachments before using them with emails or other records.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z.enum(['upload', 'get', 'delete']).describe('Operation to perform'),
      attachmentId: z
        .string()
        .optional()
        .describe('Attachment ID (required for get and delete)'),
      fileName: z
        .string()
        .optional()
        .describe('File name with extension (required for upload)'),
      fileContent: z
        .string()
        .optional()
        .describe('Base64-encoded file content (required for upload)'),
      mimeType: z
        .string()
        .optional()
        .describe(
          'MIME type of the file (required for upload, e.g., application/pdf, image/png)'
        ),
      relatedType: z
        .string()
        .optional()
        .describe('Entity type to associate the attachment with'),
      relatedId: z.string().optional().describe('Record ID to associate the attachment with'),
      role: z.string().optional().describe('Attachment role (default: Attachment)')
    })
  )
  .output(
    z.object({
      attachmentId: z.string().describe('ID of the attachment'),
      fileName: z.string().optional().describe('File name'),
      mimeType: z.string().optional().describe('MIME type'),
      size: z.number().optional().describe('File size in bytes'),
      url: z.string().optional().describe('URL to access the attachment')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let { action, attachmentId } = ctx.input;

    if (action === 'upload') {
      if (!ctx.input.fileName) throw new Error('fileName is required for upload');
      if (!ctx.input.fileContent) throw new Error('fileContent is required for upload');
      if (!ctx.input.mimeType) throw new Error('mimeType is required for upload');

      let result = await client.createAttachment({
        name: ctx.input.fileName,
        type: ctx.input.mimeType,
        role: ctx.input.role || 'Attachment',
        relatedType: ctx.input.relatedType,
        relatedId: ctx.input.relatedId,
        file: `data:${ctx.input.mimeType};base64,${ctx.input.fileContent}`
      });

      return {
        output: {
          attachmentId: result.id,
          fileName: result.name,
          mimeType: result.type,
          size: result.size,
          url: result.url
        },
        message: `Attachment **${result.name}** uploaded successfully.`
      };
    }

    if (action === 'get') {
      if (!attachmentId) throw new Error('attachmentId is required for get');
      let result = await client.getAttachment(attachmentId);
      return {
        output: {
          attachmentId: result.id,
          fileName: result.name,
          mimeType: result.type,
          size: result.size,
          url: result.url
        },
        message: `Retrieved attachment **${result.name || attachmentId}**.`
      };
    }

    if (action === 'delete') {
      if (!attachmentId) throw new Error('attachmentId is required for delete');
      await client.deleteAttachment(attachmentId);
      return {
        output: {
          attachmentId
        },
        message: `Attachment **${attachmentId}** deleted successfully.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
