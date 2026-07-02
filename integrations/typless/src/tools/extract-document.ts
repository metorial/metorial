import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let extractedFieldSchema = z.object({
  name: z.string().describe('Name of the extracted field'),
  dataType: z.string().describe('Data type of the field'),
  values: z
    .array(
      z.object({
        confidenceScore: z.number().describe('Confidence score of the prediction (0-1)'),
        value: z.string().describe('Recognized value'),
        pageNumber: z.number().describe('Page number where the value was found'),
        x: z.number().describe('X coordinate of the value block'),
        y: z.number().describe('Y coordinate of the value block'),
        width: z.number().describe('Width of the value block'),
        height: z.number().describe('Height of the value block')
      })
    )
    .describe('Up to 5 best-predicted value blocks with coordinates and confidence')
});

export let extractDocument = SlateTool.create(spec, {
  name: 'Extract Document',
  key: 'extract_document',
  description: `Extract structured data from a document file using a configured document type. Submits a document (PDF, JPG, BMP, PNG, TIFF) and returns extracted fields with confidence scores, coordinates, and recognized values. Each field may have up to 5 predicted values ranked by confidence. Dates are normalized to YYYY-MM-DD and numbers to decimal format.`,
  constraints: [
    'Maximum file size is 30 MB',
    'Documents must be portrait oriented',
    'Supported formats: PDF, JPG, BMP, PNG, TIFF',
    'The document type must be configured and trained before extraction'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      documentTypeName: z
        .string()
        .describe(
          'Slug/name of the document type to use for extraction (e.g. "simple-invoice", "vat-invoice")'
        ),
      file: z.string().describe('Base64-encoded file content'),
      fileName: z
        .string()
        .describe('Name of the file including extension (e.g. "invoice.pdf")')
    })
  )
  .output(
    z.object({
      objectId: z
        .string()
        .describe('Unique identifier for this extraction, used for providing feedback'),
      extractedFields: z
        .array(extractedFieldSchema)
        .describe('List of extracted fields with predicted values'),
      lineItems: z.array(z.any()).describe('Extracted line items if applicable'),
      fileName: z.string().describe('Name of the processed file')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.extractData({
      documentTypeName: ctx.input.documentTypeName,
      file: ctx.input.file,
      fileName: ctx.input.fileName
    });

    let fieldSummary = result.extractedFields
      .map(f => {
        let topValue = f.values[0];
        return topValue
          ? `**${f.name}**: ${topValue.value} (${(topValue.confidenceScore * 100).toFixed(1)}%)`
          : `**${f.name}**: no value extracted`;
      })
      .join('\n');

    return {
      output: result,
      message: `Extracted ${result.extractedFields.length} fields from **${result.fileName}**:\n${fieldSummary}`
    };
  })
  .build();
