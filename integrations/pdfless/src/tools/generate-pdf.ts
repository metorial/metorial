import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { PdflessClient } from '../lib/client';
import { spec } from '../spec';

export let generatePdf = SlateTool.create(spec, {
  name: 'Generate PDF',
  key: 'generate_pdf',
  description: `Generate a downloadable PDF document from a pre-designed HTML/CSS template by providing dynamic data as a JSON payload. Optionally encrypt the PDF with passwords and set granular permission controls.
The provider download URL **expires after 10 minutes**; the generated file is also prepared for download immediately.
Templates support Handlebars-like expressions for variable interpolation, conditionals, loops, and barcode generation.`,
  instructions: [
    'The templateId must reference a template already created in the Pdfless dashboard. Call list_templates to discover its ID.',
    'The templatePayload should match the variables defined in the template using Handlebars-like expressions (e.g., {{ variableName }}).',
    'Encryption features depend on your subscription. Set encryption.userPassword when using protection or permission controls.'
  ],
  constraints: [
    'The download URL expires after 10 minutes.',
    'Document generation consumes account quota. Encryption and permission controls depend on your subscription.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      templateId: z
        .string()
        .describe(
          'Template ID to use for PDF generation. Call list_templates to discover IDs.'
        ),
      templatePayload: z
        .record(z.string(), z.unknown())
        .describe('JSON object containing dynamic data to populate template variables'),
      referenceId: z
        .string()
        .optional()
        .describe('Caller-defined reference identifier for tracking purposes'),
      encryption: z
        .object({
          userPassword: z
            .string()
            .optional()
            .describe('Password required to open the PDF document'),
          ownerPassword: z
            .string()
            .optional()
            .describe('Owner password to restrict permissions on the PDF'),
          allowPrinting: z
            .boolean()
            .optional()
            .describe('Allow printing the document (defaults to true)'),
          allowModifying: z
            .boolean()
            .optional()
            .describe('Allow modifying the document (defaults to true)'),
          allowContentCopying: z
            .boolean()
            .optional()
            .describe('Allow copying content from the document (defaults to true)'),
          allowModifyAnnotations: z
            .boolean()
            .optional()
            .describe('Allow modifying annotations (defaults to true)'),
          allowFormFilling: z
            .boolean()
            .optional()
            .describe('Allow filling in forms (defaults to true)'),
          allowScreenReaders: z
            .boolean()
            .optional()
            .describe('Allow screen reader access (defaults to true)'),
          allowDocumentAssembly: z
            .boolean()
            .optional()
            .describe('Allow document assembly (defaults to true)')
        })
        .optional()
        .describe('Encryption and permission settings for the generated PDF')
    })
  )
  .output(
    z.object({
      templateId: z.string().describe('Template identifier used for generation'),
      referenceId: z.string().optional().describe('Caller-defined reference identifier'),
      downloadUrl: z
        .string()
        .describe('Temporary URL to download the generated PDF (expires in 10 minutes)'),
      expires: z.string().describe('Expiration timestamp of the download URL'),
      createdAt: z.string().describe('Timestamp when the PDF was created')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PdflessClient({
      token: ctx.auth.token
    });

    let result = await client.generatePdf({
      templateId: ctx.input.templateId,
      payload: ctx.input.templatePayload,
      referenceId: ctx.input.referenceId,
      encryption: ctx.input.encryption
    });

    try {
      let content = await client.downloadPdf(result.downloadUrl);
      await ctx.addAttachment({
        type: 'content',
        content: new Response(content, {
          headers: { 'content-type': 'application/pdf' }
        }),
        mimeType: 'application/pdf',
        filename: 'document.pdf'
      });
    } catch (error) {
      throw createApiServiceError(
        `Pdfless generated the PDF, but it could not be prepared for download. Download it directly from ${result.downloadUrl} before ${result.expires}. Generating it again consumes additional quota.`,
        { reason: 'pdfless_delivery_error', parent: error }
      );
    }

    return {
      output: result,
      message: `PDF generated successfully from template \`${result.templateId}\` and prepared for download. The provider URL expires at ${result.expires}.`
    };
  })
  .build();
