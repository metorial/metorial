import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let generatePdfAsync = SlateTool.create(spec, {
  name: 'Generate PDF (Async)',
  key: 'generate_pdf_async',
  description: `Initiate asynchronous PDF generation. The request returns immediately with a transaction reference. Once the PDF is ready, the result is delivered to the specified webhook URL.
Use this for large or batch PDF generation tasks where you don't need the result immediately.`,
  instructions: [
    'The webhook URL will receive the completed PDF URL, transaction reference, and status as query parameters.',
    'You can append custom query parameters to the webhook URL for downstream processing.'
  ],
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      templateId: z.string().describe('ID of the CraftMyPDF template to use for generation.'),
      webhookUrl: z
        .string()
        .describe('URL to receive the webhook callback when the PDF is ready.'),
      templateData: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('JSON data to populate the template with.'),
      loadDataFrom: z.string().optional().describe('External URL to load template data from.'),
      version: z.number().optional().describe('Specific template version to use.'),
      expiration: z
        .number()
        .optional()
        .describe('Expiration time in minutes for the generated PDF URL (1-10080).'),
      outputFile: z.string().optional().describe('Output filename.'),
      passwordProtected: z.boolean().optional().describe('Enable password protection.'),
      password: z.string().optional().describe('Password for the protected PDF.')
    })
  )
  .output(
    z.object({
      transactionRef: z
        .string()
        .describe('Transaction reference to track the async generation.'),
      status: z.string().describe('Status of the async generation request.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    ctx.progress('Initiating async PDF generation...');

    let result = await client.createAsyncPdf({
      templateId: ctx.input.templateId,
      webhookUrl: ctx.input.webhookUrl,
      data: ctx.input.templateData,
      loadDataFrom: ctx.input.loadDataFrom,
      version: ctx.input.version,
      expiration: ctx.input.expiration,
      outputFile: ctx.input.outputFile,
      passwordProtected: ctx.input.passwordProtected,
      password: ctx.input.password
    });

    return {
      output: {
        transactionRef: result.transaction_ref,
        status: result.status
      },
      message: `Async PDF generation initiated. Transaction: **${result.transaction_ref}**. The result will be delivered to the webhook URL.`
    };
  })
  .build();
