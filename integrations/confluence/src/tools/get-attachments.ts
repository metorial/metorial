import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { confluenceServiceError } from '../lib/errors';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let attachmentOutputSchema = z.object({
  attachmentId: z.string(),
  fileName: z.string(),
  status: z.string(),
  mediaType: z.string().optional(),
  fileSize: z.number().optional(),
  pageId: z.string().optional(),
  blogPostId: z.string().optional(),
  versionNumber: z.number().optional(),
  webuiLink: z.string().optional(),
  downloadLink: z.string().optional()
});

let attachmentOutput = (a: {
  id: string;
  title: string;
  status: string;
  mediaType?: string;
  fileSize?: number;
  pageId?: string;
  blogPostId?: string;
  version?: { number: number };
  webuiLink?: string;
  downloadLink?: string;
}) => ({
  attachmentId: a.id,
  fileName: a.title,
  status: a.status,
  mediaType: a.mediaType,
  fileSize: a.fileSize,
  pageId: a.pageId,
  blogPostId: a.blogPostId,
  versionNumber: a.version?.number,
  webuiLink: a.webuiLink,
  downloadLink: a.downloadLink
});

export let getAttachments = SlateTool.create(spec, {
  name: 'Get Attachments',
  key: 'get_attachments',
  description: `List file attachments on a Confluence page or blog post. Returns attachment metadata including file name, media type, size, and download link.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      pageId: z
        .string()
        .optional()
        .describe('The page ID to list attachments for. Use contentId for new calls.'),
      contentId: z.string().optional().describe('The page or blog post ID'),
      contentType: z
        .enum(['page', 'blogpost'])
        .optional()
        .default('page')
        .describe('The type of content that owns the attachments'),
      limit: z
        .number()
        .optional()
        .default(25)
        .describe('Maximum number of attachments to return'),
      cursor: z.string().optional().describe('Pagination cursor')
    })
  )
  .output(
    z.object({
      attachments: z.array(attachmentOutputSchema),
      nextCursor: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth, ctx.config);
    let contentId = ctx.input.contentId || ctx.input.pageId;
    if (!contentId) {
      throw confluenceServiceError('contentId or pageId is required to list attachments.');
    }

    let response = await client.getContentAttachments(contentId, {
      contentType: ctx.input.contentType,
      limit: ctx.input.limit,
      cursor: ctx.input.cursor
    });

    let nextLink = response._links?.next;
    let nextCursor: string | undefined;
    if (nextLink) {
      let match = nextLink.match(/cursor=([^&]+)/);
      if (match) nextCursor = decodeURIComponent(match[1]!);
    }

    let attachments = response.results.map(attachmentOutput);

    return {
      output: { attachments, nextCursor },
      message: `Found **${attachments.length}** attachments on ${ctx.input.contentType} ${contentId}`
    };
  })
  .build();

export let uploadAttachment = SlateTool.create(spec, {
  name: 'Upload Attachment',
  key: 'upload_attachment',
  description: `Upload a file attachment to a Confluence page or blog post from base64-encoded content. Can create a new attachment or update an existing attachment with the same file name.`,
  tags: { destructive: false }
})
  .input(
    z.object({
      contentId: z.string().describe('The page or blog post ID to attach the file to'),
      fileName: z.string().describe('The attachment file name'),
      contentBase64: z.string().describe('The file content encoded as base64'),
      mediaType: z
        .string()
        .optional()
        .default('application/octet-stream')
        .describe('MIME type of the file'),
      comment: z.string().optional().describe('Optional attachment version comment'),
      minorEdit: z
        .boolean()
        .optional()
        .default(true)
        .describe('Whether the upload should be marked as a minor edit'),
      overwriteExisting: z
        .boolean()
        .optional()
        .default(false)
        .describe('Update the existing attachment when a file with the same name exists')
    })
  )
  .output(
    z.object({
      attachment: attachmentOutputSchema
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth, ctx.config);
    let attachment = await client.uploadContentAttachment({
      contentId: ctx.input.contentId,
      fileName: ctx.input.fileName,
      contentBase64: ctx.input.contentBase64,
      mediaType: ctx.input.mediaType,
      comment: ctx.input.comment,
      minorEdit: ctx.input.minorEdit,
      overwriteExisting: ctx.input.overwriteExisting
    });

    return {
      output: { attachment: attachmentOutput(attachment) },
      message: `Uploaded attachment **${attachment.title}** (ID: ${attachment.id}) to content ${ctx.input.contentId}`
    };
  })
  .build();

export let getAttachment = SlateTool.create(spec, {
  name: 'Get Attachment',
  key: 'get_attachment',
  description: `Retrieve a Confluence attachment by ID, including file metadata and its API download link when available.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      attachmentId: z.string().describe('The attachment ID to retrieve')
    })
  )
  .output(
    z.object({
      attachment: attachmentOutputSchema
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth, ctx.config);
    let attachment = await client.getAttachmentById(ctx.input.attachmentId);

    return {
      output: { attachment: attachmentOutput(attachment) },
      message: `Retrieved attachment **${attachment.title}** (ID: ${attachment.id})`
    };
  })
  .build();

export let deleteAttachment = SlateTool.create(spec, {
  name: 'Delete Attachment',
  key: 'delete_attachment',
  description: `Delete a Confluence attachment by ID. By default the attachment is moved to trash; purge permanently deletes a trashed attachment.`,
  tags: { destructive: true }
})
  .input(
    z.object({
      attachmentId: z.string().describe('The attachment ID to delete'),
      purge: z
        .boolean()
        .optional()
        .default(false)
        .describe('Permanently delete a trashed attachment')
    })
  )
  .output(
    z.object({
      deleted: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth, ctx.config);
    await client.deleteAttachment(ctx.input.attachmentId, ctx.input.purge);

    return {
      output: { deleted: true },
      message: `Deleted attachment ${ctx.input.attachmentId}`
    };
  })
  .build();
