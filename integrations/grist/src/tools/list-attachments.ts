import { SlateTool } from 'slates';
import { z } from 'zod';
import { GristClient } from '../lib/client';
import { spec } from '../spec';

let attachmentSchema = z.object({
  attachmentId: z.number().describe('Attachment ID'),
  fileName: z.string().optional().describe('Original file name'),
  fileSize: z.number().optional().describe('File size in bytes'),
  timeUploaded: z.string().optional().describe('Upload timestamp'),
  fields: z.record(z.string(), z.any()).optional().describe('All attachment metadata fields')
});

export let listAttachments = SlateTool.create(spec, {
  name: 'List Attachments',
  key: 'list_attachments',
  description: `List attachment metadata for a document. Returns file names, sizes, and upload times. Can also clean up unused attachments to free storage.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      documentId: z.string().describe('Document ID'),
      limit: z.number().optional().describe('Maximum number of attachments to return')
    })
  )
  .output(
    z.object({
      attachments: z.array(attachmentSchema).describe('List of attachments')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GristClient({
      token: ctx.auth.token,
      serverUrl: ctx.auth.serverUrl
    });

    let result = await client.listAttachments(ctx.input.documentId, {
      limit: ctx.input.limit
    });

    let attachments = (result.records || []).map((a: any) => ({
      attachmentId: a.id,
      fileName: a.fields?.fileName,
      fileSize: a.fields?.fileSize,
      timeUploaded: a.fields?.timeUploaded,
      fields: a.fields
    }));

    return {
      output: { attachments },
      message: `Found **${attachments.length}** attachment(s) in document **${ctx.input.documentId}**.`
    };
  })
  .build();
