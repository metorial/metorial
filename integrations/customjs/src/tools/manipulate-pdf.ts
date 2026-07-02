import { SlateTool } from 'slates';
import { z } from 'zod';
import { ExecutionClient } from '../lib/client';
import { spec } from '../spec';

export let manipulatePdf = SlateTool.create(spec, {
  name: 'Manipulate PDF',
  key: 'manipulate_pdf',
  description: `Performs various operations on PDF files: merge multiple PDFs into one, extract specific pages, compress to reduce file size, convert to text, convert to PNG image, read form field names, or fill form fields. Provide PDF files as public URLs.`,
  instructions: [
    'For **merge**: provide an array of PDF URLs in `pdfUrls`.',
    'For **extract_pages**: provide a single `pdfUrl` and a `pageRange` like "1-3" or "2".',
    'For **compress**: provide a single `pdfUrl`.',
    'For **to_text**: provide a single `pdfUrl` to extract all text.',
    'For **to_png**: provide a single `pdfUrl` to convert to PNG.',
    'For **read_form_fields**: provide a single `pdfUrl` of a fillable PDF.',
    'For **fill_form**: provide a `pdfUrl` and `formFields` mapping field names to values.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      operation: z
        .enum([
          'merge',
          'extract_pages',
          'compress',
          'to_text',
          'to_png',
          'read_form_fields',
          'fill_form'
        ])
        .describe('The PDF operation to perform.'),
      pdfUrl: z
        .string()
        .optional()
        .describe('URL of the PDF file to process. Required for all operations except merge.'),
      pdfUrls: z
        .array(z.string())
        .optional()
        .describe('Array of PDF URLs to merge. Required for the merge operation.'),
      pageRange: z
        .string()
        .optional()
        .describe('Page range to extract, e.g., "1-3" or "5". Required for extract_pages.'),
      formFields: z
        .record(z.string(), z.string())
        .optional()
        .describe('Map of form field names to values. Required for fill_form.')
    })
  )
  .output(
    z.object({
      resultBase64: z
        .string()
        .optional()
        .describe(
          'Base64-encoded binary result (PDF or PNG). Returned for merge, extract_pages, compress, to_png, and fill_form.'
        ),
      text: z.string().optional().describe('Extracted text content. Returned for to_text.'),
      formFieldNames: z
        .any()
        .optional()
        .describe('Form field names and types. Returned for read_form_fields.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ExecutionClient({ token: ctx.auth.token });
    let { operation, pdfUrl, pdfUrls, pageRange, formFields } = ctx.input;

    switch (operation) {
      case 'merge': {
        if (!pdfUrls || pdfUrls.length === 0) {
          throw new Error('pdfUrls is required for the merge operation.');
        }
        let resultBase64 = await client.mergePdfs({ urls: pdfUrls });
        return {
          output: { resultBase64 },
          message: `Successfully merged ${pdfUrls.length} PDFs into one document.`
        };
      }

      case 'extract_pages': {
        if (!pdfUrl) throw new Error('pdfUrl is required for extract_pages.');
        if (!pageRange) throw new Error('pageRange is required for extract_pages.');
        let resultBase64 = await client.extractPdfPages({ pdfUrl, pageRange });
        return {
          output: { resultBase64 },
          message: `Extracted pages ${pageRange} from the PDF.`
        };
      }

      case 'compress': {
        if (!pdfUrl) throw new Error('pdfUrl is required for compress.');
        let resultBase64 = await client.compressPdf({ pdfUrl });
        return {
          output: { resultBase64 },
          message: `PDF compressed successfully.`
        };
      }

      case 'to_text': {
        if (!pdfUrl) throw new Error('pdfUrl is required for to_text.');
        let text = await client.pdfToText({ pdfUrl });
        return {
          output: { text },
          message: `Text extracted from PDF successfully.`
        };
      }

      case 'to_png': {
        if (!pdfUrl) throw new Error('pdfUrl is required for to_png.');
        let resultBase64 = await client.pdfToPng({ pdfUrl });
        return {
          output: { resultBase64 },
          message: `PDF converted to PNG image successfully.`
        };
      }

      case 'read_form_fields': {
        if (!pdfUrl) throw new Error('pdfUrl is required for read_form_fields.');
        let formFieldNames = await client.readPdfFormFields({ pdfUrl });
        return {
          output: { formFieldNames },
          message: `Form fields read from PDF successfully.`
        };
      }

      case 'fill_form': {
        if (!pdfUrl) throw new Error('pdfUrl is required for fill_form.');
        if (!formFields) throw new Error('formFields is required for fill_form.');
        let fieldsRecord: Record<string, string> = {};
        for (let [k, v] of Object.entries(formFields)) {
          fieldsRecord[k] = String(v);
        }
        let resultBase64 = await client.fillPdfForm({ pdfUrl, fields: fieldsRecord });
        return {
          output: { resultBase64 },
          message: `PDF form fields filled successfully.`
        };
      }

      default:
        throw new Error(`Unknown operation: ${operation}`);
    }
  })
  .build();
