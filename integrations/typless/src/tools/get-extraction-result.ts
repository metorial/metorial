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
    .describe('Predicted value blocks with coordinates and confidence')
});

let extractionResultSchema = z
  .object({
    objectId: z.string().describe('Unique identifier for this extraction result'),
    extractedFields: z.array(extractedFieldSchema).describe('List of extracted fields'),
    lineItems: z.array(z.any()).describe('Extracted line items if applicable'),
    fileName: z.string().describe('Name of the processed file')
  })
  .nullable()
  .describe('Extraction result, null if processing is not yet complete');

export let getExtractionResult = SlateTool.create(spec, {
  name: 'Get Extraction Result',
  key: 'get_extraction_result',
  description: `Poll for the result of an asynchronous document extraction. Returns the current processing status and extracted data when available. The status can be one of: PROCESSING, SUCCESS, FAILURE, or EXPIRED (48 hours after completion). Use this after submitting a document for async extraction.`,
  instructions: [
    'Results expire 48 hours after processing completes',
    'If status is not SUCCESS, poll again after a short delay'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      extractionId: z
        .string()
        .describe('Extraction ID returned from the async extraction request')
    })
  )
  .output(
    z.object({
      status: z.string().describe('Current status: PROCESSING, SUCCESS, FAILURE, or EXPIRED'),
      error: z.any().nullable().describe('Error details if the extraction failed'),
      result: extractionResultSchema
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let response = await client.getExtractionResult({
      extractionId: ctx.input.extractionId
    });

    let message = `Extraction **${ctx.input.extractionId}** status: **${response.status}**`;
    if (response.status === 'SUCCESS' && response.result) {
      let fieldCount = response.result.extractedFields.length;
      message += ` — ${fieldCount} fields extracted from **${response.result.fileName}**`;
    } else if (response.status === 'FAILURE') {
      message += ` — extraction failed`;
    } else if (response.status === 'PROCESSING') {
      message += ` — still processing, poll again shortly`;
    }

    return {
      output: response,
      message
    };
  })
  .build();
