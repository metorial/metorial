import { SlateTool } from 'slates';
import { z } from 'zod';
import { BugherdClient } from '../lib/client';
import { spec } from '../spec';

let attachmentSchema = z.object({
  attachmentId: z.number().describe('Attachment ID'),
  fileName: z.string().describe('File name'),
  url: z.string().describe('Attachment URL'),
  createdAt: z.string().describe('When the attachment was created')
});

export let listAttachments = SlateTool.create(spec, {
  name: 'List Attachments',
  key: 'list_attachments',
  description: `List all file attachments on a specific BugHerd task.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: z.number().describe('Project ID'),
      taskId: z.number().describe('Task ID to list attachments for')
    })
  )
  .output(
    z.object({
      attachments: z.array(attachmentSchema).describe('List of attachments')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BugherdClient(ctx.auth.token);
    let rawAttachments = await client.listAttachments(ctx.input.projectId, ctx.input.taskId);

    let attachments = rawAttachments.map(a => ({
      attachmentId: a.id,
      fileName: a.file_name,
      url: a.url,
      createdAt: a.created_at
    }));

    return {
      output: { attachments },
      message: `Found **${attachments.length}** attachment(s) on task ${ctx.input.taskId}.`
    };
  })
  .build();

export let addAttachment = SlateTool.create(spec, {
  name: 'Add Attachment',
  key: 'add_attachment',
  description: `Add a file attachment to a BugHerd task by providing a URL to the file. The file will be fetched from the URL and attached to the task.`,
  constraints: [
    'Only URL-based attachments are supported. For large files, ensure the file is hosted at a publicly accessible URL.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      projectId: z.number().describe('Project ID'),
      taskId: z.number().describe('Task ID to attach the file to'),
      fileName: z.string().describe('Name of the file (e.g., "screenshot.png")'),
      fileUrl: z.string().describe('URL of the file to attach')
    })
  )
  .output(
    z.object({
      attachmentId: z.number().describe('Created attachment ID'),
      fileName: z.string().describe('File name'),
      url: z.string().describe('Attachment URL'),
      createdAt: z.string().describe('Creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BugherdClient(ctx.auth.token);
    let attachment = await client.createAttachmentFromUrl(
      ctx.input.projectId,
      ctx.input.taskId,
      ctx.input.fileName,
      ctx.input.fileUrl
    );

    return {
      output: {
        attachmentId: attachment.id,
        fileName: attachment.file_name,
        url: attachment.url,
        createdAt: attachment.created_at
      },
      message: `Attached **${attachment.file_name}** to task ${ctx.input.taskId}.`
    };
  })
  .build();

export let deleteAttachment = SlateTool.create(spec, {
  name: 'Delete Attachment',
  key: 'delete_attachment',
  description: `Permanently delete a file attachment from a BugHerd task.`,
  constraints: ['This action is irreversible.'],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      projectId: z.number().describe('Project ID'),
      taskId: z.number().describe('Task ID'),
      attachmentId: z.number().describe('Attachment ID to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the attachment was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BugherdClient(ctx.auth.token);
    await client.deleteAttachment(
      ctx.input.projectId,
      ctx.input.taskId,
      ctx.input.attachmentId
    );

    return {
      output: { deleted: true },
      message: `Deleted attachment ${ctx.input.attachmentId} from task ${ctx.input.taskId}.`
    };
  })
  .build();
