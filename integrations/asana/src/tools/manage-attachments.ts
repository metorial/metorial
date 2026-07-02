import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { asanaServiceError } from '../lib/errors';
import { spec } from '../spec';

let attachmentSchema = z.object({
  attachmentId: z.string(),
  name: z.string().optional(),
  resourceType: z.string().optional(),
  resourceSubtype: z.string().optional(),
  host: z.string().optional(),
  createdAt: z.string().optional(),
  downloadUrl: z.string().nullable().optional(),
  viewUrl: z.string().nullable().optional(),
  size: z.number().nullable().optional(),
  parent: z.any().optional()
});

let formatAttachment = (attachment: any) => ({
  attachmentId: attachment.gid,
  name: attachment.name,
  resourceType: attachment.resource_type,
  resourceSubtype: attachment.resource_subtype,
  host: attachment.host,
  createdAt: attachment.created_at,
  downloadUrl: attachment.download_url,
  viewUrl: attachment.view_url,
  size: attachment.size,
  parent: attachment.parent
});

let requireField = <T>(value: T | undefined | null, label: string, action: string): T => {
  if (value === undefined || value === null || value === '') {
    throw asanaServiceError(`${label} is required for "${action}".`);
  }

  return value;
};

let validateBase64 = (value: string) => {
  let normalized = value.trim();
  let bytes = Buffer.from(normalized, 'base64');
  let roundTrip = bytes.toString('base64').replace(/=+$/, '');
  let input = normalized.replace(/=+$/, '');

  if (bytes.length === 0 || roundTrip !== input) {
    throw asanaServiceError('contentBase64 must be valid non-empty base64 content.');
  }
};

export let manageAttachments = SlateTool.create(spec, {
  name: 'Manage Attachments',
  key: 'manage_attachments',
  description: `List, inspect, attach, upload, or delete Asana attachments on tasks, projects, and project briefs. File bytes are accepted only as input for uploads; downloaded file contents are not returned inline.`,
  instructions: [
    'Use action "list" with parentId to list attachment metadata for a task, project, or project brief.',
    'Use action "attach_external" with parentId, url, and name to attach an external URL.',
    'Use action "upload" with parentId, fileName, and contentBase64 to upload file bytes to Asana.',
    'Use action "get" or "delete" with attachmentId for a specific attachment.'
  ]
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'attach_external', 'upload', 'delete'])
        .describe('Attachment operation to perform.'),
      parentId: z
        .string()
        .optional()
        .describe('Parent task, project, or project brief GID for list/create actions.'),
      attachmentId: z.string().optional().describe('Attachment GID for get/delete actions.'),
      name: z.string().optional().describe('Display name for an external attachment.'),
      url: z.string().optional().describe('Public URL for an external attachment.'),
      connectToApp: z
        .boolean()
        .optional()
        .describe('For OAuth external task attachments, connect the current app widget.'),
      fileName: z.string().optional().describe('File name for upload action.'),
      contentBase64: z
        .string()
        .optional()
        .describe('Base64-encoded file content for upload action.'),
      mimeType: z.string().optional().describe('MIME type for uploaded file content.'),
      limit: z.number().optional().describe('Maximum attachments to return for list action.')
    })
  )
  .output(
    z.object({
      attachments: z.array(attachmentSchema).optional(),
      attachment: attachmentSchema.optional(),
      deleted: z.boolean().optional(),
      attachmentCount: z.number().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.action === 'list') {
      let parentId = requireField(ctx.input.parentId, 'parentId', ctx.input.action);
      let result = await client.listAttachments(parentId, { limit: ctx.input.limit });
      let attachments = (result.data || []).map(formatAttachment);

      return {
        output: { attachments, attachmentCount: attachments.length },
        message: `Found **${attachments.length}** attachment(s).`
      };
    }

    if (ctx.input.action === 'get') {
      let attachmentId = requireField(
        ctx.input.attachmentId,
        'attachmentId',
        ctx.input.action
      );
      let attachment = formatAttachment(await client.getAttachment(attachmentId));

      return {
        output: { attachment, attachmentCount: 1 },
        message: `Retrieved attachment **${attachment.name ?? attachment.attachmentId}**.`
      };
    }

    if (ctx.input.action === 'attach_external') {
      let parentId = requireField(ctx.input.parentId, 'parentId', ctx.input.action);
      let name = requireField(ctx.input.name, 'name', ctx.input.action);
      let url = requireField(ctx.input.url, 'url', ctx.input.action);
      let attachment = formatAttachment(
        await client.createExternalAttachment({
          parentId,
          name,
          url,
          connectToApp: ctx.input.connectToApp
        })
      );

      return {
        output: { attachment, attachmentCount: 1 },
        message: `Attached external resource **${attachment.name ?? name}**.`
      };
    }

    if (ctx.input.action === 'upload') {
      let parentId = requireField(ctx.input.parentId, 'parentId', ctx.input.action);
      let fileName = requireField(ctx.input.fileName, 'fileName', ctx.input.action);
      let contentBase64 = requireField(
        ctx.input.contentBase64,
        'contentBase64',
        ctx.input.action
      );
      validateBase64(contentBase64);

      let attachment = formatAttachment(
        await client.uploadAttachment({
          parentId,
          fileName,
          contentBase64,
          mimeType: ctx.input.mimeType
        })
      );

      return {
        output: { attachment, attachmentCount: 1 },
        message: `Uploaded attachment **${attachment.name ?? fileName}**.`
      };
    }

    let attachmentId = requireField(ctx.input.attachmentId, 'attachmentId', ctx.input.action);
    await client.deleteAttachment(attachmentId);

    return {
      output: { deleted: true, attachmentCount: 0 },
      message: `Deleted attachment ${attachmentId}.`
    };
  })
  .build();
