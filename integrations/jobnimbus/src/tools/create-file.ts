import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { ownerIds, recordId } from '../lib/records';
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

    let typeMap = {
      document: 1,
      photo: 2
    };

    let data: Record<string, any> = {
      related: [ctx.input.contactId],
      subtype: 'contact',
      persist: true,
      filename: ctx.input.filename,
      data: ctx.input.fileData,
      type: typeMap[ctx.input.fileType || 'document']
    };

    if (ctx.input.description) data.description = ctx.input.description;

    let result = await client.createFile(data);
    let file = typeof result?.jnid === 'string' && result.jnid.trim() ? result : undefined;
    if (!file && Array.isArray(result?.files)) {
      let matchingFiles = result.files.filter(
        (candidate: any) =>
          typeof candidate?.jnid === 'string' &&
          candidate.jnid.trim() &&
          candidate.filename === ctx.input.filename &&
          (recordId(candidate.primary) === ctx.input.contactId ||
            ownerIds(candidate.related)?.includes(ctx.input.contactId))
      );
      if (matchingFiles.length === 1) file = matchingFiles[0];
    }
    if (!file) {
      throw createApiServiceError(
        'JobNimbus did not return an unambiguous uploaded file ID. Check the contact files before retrying the upload.'
      );
    }

    return {
      output: {
        fileId: file.jnid,
        filename: file.filename ?? undefined
      },
      message: `Uploaded file **${ctx.input.filename}** to contact ${ctx.input.contactId}.`
    };
  })
  .build();
