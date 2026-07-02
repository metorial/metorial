import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let renderDocument = SlateTool.create(spec, {
  name: 'Render Document',
  key: 'render_document',
  description: `Generate a document by merging a Carbone template with JSON data. Returns a render ID that can be used to download the generated document. Supports output format conversion (PDF, DOCX, XLSX, CSV, etc.), locale/timezone settings, dynamic filenames, currency conversion, and batch generation.`,
  instructions: [
    'Use convertTo to specify the desired output format (e.g. "pdf", "docx", "xlsx", "csv").',
    'Use converter to choose the rendering engine: "L" for LibreOffice (default), "O" for OnlyOffice (best for DOCX/XLSX/PPTX), "C" for Chromium (best for HTML-to-PDF).',
    'For batch generation, set batchSplitBy to the array path in your data (e.g. "d.items") and use webhookUrl for async processing.',
    'The returned renderId is valid for 1 hour and can only be downloaded once.'
  ],
  constraints: [
    'Batch generation requires a webhookUrl for asynchronous processing.',
    'Cloud batch payloads are limited to 100 objects.',
    'Generated documents are available for download for 1 hour and can be downloaded once.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      templateIdOrVersionId: z
        .string()
        .describe('Template ID or Version ID of the template to render.'),
      data: z
        .record(z.string(), z.unknown())
        .describe(
          'JSON data to merge into the template. Use Carbone tag syntax (e.g. {d.fieldName}) in the template.'
        ),
      convertTo: z
        .union([z.string(), z.record(z.string(), z.unknown())])
        .optional()
        .describe(
          'Output format: a string like "pdf", "docx", "xlsx", "csv", "xml", "txt", or an object with formatName and formatOptions for advanced settings (e.g. PDF encryption, watermarks).'
        ),
      converter: z
        .enum(['L', 'O', 'C'])
        .optional()
        .describe(
          'Converter engine: "L" for LibreOffice (default), "O" for OnlyOffice, "C" for Chromium.'
        ),
      timezone: z
        .string()
        .optional()
        .describe(
          'Timezone for the generated document (e.g. "Europe/Paris", "America/New_York").'
        ),
      lang: z
        .string()
        .optional()
        .describe('Locale for the generated document (e.g. "en-us", "fr-fr").'),
      complement: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Complement data object accessible in the template via {c.fieldName}.'),
      variableStr: z
        .string()
        .optional()
        .describe('Variable string for defining reusable expressions in the template.'),
      reportName: z
        .string()
        .optional()
        .describe(
          'Dynamic filename template for the generated document (e.g. "{d.clientName}_invoice.pdf").'
        ),
      enumeration: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Enumeration object for mapping values in the template.'),
      translations: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Translations dictionary for multilingual document generation.'),
      currencySource: z.string().optional().describe('Source currency code (e.g. "EUR").'),
      currencyTarget: z.string().optional().describe('Target currency code (e.g. "USD").'),
      currencyRates: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Custom currency exchange rates object.'),
      hardRefresh: z.boolean().optional().describe('Force a fresh render ignoring any cache.'),
      batchSplitBy: z
        .string()
        .optional()
        .describe(
          'Path to the array in data to split into individual documents (e.g. "d.items"). Requires webhookUrl.'
        ),
      batchOutput: z
        .enum(['zip', 'pdf'])
        .optional()
        .describe(
          'Batch output format: "zip" for compressed archive, "pdf" for concatenated PDF.'
        ),
      inlineTemplate: z
        .string()
        .optional()
        .describe('Base64-encoded template content to use instead of a stored template.'),
      webhookUrl: z
        .string()
        .optional()
        .describe('Webhook URL for asynchronous rendering notification.'),
      webhookHeaders: z
        .record(z.string(), z.string())
        .optional()
        .describe(
          'Custom headers to send with the webhook callback (e.g. for authentication).'
        )
    })
  )
  .output(
    z.object({
      renderId: z
        .string()
        .describe('Unique render ID to download the generated document. Valid for 1 hour.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl,
      carboneVersion: ctx.config.carboneVersion
    });

    let result = await client.renderDocument({
      templateIdOrVersionId: ctx.input.templateIdOrVersionId,
      data: ctx.input.data,
      convertTo: ctx.input.convertTo,
      converter: ctx.input.converter,
      timezone: ctx.input.timezone,
      lang: ctx.input.lang,
      complement: ctx.input.complement,
      variableStr: ctx.input.variableStr,
      reportName: ctx.input.reportName,
      enum: ctx.input.enumeration,
      translations: ctx.input.translations,
      currencySource: ctx.input.currencySource,
      currencyTarget: ctx.input.currencyTarget,
      currencyRates: ctx.input.currencyRates,
      hardRefresh: ctx.input.hardRefresh,
      batchSplitBy: ctx.input.batchSplitBy,
      batchOutput: ctx.input.batchOutput,
      template: ctx.input.inlineTemplate,
      webhookUrl: ctx.input.webhookUrl,
      webhookHeaders: ctx.input.webhookHeaders
    });

    let asyncNote = ctx.input.webhookUrl
      ? ' The webhook will be notified when rendering is complete.'
      : '';
    return {
      output: result,
      message: `Document rendered successfully. Render ID: **${result.renderId}**.${asyncNote} Use this ID to download the generated document.`
    };
  })
  .build();
