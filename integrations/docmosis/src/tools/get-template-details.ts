import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getTemplateDetails = SlateTool.create(spec, {
  name: 'Get Template Details',
  key: 'get_template_details',
  description: `Retrieve metadata about a specific template without downloading it. Returns the template name, file size, and upload/creation timestamp.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      templateName: z
        .string()
        .describe(
          'Path to the template in Docmosis Cloud (e.g., "/invoices/invoice-template.docx")'
        )
    })
  )
  .output(
    z.object({
      succeeded: z.boolean().describe('Whether the operation succeeded'),
      templateName: z.string().optional().describe('Full path and name of the template'),
      sizeBytes: z.number().optional().describe('File size in bytes'),
      uploadedTime: z.number().optional().describe('Upload timestamp in milliseconds'),
      createdTime: z.number().optional().describe('Creation timestamp in milliseconds')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let result = await client.getTemplateDetails(ctx.input.templateName);
    let details = result.templateDetails;

    let message = result.succeeded
      ? `Template \`${details?.name || ctx.input.templateName}\`: **${details?.sizeBytes ? `${Math.round(details.sizeBytes / 1024)} KB` : 'unknown size'}**.`
      : `Failed to get template details: ${result.shortMsg || 'Unknown error'}`;

    return {
      output: {
        succeeded: result.succeeded,
        templateName: details?.name,
        sizeBytes: details?.sizeBytes,
        uploadedTime: details?.uploadedTime,
        createdTime: details?.createdTime
      },
      message
    };
  })
  .build();
