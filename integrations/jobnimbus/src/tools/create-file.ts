import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createFile = SlateTool.create(spec, {
  name: 'Create File',
  key: 'create_file',
  description: `Upload a file attachment to a contact in JobNimbus. Files are uploaded as base64-encoded data within the JSON payload. Supports documents, photos, and other file types.`,
  constraints: ['Maximum file size is 95MB.', 'File data must be base64-encoded.']
})
  .input(
    z.object({
      contactId: z.string().describe('The contact ID to attach this file to'),
      filename: z.string().describe('File name including extension (e.g. "proposal.pdf")'),
      fileData: z.string().describe('Base64-encoded file content'),
      description: z.string().optional().describe('File description'),
      fileType: z
        .enum(['document', 'photo'])
        .optional()
        .describe('File type category. Defaults to "document".')
    })
  )
  .output(
    z.object({
      fileId: z.string().describe('Unique JobNimbus ID of the created file'),
      filename: z.string().optional().describe('File name')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let typeMap: Record<string, string> = {
      document: '1',
      photo: '2'
    };

    let data: Record<string, any> = {
      customer: ctx.input.contactId,
      filename: ctx.input.filename,
      data: ctx.input.fileData,
      type: typeMap[ctx.input.fileType || 'document'] || '1'
    };

    if (ctx.input.description) data.description = ctx.input.description;

    let result = await client.createFile(data);

    return {
      output: {
        fileId: result.jnid,
        filename: result.filename
      },
      message: `Uploaded file **${ctx.input.filename}** to contact ${ctx.input.contactId}.`
    };
  })
  .build();
