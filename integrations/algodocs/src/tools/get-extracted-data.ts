import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, type ExtractedRecord } from '../lib/client';
import { spec } from '../spec';

export let getExtractedData = SlateTool.create(spec, {
  name: 'Get Extracted Data',
  key: 'get_extracted_data',
  description: `Retrieves structured data extracted from processed documents. Query by a single **documentId** to get results for one document, or by **extractorId** to retrieve results across multiple documents. Optionally filter by folder and date range when querying by extractor.`,
  instructions: [
    'Provide either **documentId** or **extractorId** — not both.',
    'When using extractorId, you may optionally filter by folderId, limit, or date.',
    'The **date** parameter filters for documents uploaded in the last N days (e.g., "10" for the last 10 days).'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      documentId: z
        .string()
        .optional()
        .describe('ID of a specific document to get extracted data for'),
      extractorId: z
        .string()
        .optional()
        .describe(
          'ID of the extractor to get extracted data for (returns data across multiple documents)'
        ),
      folderId: z
        .string()
        .optional()
        .describe('Filter results by folder ID (only when using extractorId)'),
      limit: z
        .number()
        .optional()
        .describe(
          'Maximum number of records to return (default: 10000, only when using extractorId)'
        ),
      date: z
        .string()
        .optional()
        .describe(
          'Number of days to look back for uploaded documents (e.g., "10" for last 10 days, only when using extractorId)'
        )
    })
  )
  .output(
    z.object({
      records: z
        .array(
          z.object({
            recordId: z.string().describe('Unique identifier of the extracted record'),
            documentId: z.string().describe('ID of the source document'),
            extractorId: z.string().describe('ID of the extractor used'),
            folderId: z.string().describe('ID of the folder containing the document'),
            uploadedAt: z.string().describe('Timestamp when the document was uploaded'),
            fileName: z.string().describe('Name of the source file'),
            pageNumber: z.number().describe('Page number the data was extracted from'),
            extractedFields: z
              .record(z.string(), z.unknown())
              .describe('User-defined extracted fields and their values')
          })
        )
        .describe('List of extracted data records')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      email: ctx.auth.email
    });

    let { documentId, extractorId, folderId, limit, date } = ctx.input;

    let rawRecords: ExtractedRecord[];

    if (documentId) {
      ctx.info(`Fetching extracted data for document ${documentId}`);
      rawRecords = await client.getExtractedDataByDocument(documentId);
    } else if (extractorId) {
      ctx.info(`Fetching extracted data for extractor ${extractorId}`);
      rawRecords = await client.getExtractedDataByExtractor(extractorId, {
        folderId,
        limit,
        date
      });
    } else {
      throw new Error('Provide either "documentId" or "extractorId".');
    }

    let systemFields = [
      'id',
      'documentId',
      'extractorId',
      'folderId',
      'uploadedAt',
      'fileName',
      'pageNumber'
    ];

    let records = rawRecords.map(record => {
      let extractedFields: Record<string, unknown> = {};
      for (let key of Object.keys(record)) {
        if (!systemFields.includes(key)) {
          extractedFields[key] = record[key];
        }
      }

      return {
        recordId: String(record.id),
        documentId: String(record.documentId),
        extractorId: String(record.extractorId),
        folderId: String(record.folderId),
        uploadedAt: String(record.uploadedAt),
        fileName: String(record.fileName),
        pageNumber: Number(record.pageNumber),
        extractedFields
      };
    });

    return {
      output: { records },
      message: `Retrieved **${records.length}** extracted data record(s).`
    };
  })
  .build();
