import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { TypeformClient } from '../lib/client';
import { spec } from '../spec';

export let downloadResponseFile = SlateTool.create(spec, {
  name: 'Download Response File',
  key: 'download_response_file',
  description: `Download a file uploaded through a Typeform file upload question. Returns the file as base64 content for storage or forwarding.`,
  instructions: [
    'Use **Get Responses** to find file upload answers and copy the form, response, field, and filename values from the file URL.',
    'Typeform documents this endpoint as requiring a personal access token.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      formId: z.string().describe('ID of the form'),
      responseId: z.string().describe('ID of the response'),
      fieldId: z.string().describe('ID of the file upload field'),
      filename: z.string().describe('Uploaded file name'),
      inline: z
        .boolean()
        .optional()
        .describe('Request inline content disposition from Typeform')
    })
  )
  .output(
    z.object({
      formId: z.string().describe('Form ID'),
      responseId: z.string().describe('Response ID'),
      fieldId: z.string().describe('Field ID'),
      filename: z.string().describe('Uploaded file name'),
      base64Content: z.string().describe('Downloaded file contents as base64'),
      contentType: z.string().optional().describe('Response content type'),
      contentDisposition: z.string().optional().describe('Response content disposition'),
      byteLength: z.number().describe('Downloaded file size in bytes')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TypeformClient({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let result = await client.downloadResponseFile({
      formId: ctx.input.formId,
      responseId: ctx.input.responseId,
      fieldId: ctx.input.fieldId,
      filename: ctx.input.filename,
      inline: ctx.input.inline
    });

    return {
      output: {
        formId: ctx.input.formId,
        responseId: ctx.input.responseId,
        fieldId: ctx.input.fieldId,
        filename: ctx.input.filename,
        ...result
      },
      message: `Downloaded **${ctx.input.filename}** (${result.byteLength} bytes).`
    };
  })
  .build();
