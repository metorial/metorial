import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let generatePdf = SlateTool.create(spec, {
  name: 'Generate PDF',
  key: 'generate_pdf',
  description: `Generate a PDF document by combining a pre-defined template with JSON data. Returns a URL to the generated PDF hosted on a CDN.
Supports password protection, configurable PDF standards, image resampling, and custom expiration times.
You can also load data from an external URL instead of passing it inline.`,
  instructions: [
    'Provide either "templateData" or "loadDataFrom" to populate the template, but not both.',
    'The "expiration" value is in minutes, from 1 to 10080 (7 days).'
  ],
  constraints: [
    'Rate limited to 100 requests per 10 seconds per IP.',
    '100 concurrent synchronous PDF requests per account.'
  ],
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      templateId: z.string().describe('ID of the CraftMyPDF template to use for generation.'),
      templateData: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('JSON data to populate the template with.'),
      loadDataFrom: z
        .string()
        .optional()
        .describe(
          'External URL to load template data from. Overrides templateData if both provided.'
        ),
      version: z
        .number()
        .optional()
        .describe('Specific template version to use. Defaults to the latest version.'),
      expiration: z
        .number()
        .optional()
        .describe(
          'Expiration time in minutes for the generated PDF URL (1-10080). Default is 5.'
        ),
      outputFile: z.string().optional().describe('Output filename. Default is "output.pdf".'),
      imageResampleRes: z
        .number()
        .optional()
        .describe('Image resampling resolution in DPI (72, 150, 300, 600, 1200).'),
      passwordProtected: z
        .boolean()
        .optional()
        .describe('Enable password protection for the generated PDF.'),
      password: z
        .string()
        .optional()
        .describe('Password for the protected PDF. Required if passwordProtected is true.'),
      pdfVersion: z
        .string()
        .optional()
        .describe('PDF standard version: "1.4", "1.7", or "Auto".')
    })
  )
  .output(
    z.object({
      fileUrl: z.string().describe('URL to download the generated PDF.'),
      transactionRef: z.string().describe('Unique transaction reference for this generation.'),
      status: z.string().describe('Status of the PDF generation request.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    ctx.progress('Generating PDF document...');

    let result = await client.createPdf({
      templateId: ctx.input.templateId,
      data: ctx.input.templateData,
      loadDataFrom: ctx.input.loadDataFrom,
      version: ctx.input.version,
      exportType: 'json',
      expiration: ctx.input.expiration,
      outputFile: ctx.input.outputFile,
      imageResampleRes: ctx.input.imageResampleRes,
      passwordProtected: ctx.input.passwordProtected,
      password: ctx.input.password,
      pdfVersion: ctx.input.pdfVersion
    });

    return {
      output: {
        fileUrl: result.file,
        transactionRef: result.transaction_ref,
        status: result.status
      },
      message: `PDF generated successfully. [Download PDF](${result.file}) (Transaction: ${result.transaction_ref})`
    };
  })
  .build();
