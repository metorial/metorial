import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let extractionFieldSchema = z.object({
  key: z.string().describe('Unique identifier for the field'),
  description: z.string().describe('Context about what data this field should capture'),
  example: z.string().optional().describe('Sample value demonstrating expected output'),
  type: z
    .enum(['string', 'object', 'array'])
    .optional()
    .describe('Field type: string, object, or array')
});

let extractionOptionsSchema = z
  .object({
    hasTable: z.boolean().optional().describe('Enable table analysis and extraction'),
    hasVisuals: z
      .boolean()
      .optional()
      .describe('Enable detection of charts, graphs, and diagrams'),
    handwrittenTextRecognition: z
      .boolean()
      .optional()
      .describe('Enable OCR for handwritten text'),
    checkboxRecognition: z
      .boolean()
      .optional()
      .describe('Detect checkbox states (checked/unchecked)'),
    longDocument: z
      .boolean()
      .optional()
      .describe('Optimized processing for large or complex documents'),
    splitPdfPages: z
      .boolean()
      .optional()
      .describe('Treat each PDF page as a separate extraction unit'),
    specificPageProcessing: z
      .boolean()
      .optional()
      .describe('Process only a specified range of pages'),
    from: z
      .number()
      .optional()
      .describe('Start page number (when specificPageProcessing is enabled)'),
    to: z
      .number()
      .optional()
      .describe('End page number (when specificPageProcessing is enabled)')
  })
  .optional()
  .describe('Processing options for the extraction');

export let createExtractionTool = SlateTool.create(spec, {
  name: 'Create Extraction',
  key: 'create_extraction',
  description: `Create a new extraction template that defines which fields to extract from documents. Supports custom fields with nested structures, language configuration, and processing options like table extraction, OCR for handwritten text, and checkbox detection.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Descriptive name for the extraction template'),
      description: z.string().optional().describe('Description of the extraction purpose'),
      language: z
        .string()
        .describe('Document language for accurate extraction (e.g., "English", "Spanish")'),
      fields: z.array(extractionFieldSchema).describe('Fields to extract from documents'),
      options: extractionOptionsSchema
    })
  )
  .output(
    z.object({
      extractionId: z.string().describe('Unique identifier for the created extraction'),
      status: z.string().describe('Creation status'),
      createdAt: z.number().describe('Timestamp of creation')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let result = await client.createExtraction({
      name: ctx.input.name,
      language: ctx.input.language,
      description: ctx.input.description,
      fields: ctx.input.fields,
      options: ctx.input.options
    });

    return {
      output: {
        extractionId: result.extractionId,
        status: result.status,
        createdAt: result.createdAt
      },
      message: `Created extraction template **${ctx.input.name}** with ID \`${result.extractionId}\`.`
    };
  })
  .build();
