import { getResponseHeaderValue, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let generateDocument = SlateTool.create(spec, {
  name: 'Generate Document',
  key: 'generate_document',
  description: `Generate a document from a template by merging data into it. Provide the template ID and a data object whose keys match the template's merge field tokens (use **Get Template** to discover available tokens). Provides the generated document for download. A returned secure provider URL expires according to your data retention settings (24 hours by default). Generated documents are also sent to any configured deliveries.`,
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
        .describe(
          'Secure provider download URL; expiration follows workspace data retention settings'
        ),
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

    if (result.file_url) {
      let download = await client.downloadGeneratedDocument(result.file_url);
      let contentType = getResponseHeaderValue(download.headers, 'content-type');
      await ctx.addAttachment({
        type: 'content',
        content: new Response(new Uint8Array(download.data), {
          headers: contentType ? { 'Content-Type': contentType } : {}
        }),
        filename: result.file_name ?? undefined
      });
    }

    return {
      output: {
        fileUrl: result.file_url ?? undefined,
        fileName: result.file_name ?? undefined
      },
      message: result.file_url
        ? `Document generated successfully: **${result.file_name ?? 'document'}**. Prepared for download.`
        : `Document generation triggered. The document will be sent to configured deliveries.`
    };
  })
  .build();
