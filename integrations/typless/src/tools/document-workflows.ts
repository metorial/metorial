import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, extractionDataSchema, trainingFieldSchema } from '../lib/client';
import { spec } from '../spec';

let documentTypeName = z
  .string()
  .min(1)
  .describe(
    'Configured document type name. Use list_document_types to discover legacy document types, or copy the name from the Typless dashboard.'
  );
let file = z.string().describe('Original document file encoded as base64');
let fileName = z
  .string()
  .describe('Original file name including extension, such as invoice.pdf');

export let extractDocumentAsync = SlateTool.create(spec, {
  name: 'Extract Document Asynchronously',
  key: 'extract_document_async',
  description:
    'Submit a document for asynchronous extraction with the current JSON API. Returns an extraction ID for get_extraction_data. Supports a customer identifier for usage reporting and optional text block parsing.',
  instructions: [
    'Call get_extraction_data with the returned extraction_id. Poll again only while status is IN_PROGRESS; ERROR and EXPIRED are terminal states.'
  ],
  tags: { readOnly: false, destructive: false }
})
  .input(
    z.object({
      documentTypeName,
      file,
      fileName,
      customer: z
        .string()
        .min(1)
        .optional()
        .describe('Your customer identifier for usage reporting and poll queue filtering'),
      parseTextBlocks: z
        .boolean()
        .optional()
        .describe('Parse text blocks for retrieval; the provider defaults this to false')
    })
  )
  .output(
    z.object({ extraction_id: z.string().describe('Extraction ID for get_extraction_data') })
  )
  .handleInvocation(async ctx => {
    let output = await new Client(ctx.auth).submitExtraction(ctx.input);
    return {
      output,
      message: `Document submitted for extraction. Extraction ID: **${output.extraction_id}**.`
    };
  })
  .build();

export let getExtractionData = SlateTool.create(spec, {
  name: 'Get Extraction Data',
  key: 'get_extraction_data',
  description:
    'Retrieve processing status and unmodified extraction data from the current JSON API. Includes metadata fields, line items, VAT rates, and any text blocks returned by the provider. Unknown field values remain null.',
  instructions: [
    'Use extraction_id returned by extract_document_async or list_pending_extractions.',
    'Poll again only for IN_PROGRESS. SUCCESS, ERROR, and EXPIRED are terminal states. Results expire 48 hours after processing finishes.'
  ],
  tags: { readOnly: true }
})
  .input(
    z.object({
      extractionId: z
        .string()
        .describe('Extraction ID from extract_document_async or list_pending_extractions'),
      textBlocks: z
        .boolean()
        .optional()
        .describe('Include text blocks; the provider defaults this to false')
    })
  )
  .output(extractionDataSchema)
  .handleInvocation(async ctx => {
    let output = await new Client(ctx.auth).getExtractionData(ctx.input);
    let adjustedUrl = output.result?.adjusted_s3_url;
    if (typeof adjustedUrl === 'string' && adjustedUrl.length > 0) {
      await ctx.addAttachment({ type: 'url', url: adjustedUrl });
    }
    return {
      output,
      message: `Extraction **${ctx.input.extractionId}** status: **${output.status}**.`
    };
  })
  .build();

export let listPendingExtractions = SlateTool.create(spec, {
  name: 'List Extractions Awaiting Retrieval',
  key: 'list_pending_extractions',
  description:
    'List asynchronous extraction IDs that have finished processing and are ready to retrieve. Includes successful and failed jobs; excludes jobs in progress and expired results.',
  instructions: [
    'Omit customer unless extraction requests used that exact customer identifier. A mismatched filter returns no IDs.'
  ],
  tags: { readOnly: true }
})
  .input(
    z.object({
      customer: z
        .string()
        .min(1)
        .optional()
        .describe(
          'Exact customer identifier used when submitting documents; omit for all available results'
        )
    })
  )
  .output(
    z.object({
      extraction_ids: z
        .array(z.string())
        .describe('Extraction IDs ready for get_extraction_data')
    })
  )
  .handleInvocation(async ctx => {
    let output = await new Client(ctx.auth).listPendingExtractions(ctx.input);
    return {
      output,
      message: `Found **${output.extraction_ids.length}** extractions ready for retrieval.`
    };
  })
  .build();

export let addTrainingDocument = SlateTool.create(spec, {
  name: 'Add Training Document',
  key: 'add_training_document',
  description:
    'Add an original document and verified metadata, line item, and VAT rate values to a document type training dataset using the current JSON API. Returns the dataset element identifier reported by Typless.',
  instructions: [
    'Supply the correct value for every metadata field and line item field present in the document, including supplier_name.',
    'Each field value is an array of value blocks. Coordinates and page_number are optional whole numbers; omit them when only the verified text is known.',
    'Use YYYY-MM-DD date values and decimal strings with a period separator for numbers.'
  ],
  tags: { readOnly: false, destructive: false }
})
  .input(
    z.object({
      documentTypeName,
      file,
      fileName,
      learningFields: z
        .array(trainingFieldSchema)
        .min(1)
        .describe('Verified metadata fields; each value is an array of value blocks'),
      lineItems: z
        .array(z.array(trainingFieldSchema))
        .optional()
        .describe('Verified line items, each containing its configured fields'),
      vatRates: z
        .array(z.array(trainingFieldSchema))
        .optional()
        .describe('Verified VAT rates, each containing its configured fields')
    })
  )
  .output(
    z.object({
      message: z.string().describe('Provider confirmation message'),
      details: z.string().describe('Dataset element ID reported by the provider')
    })
  )
  .handleInvocation(async ctx => {
    let output = await new Client(ctx.auth).addTrainingDocument(ctx.input);
    return { output, message: output.message };
  })
  .build();
