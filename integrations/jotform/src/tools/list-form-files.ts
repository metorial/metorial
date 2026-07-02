import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let pickString = (source: Record<string, any>, keys: string[]) => {
  for (let key of keys) {
    let value = source[key];
    if (value !== undefined && value !== null && String(value).length > 0) {
      return String(value);
    }
  }
  return undefined;
};

export let listFormFilesTool = SlateTool.create(spec, {
  name: 'List Form Files',
  key: 'list_form_files',
  description: `List files uploaded through a Jotform form. Returns file metadata and download URLs exposed by the Jotform API.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      formId: z.string().describe('ID of the form whose uploaded files should be listed'),
      limit: z
        .number()
        .optional()
        .describe('Maximum number of files to return. Jotform defaults to 20.'),
      offset: z.number().optional().describe('Number of files to skip for pagination'),
      sortBy: z.string().optional().describe('Optional Jotform orderby value, such as "date".')
    })
  )
  .output(
    z.object({
      files: z.array(
        z.object({
          fileId: z.string().optional().describe('File identifier when returned by Jotform'),
          name: z.string().describe('File name'),
          url: z.string().describe('Download URL or file URL returned by Jotform'),
          type: z.string().optional().describe('File MIME type or extension'),
          size: z.string().optional().describe('File size returned by Jotform'),
          uploadedAt: z.string().optional().describe('Upload timestamp when available'),
          submissionId: z
            .string()
            .optional()
            .describe('Submission ID associated with the upload when available'),
          raw: z.record(z.string(), z.any()).describe('Raw Jotform file object')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiDomain: ctx.config.apiDomain
    });

    let files = await client.listFormFiles(ctx.input.formId, {
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      orderby: ctx.input.sortBy
    });

    let fileList = Array.isArray(files)
      ? files
      : files && typeof files === 'object'
        ? Object.values(files)
        : [];

    let mapped = fileList.map((file: any) => {
      let raw = file && typeof file === 'object' ? file : { value: file };

      return {
        fileId: pickString(raw, ['id', 'fileId', 'file_id']),
        name: pickString(raw, ['name', 'filename', 'fileName']) || '',
        url: pickString(raw, ['url', 'fileUrl', 'file_url', 'link']) || '',
        type: pickString(raw, ['type', 'contentType', 'content_type', 'mimeType']),
        size: pickString(raw, ['size', 'filesize', 'fileSize']),
        uploadedAt: pickString(raw, ['created_at', 'createdAt', 'date', 'uploaded_at']),
        submissionId: pickString(raw, ['submission_id', 'submissionId', 'sid']),
        raw
      };
    });

    return {
      output: { files: mapped },
      message: `Found **${mapped.length}** file(s) for form ${ctx.input.formId}.`
    };
  })
  .build();
