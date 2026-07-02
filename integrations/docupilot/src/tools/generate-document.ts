import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let generateDocument = SlateTool.create(spec, {
  name: 'Generate Document',
  key: 'generate_document',
  description: `Generate a document from a template by merging data into it. Provide the template ID and a data object whose keys match the template's merge field tokens (use **Get Template** to discover available tokens). Returns a secure download URL for the generated document (valid for 24 hours by default). Generated documents are also sent to any configured deliveries.`,
  instructions: [
    'Use the Get Template tool first to discover available merge field tokens for the template.',
    'The mergeData keys must match the template token names exactly.',
    'Nested objects and arrays are supported for complex data like line items.'
  ]
})
  .input(
    z.object({
      templateId: z.number().describe('ID of the template to generate a document from'),
      mergeData: z
        .record(z.string(), z.unknown())
        .describe(
          'Data to merge into the template. Keys must match the template merge field tokens.'
        ),
      outputType: z
        .enum(['html', 'pdf', 'png', 'docx', 'pptx', 'xlsx'])
        .optional()
        .describe('Override the default output format')
    })
  )
  .output(
    z.object({
      fileUrl: z
        .string()
        .optional()
        .describe('Secure download URL for the generated document (valid for 24 hours)'),
      fileName: z.string().optional().describe('Name of the generated file')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      workspaceId: ctx.auth.workspaceId
    });

    let result = await client.generateDocument(ctx.input.templateId, ctx.input.mergeData, {
      download: 'true',
      outputType: ctx.input.outputType
    });

    return {
      output: {
        fileUrl: result.file_url,
        fileName: result.file_name
      },
      message: result.file_url
        ? `Document generated successfully: **${result.file_name ?? 'document'}**. [Download link](${result.file_url}) (valid for 24 hours).`
        : `Document generation triggered. The document will be sent to configured deliveries.`
    };
  })
  .build();
