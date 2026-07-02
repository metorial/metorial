import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let manageAttachment = SlateTool.create(spec, {
  name: 'Manage Attachment',
  key: 'manage_attachment',
  description: `List, upload, or delete file attachments on ServiceNow records. Attachments can be associated with any record in any table (incidents, changes, etc.).`
})
  .input(
    z.object({
      action: z.enum(['list', 'upload', 'delete']).describe('Action to perform'),
      tableName: z
        .string()
        .optional()
        .describe('Table name to filter or attach to (e.g. "incident")'),
      recordId: z.string().optional().describe('sys_id of the record to list/attach files to'),
      attachmentId: z
        .string()
        .optional()
        .describe('sys_id of the attachment to delete (required for delete action)'),
      fileName: z
        .string()
        .optional()
        .describe('Name of the file to upload (required for upload action)'),
      contentType: z
        .string()
        .optional()
        .default('text/plain')
        .describe('MIME type of the file (e.g. "text/plain", "application/pdf")'),
      content: z
        .string()
        .optional()
        .describe('File content as text/base64 string (required for upload action)'),
      limit: z.number().optional().default(20).describe('Maximum attachments to list')
    })
  )
  .output(
    z.object({
      attachments: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('List of attachments (for list action)'),
      attachment: z
        .record(z.string(), z.any())
        .optional()
        .describe('The uploaded attachment record (for upload action)'),
      deleted: z
        .boolean()
        .optional()
        .describe('Whether the attachment was deleted (for delete action)')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth, ctx.config);

    if (ctx.input.action === 'list') {
      let attachments = await client.getAttachments({
        tableName: ctx.input.tableName,
        recordId: ctx.input.recordId,
        limit: ctx.input.limit
      });

      return {
        output: { attachments },
        message: `Found **${attachments.length}** attachments.`
      };
    }

    if (ctx.input.action === 'upload') {
      if (
        !ctx.input.tableName ||
        !ctx.input.recordId ||
        !ctx.input.fileName ||
        !ctx.input.content
      ) {
        throw new Error(
          'tableName, recordId, fileName, and content are required for upload action'
        );
      }

      let attachment = await client.uploadAttachment(
        ctx.input.tableName,
        ctx.input.recordId,
        ctx.input.fileName,
        ctx.input.contentType || 'text/plain',
        ctx.input.content
      );

      return {
        output: { attachment },
        message: `Uploaded attachment **${ctx.input.fileName}** to \`${ctx.input.tableName}/${ctx.input.recordId}\`.`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.attachmentId) {
        throw new Error('attachmentId is required for delete action');
      }

      await client.deleteAttachment(ctx.input.attachmentId);

      return {
        output: { deleted: true },
        message: `Deleted attachment \`${ctx.input.attachmentId}\`.`
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();
